package com.processos.process;

import com.processos.hardware.CpuCore;
import com.processos.hardware.HardwarePool;
import com.processos.hardware.IoManager;
import com.processos.hardware.InstructionResult;
import com.processos.model.ProcessControlBlock;
import com.processos.model.ProcessState;
import com.processos.model.SimulatedApp;
import com.processos.service.SystemEventService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * 进程管理器 — 桌面沙盒模式的 MLFQ 多级反馈队列调度器
 * <p>
 * 这是整个桌面模拟器的核心调度引擎，管理所有用户启动的应用进程。
 * 采用三级反馈队列（Q0/Q1/Q2），每级时间片不同，进程执行不完就降级。
 * 同时提供老化机制、高优先级抢占、内存不足阻塞排队等功能。
 * <p>
 * 注意：这是"沙盒模式"的调度器，与"算法实验室"（ProcessService）是两套并行系统。
 * 沙盒模式用于模拟真实桌面环境，算法实验室用于对比7种调度算法。
 */
@Component
public class ProcessManager {

    // ========================================================================
    //  自动注入的硬件/服务 — Spring Boot 自动装配
    // ========================================================================

    @Autowired private HardwarePool hardwarePool;       // 硬件资源池（CPU核心、内存分配管理）
    @Autowired private SystemEventService eventService; // 系统事件日志服务（写入4级日志供前端查看）
    @Autowired private IoManager ioManager;             // I/O设备管理器（打印机、USB、音频等独占设备）

    // ========================================================================
    //  CPU核心 — 模拟单核CPU，同一时刻只能执行一个进程
    // ========================================================================

    private final CpuCore cpuCore = new CpuCore();

    // ========================================================================
    //  IPC + 设备回调 — 注册给 CpuCore 的指令回调接口
    //  设计意图：CpuCore 只负责模拟指令执行，不直接操作进程状态
    //  通过回调让 ProcessManager 来处理：发消息、申请打印机、释放打印机
    //  这是观察者模式（CpuCore 不知道具体实现，只管调接口）
    // ========================================================================
    {
        cpuCore.setIpcCallback(new CpuCore.IpcCallback() {
            /**
             * SEND 指令回调 — 向指定类型的应用发送消息
             * @param fromPid 发送方PID（用于日志）
             * @param targetAppType 目标应用类型（如 "IPC_RECEIVER"）
             * @param message 消息内容字符串（当前实现为 "MSG_FROM_" + 发送方PID）
             * @return true=成功投递且唤醒了等待者，false=目标不存在
             *
             * 流程：
             *   1. 遍历 processTable，按 appType 找目标进程
             *   2. 写入目标的 messageBuffer（List<String>）
             *   3. 如果目标在 BLOCKED 状态等消息 → 唤醒进 Q1
             */
            @Override
            public boolean sendMessage(int fromPid, String targetAppType, String message) {
                // 在全局进程表中查找 appType 匹配且未终止的进程
                ProcessControlBlock target = processTable.stream()
                    .filter(p -> targetAppType.equalsIgnoreCase(p.getAppType())
                        && p.getState() != ProcessState.TERMINATED)
                    .findFirst().orElse(null);
                if (target == null) return false; // 目标不存在，投递失败
                // 初始化消息缓冲区（首次使用时）
                if (target.getMessageBuffer() == null) target.setMessageBuffer(new ArrayList<>());
                target.getMessageBuffer().add(message); // ★ 写入目标进程的消息队列（核心数据传递）
                addInterruptLog("IPC", "PID:" + fromPid + " → " + target.getName() + " 发送消息: " + message);
                // ★ 检查目标是否在阻塞等消息 — 如果是，立即唤醒
                if (target.isWaitingForMessage() && target.getState() == ProcessState.BLOCKED) {
                    target.setWaitingForMessage(false);    // 取消等待标记
                    target.setState(ProcessState.READY);   // BLOCKED → READY
                    target.setBlockedReason(null);          // 清除阻塞原因
                    blockedQueue.remove(target);            // 从阻塞队列移出
                    addToQueue(target, 1);                  // 唤醒后进 Q1（中优先级队列）
                    queueEntryTime.put(target.getPid(), clockTick); // 记录入队时间（用于老化计算）
                    addInterruptLog("WAKEUP", target.getName() + " 收到消息被唤醒 → Q1");
                    eventService.info("IPC", target.getName() + " 收到消息被唤醒", target.getPid(), target.getName());
                    return true;
                }
                return false;
            }

            /**
             * P_PRINTER 指令回调 — 申请独占打印机设备
             * 委托给 IoManager 处理（IoManager 维护设备持有者和等待队列）
             * @return true=申请成功（获得了打印机），false=被占用（需要阻塞）
             */
            @Override
            public boolean requestPrinter(int pid, String processName) {
                return ioManager.requestExclusiveDevice("PRINTER", pid, processName);
            }

            /**
             * V_PRINTER 指令回调 — 释放打印机
             * 释放后如果有进程在等打印机，自动唤醒第一个等待者
             */
            @Override
            public void releasePrinter(int pid) {
                Integer wokenPid = ioManager.releaseExclusiveDevice("PRINTER", pid);
                if (wokenPid != null) wakeupBlockedProcess(wokenPid, "打印机已释放");
            }
        });
    }

    // ========================================================================
    //  MLFQ 三级就绪队列 — 多级反馈队列的核心数据结构
    //  使用 CopyOnWriteArrayList 保证并发安全（前端轮询 + 后台tick同时操作）
    //
    //  队列级别说明：
    //    Q0（高优先级）：时间片8 tick — 新进程/优先级1-2/老化升级进入
    //    Q1（中优先级）：时间片10 tick — Q0降级/优先级3-4/老化升级（Q2→Q1）
    //    Q2（低优先级）：时间片16 tick — Q1降级/优先级5进入
    //
    //  调度规则：
    //    1. CPU 总是从最高非空队列的队首取进程
    //    2. 时间片用完未结束 → 降到下一级（越跑越慢）
    //    3. 等待超过30 tick → 老化升级（防止饥饿）
    //    4. Q0新进程到达时抢占 Q1/Q2 运行进程
    // ========================================================================

    private final List<ProcessControlBlock> q0 = new CopyOnWriteArrayList<>(); // ★ 高优先级队列（时间片8tick）
    private final List<ProcessControlBlock> q1 = new CopyOnWriteArrayList<>(); // 中优先级队列（时间片10tick）
    private final List<ProcessControlBlock> q2 = new CopyOnWriteArrayList<>(); // 低优先级队列（时间片16tick）
    private final List<ProcessControlBlock> blockedQueue = new CopyOnWriteArrayList<>(); // 阻塞队列（等IPC/打印机/内存）

    // ————— 调度参数 —————
    private static final int Q0_QUANTUM = 8;   // Q0 时间片（高优先级，短时间片）
    private static final int Q1_QUANTUM = 10;  // Q1 时间片（中优先级，中等时间片）
    private static final int Q2_QUANTUM = 16;  // Q2 时间片（低优先级，长时间片）
    private static final int AGING_THRESHOLD = 30; // ★ 老化阈值：在队列中等待超过30tick就自动升级

    // ————— 运行时状态 —————
    private ProcessControlBlock runningProcess = null; // 当前在CPU上运行的进程（null=空闲）
    private int currentQueueLevel = -1;   // 当前运行进程来自哪个队列（0/1/2，-1=无）
    private int clockTick = 0;            // ★ 全局时钟计数器（每 tick() 执行一次 +1）
    private int timeUsed = 0;             // 当前进程已使用的时间片计数（用于判断是否超时）
    private boolean paused = false;       // 调度器是否暂停（暂停时 tick() 直接返回）
    private boolean autoPause = false;    // 单步模式：每执行一个tick自动暂停（用于指令级调试）
    private boolean stepping = false;     // 步进标志：防止 step 和定时任务同时执行

    // ★ 进程入队时间戳表 — HashMap<PID, 入队时的clockTick>
    // 用于老化机制：每次检查时计算 (当前tick - 入队tick) ≥ 阈值 → 升级
    private final Map<Integer, Integer> queueEntryTime = new HashMap<>();

    // 缓存给前端 HUD 显示用的进程调度数据
    private List<Map<String, Object>> cachedScores = new ArrayList<>();

    // 进程显示颜色池 — 每个新进程按 (PID-100) % 15 分配颜色
    // 保证每个进程在甘特图和任务管理器中颜色不同
    private static final String[] COLORS = {
        "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
        "#f43f5e", "#ef4444", "#f97316", "#eab308", "#84cc16",
        "#22c55e", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6"
    };

    // ========================================================================
    //  进程创建 — 整个系统的入口点
    //  用户点击Launcher中的应用 → 前端POST /api/process/launch → 本方法
    // ========================================================================

    /**
     * ★ 启动一个新应用进程 — 沙盒模式唯一的进程创建入口
     *
     * @param app 要启动的应用类型（SimulatedApp 枚举）
     * @return Object[]: [pid] 正常启动, [pid] 单实例已运行, ["WAITING_MEMORY", pid] 内存不足等待
     *
     * 完整流程：
     *   1. 单实例检查（CSGO/我的世界等只能开一个实例）
     *   2. 非单实例自动编号（记事本(1)、记事本(2)...）
     *   3. ★ 分配内存 — 如果不够则创建"等待PCB"进 blockedQueue
     *   4. 创建正式 PCB，填充所有沙盒字段
     *   5. 根据优先级入队（1-2→Q0, 3-4→Q1, 5→Q2）
     *   6. 游戏/音乐应用自动注册音频设备
     *   7. ★ 高优先级抢占检测（Q0新进程抢占Q1/Q2运行进程）
     */
    public synchronized Object[] launchApp(SimulatedApp app) {
        // ————— 1. 单实例检查 —————
        if (app.isSingleInstance() && isAppRunning(app.name())) {
            ProcessControlBlock existing = findRunningByName(app.name());
            if (existing != null) {
                eventService.warning("PROCESS_MGR", "启动失败：" + app.getName() + " 已在运行 (PID:" + existing.getPid() + ")");
                return new Object[]{-1, existing.getPid()}; // 返回-1表示启动失败，附上已有进程的PID
            }
        }

        // ————— 2. 自动编号（非单实例） —————
        String displayName = app.getName();
        if (!app.isSingleInstance()) {
            // 统计当前运行的同类进程数量 → 生成 "记事本(1)"、"记事本(2)"...
            long count = getAllProcesses().stream()
                .filter(p -> app.name().equals(p.getAppType()) && p.getState() != ProcessState.TERMINATED).count();
            displayName = app.getName() + "(" + (count + 1) + ")";
        }

        int pid = nextPid++;                              // 分配唯一PID（从100开始递增）
        String color = COLORS[(pid - 100) % COLORS.length]; // 从颜色池取一个颜色

        // ————— 3. ★ 分配内存 —————
        boolean memOk = hardwarePool.allocateMemory(app.getMemoryRequired(), pid, displayName);
        if (!memOk) {
            // ★ 内存不足：创建"等待PCB"，进入阻塞队列排队
            // 等别的进程终止释放内存后，tryWakeupMemoryWaiters() 会按需大小排序唤醒
            eventService.warning("MEMORY_MGR", "内存不足，" + displayName + " (PID:" + pid + ") 进入等待队列");
            ProcessControlBlock waitPcb = new ProcessControlBlock(pid, displayName, 0, app.getPriority(), 0, color);
            waitPcb.setState(ProcessState.BLOCKED);                           // 状态→阻塞
            waitPcb.setBlockedReason("等待内存(" + app.getMemoryRequired() + "MB)"); // ★ 记录阻塞原因（前端看到"等待内存(14000MB)"）
            waitPcb.setAppType(app.name());     // 记录应用类型（用于IPC查找和搜索）
            waitPcb.setIcon(app.getIcon());     // 显示图标
            waitPcb.setMemoryUsage(app.getMemoryRequired()); // 内存需求总量（作为排序依据）
            waitPcb.setCurrentMemoryUsage(0);   // 当前分配=0（还没给内存）
            waitPcb.setDiskRead(app.getDiskRead());
            waitPcb.setDiskWrite(app.getDiskWrite());
            waitPcb.setNetworkSpeed(app.getNetworkSpeed());
            waitPcb.setParentPid(-1);           // 无父进程
            waitPcb.setCoreIndex(-1);           // 无CPU核心
            waitPcb.setCodeSegment(app.getCodeSegment()); // 设置指令代码段
            waitPcb.resetContext();             // 清空所有寄存器
            blockedQueue.add(waitPcb);          // 加入阻塞队列等待内存
            processTable.add(waitPcb);          // 加入全局进程表
            addInterruptLog("BLOCK", displayName + " (PID:" + pid + ") 内存不足(" + app.getMemoryRequired() + "MB)，进阻塞队列等待");
            return new Object[]{"WAITING_MEMORY", pid};
        }

        // ————— 4. 创建正式 PCB —————
        ProcessControlBlock pcb = new ProcessControlBlock(pid, displayName, 0, app.getPriority(), 0, color);
        pcb.setState(ProcessState.READY);                         // 状态→就绪
        pcb.setAppType(app.name());                               // 应用类型（如"MINECRAFT"）
        pcb.setIcon(app.getIcon());                               // 图标 emoji
        pcb.setMemoryUsage(app.getMemoryRequired());              // ★ 内存需求（用于内存释放时排序唤醒）
        pcb.setCurrentMemoryUsage(app.getMemoryRequired());       // 实际分配内存
        pcb.setDiskRead(app.getDiskRead());
        pcb.setDiskWrite(app.getDiskWrite());
        pcb.setNetworkSpeed(app.getNetworkSpeed());
        pcb.setParentPid(-1);                                     // 无父进程
        pcb.setCoreIndex(hardwarePool.allocateCpuCore(pid));      // 分配CPU核心
        pcb.setCodeSegment(app.getCodeSegment());                 // ★ 设置指令代码段（来自SimulatedApp）
        pcb.resetContext();                                       // 重置所有寄存器为0，PC指向第0条指令

        // ————— 5. 根据优先级入队 —————
        int targetQueue = getQueueForPriority(app.getPriority()); // 优先级1-2→Q0, 3-4→Q1, 5→Q2
        addToQueue(pcb, targetQueue);
        queueEntryTime.put(pid, clockTick);                       // 记录入队时间（用于老化计算）

        addInterruptLog("ARRIVAL", "进程 " + displayName + " (PID:" + pid + ") 进入Q" + targetQueue
            + " (优先级:" + app.getPriority() + ", 指令:" + app.getInstructionCount() + "条)");

        eventService.info("PROCESS_MGR", "启动进程 " + app.getName() + " (PID:" + pid + "), Q" + targetQueue,
            pid, app.getName());

        // ————— 6. 游戏/音乐自动注册耳机（模拟独占音频设备） —————
        if (app.name().equals("CSGO") || app.name().equals("PUBG") || app.name().equals("MUSIC")
            || app.name().equals("VIDEO") || app.name().equals("MINECRAFT")) {
            ioManager.audioPlay(pid, app.getName());
        }

        processTable.add(pcb); // 加入全局进程表
        paused = false;        // 新进程到达，自动取消暂停（保证新进程能被调度）
        refreshScores();       // 刷新前端HUD分数

        // ————— 7. ★ 高优先级抢占 —————
        // 如果新进程进了Q0，而当前正在运行的进程在Q1或Q2
        // → Q0优先级更高，直接抢占CPU！
        if (targetQueue == 0 && runningProcess != null && currentQueueLevel > 0) {
            cpuCore.saveContext(runningProcess);           // 保存当前进程的寄存器到PCB
            runningProcess.setState(ProcessState.READY);   // 当前进程→就绪
            addToQueue(runningProcess, currentQueueLevel); // 塞回原队列（等下次调度）
            queueEntryTime.put(runningProcess.getPid(), clockTick); // 刷新入队时间
            addInterruptLog("PREEMPT", runningProcess.getName() + " 被 " + displayName + " 抢占! (Q" + currentQueueLevel + "→Q0)");
            runningProcess = null;                         // CPU空出
            currentQueueLevel = -1;
            scheduleNext();                                // 重新调度 → 新进程上CPU
        }

        return new Object[]{pid}; // 返回新进程PID
    }

    /**
     * 根据优先级决定初始进入哪个队列
     * 优先级1-2 → Q0（高优先级，时间片8）
     * 优先级3-4 → Q1（中优先级，时间片10）
     * 优先级5 → Q2（低优先级，时间片16）
     */
    private int getQueueForPriority(int priority) {
        if (priority <= 2) return 0;
        if (priority <= 4) return 1;
        return 2;
    }

    /** 将PCB加入指定级别的就绪队列 */
    private void addToQueue(ProcessControlBlock pcb, int level) {
        switch (level) {
            case 0 -> q0.add(pcb);
            case 1 -> q1.add(pcb);
            case 2 -> q2.add(pcb);
        }
    }

    /** 将PCB从指定级别的就绪队列移除 */
    private void removeFromQueue(ProcessControlBlock pcb, int level) {
        switch (level) {
            case 0 -> q0.remove(pcb);
            case 1 -> q1.remove(pcb);
            case 2 -> q2.remove(pcb);
        }
    }

    // ========================================================================
    //  ★ 时钟中断 + MLFQ调度 — 整个模拟器的核心循环
    //  每 tick 执行一次：老化检查 → 调度 → 指令执行 → 处理结果
    // ========================================================================

    /**
     * ★ 强制单步执行 — 不受 paused 状态限制
     * 执行一个 tick 后立即恢复暂停状态
     * 由前端 POST /api/system/step 触发，用于单步调试
     */
    public synchronized void tickForced() {
        paused = false;
        tick();
        paused = true; // 执行完立刻暂停
    }

    /**
     * ★ tick() — 调度器核心方法，每次调用推进一个时间单位
     *
     * 执行顺序（按优先级）：
     *   1. 老化检查 checkAging() — Q2/Q1等待≥30tick的进程升级
     *   2. 确保有运行进程 — 如果没有，调用 scheduleNext()
     *   3a. 时间片到期检查 — 如果用超了且还有指令 → 降级 + 重新调度
     *   3b. ★ 执行一条指令 — restoreContext → executeStep → 处理结果
     *   4. 刷新前端 HUD 分数
     *   5. 自动暂停（单步模式）
     *
     * 调用来源：
     *   - 前端轮询：POST /api/system/run（每500ms发一次）
     *   - 步进：POST /api/system/step → tickForced()
     */
    public synchronized void tick() {
        if (paused) return; // 暂停状态直接跳过

        clockTick++; // ★ 全局时钟+1

        // ————— 1. 老化机制 —————
        try { checkAging(); } catch (Exception e) { addInterruptLog("ERROR", "老化检查异常: " + e.getMessage()); }

        // ————— 2. 确保有运行进程 —————
        if (runningProcess == null || runningProcess.getState() != ProcessState.RUNNING) {
            scheduleNext(); // 从就绪队列选一个上CPU
        }

        // ————— 3. 如果有正在运行的进程 —————
        if (runningProcess != null && runningProcess.getState() == ProcessState.RUNNING) {
            int quantum = getQuantum(currentQueueLevel); // 当前队列的时间片

            // — 3a. 检查时间片是否到期 ——————————————————
            // 条件：已用时间 ≥ 时间片 且 还有指令没执行完
            boolean hasMoreCode = runningProcess.getCodeSegment() != null
                && runningProcess.getProgramCounter() < runningProcess.getCodeSegment().length;
            if (timeUsed >= quantum && hasMoreCode) {
                // ★ 时间片到期 → saveContext 保存现场 → 降级到下一级队列
                addInterruptLog("TIMEOUT", runningProcess.getName() + " Q" + currentQueueLevel + "时间片" + quantum + "tick用完, 剩余" + runningProcess.getRemainingTime() + "条");
                cpuCore.saveContext(runningProcess);           // ★ 保存寄存器到PCB
                runningProcess.setState(ProcessState.READY);   // 状态→就绪
                int newLevel = Math.min(currentQueueLevel + 1, 2); // 降一级（最多降到Q2）
                addToQueue(runningProcess, newLevel);          // 加入下一级队列
                queueEntryTime.put(runningProcess.getPid(), clockTick); // 记录入队时间
                runningProcess = null;
                currentQueueLevel = -1;
                timeUsed = 0;
                scheduleNext(); // 重新选一个进程上CPU
            }

            // — 3b. ★ 执行一条指令 —————————————————————————
            if (runningProcess != null && runningProcess.getState() == ProcessState.RUNNING) {
                try {
                    // 如果 CPU 空闲或者跑的不是当前进程 → 先恢复上下文
                    if (cpuCore.isIdle() || cpuCore.getCurrentPid() != runningProcess.getPid()) {
                        cpuCore.restoreContext(runningProcess); // ★ PCB寄存器 → CPU物理寄存器
                        runningProcess.setContextSwitchCount(runningProcess.getContextSwitchCount() + 1); // 统计切换次数
                    }
                    // ★ 执行一条指令！
                    InstructionResult result = cpuCore.executeStep(runningProcess);
                    runningProcess.setTotalCpuTimeUsed(runningProcess.getTotalCpuTimeUsed() + 1); // 累计CPU时间
                    timeUsed++; // 当前时间片计数+1

                    // ★ 根据指令执行结果决定下一步
                    switch (result.getStatus()) {
                        case HALT -> completeProcess(runningProcess);              // 进程结束
                        case BLOCKED_IPC -> blockProcess(runningProcess, "等待IPC消息");   // RECV无消息→阻塞
                        case BLOCKED_IO -> blockProcess(runningProcess, "等待I/O");        // IO请求→阻塞
                        case BLOCKED_PRINTER -> blockProcess(runningProcess, "等待打印机"); // 打印机被占→阻塞
                        default -> { } // OK → 下次tick继续执行下一条指令
                    }
                } catch (Exception e) {
                    addInterruptLog("ERROR", "执行异常: " + e.getMessage());
                    completeProcess(runningProcess); // 异常时强制终止
                }
            }
        }

        // ————— 4. 刷新前端 HUD 显示的分数 —————
        refreshScores();

        // ————— 5. 单步模式自动暂停 —————
        if (autoPause) paused = true; // 每执行一个tick就暂停，实现"步进"
    }

    /**
     * 获取指定队列级别的时间片大小
     * Q0=8tick, Q1=10tick, Q2=16tick
     */
    private int getQuantum(int level) {
        return switch (level) {
            case 0 -> Q0_QUANTUM;
            case 1 -> Q1_QUANTUM;
            case 2 -> Q2_QUANTUM;
            default -> Q2_QUANTUM;
        };
    }

    /**
     * ★ MLFQ 调度算法核心 — 从最高优先级非空队列中选一个进程上CPU
     *
     * 规则：
     *   1. 先看 Q0 有没有进程 → 有就取出队首
     *   2. Q0 空则看 Q1 → 取出队首
     *   3. Q1 也空则看 Q2 → 取出队首
     *   4. 全部为空 → CPU空闲
     *
     * 选择后：状态→RUNNING, restoreContext()加载寄存器, timeUsed置零
     */
    private void scheduleNext() {
        ProcessControlBlock next = null;
        int nextLevel = -1;

        // ★ 严格按优先级从高到低扫描
        if (!q0.isEmpty()) { next = q0.remove(0); nextLevel = 0; }      // Q0有进程→拿走
        else if (!q1.isEmpty()) { next = q1.remove(0); nextLevel = 1; } // Q0空→看Q1
        else if (!q2.isEmpty()) { next = q2.remove(0); nextLevel = 2; } // Q1空→看Q2

        if (next == null) {
            // 所有队列都空 → CPU空闲
            runningProcess = null;
            currentQueueLevel = -1;
            hardwarePool.freeAllCpuCores(0);
            return;
        }

        // ★ 选中进程上CPU
        next.setState(ProcessState.RUNNING);       // 就绪→运行
        queueEntryTime.remove(next.getPid());      // 出队了，移除老化计时
        runningProcess = next;                     // 设为当前运行进程
        currentQueueLevel = nextLevel;             // 记录来自哪个队列
        timeUsed = 0;                              // 时间片计数归零

        cpuCore.restoreContext(runningProcess);    // ★ PCB寄存器 → CPU物理寄存器（加载现场）

        int quantum = getQuantum(nextLevel);
        addInterruptLog("SCHEDULE", "MLFQ → " + next.getName() + " (PID:" + next.getPid()
            + ") 从Q" + nextLevel + "上CPU, 时间片:" + quantum + "tick"
            + ", 剩余指令:" + (next.getCodeSegment() != null ? next.getCodeSegment().length - next.getProgramCounter() : "?"));
    }

    /**
     * ★ 老化机制 — 防止低优先级进程饥饿
     *
     * 每 tick 检查一次：
     *   - Q2 中的进程等待 ≥ AGING_THRESHOLD(30) tick → 升级到 Q1
     *   - Q1 中的进程等待 ≥ AGING_THRESHOLD(30) tick → 升级到 Q0
     *
     * 实现方式：遍历队列，用 queueEntryTime 记录每个进程入队时间
     * 计算 (当前tick - 入队tick) 是否达到阈值
     * 使用 Iterator.remove() 安全地在遍历中移除元素
     */
    private void checkAging() {
        // Q2 → Q1 升级
        Iterator<ProcessControlBlock> it2 = q2.iterator();
        while (it2.hasNext()) {
            ProcessControlBlock p = it2.next();
            Integer entryTime = queueEntryTime.get(p.getPid());
            if (entryTime != null && (clockTick - entryTime) >= AGING_THRESHOLD) {
                it2.remove();                                    // 从Q2移除
                q1.add(p);                                       // 加入Q1
                queueEntryTime.put(p.getPid(), clockTick);       // 重置入队时间
                addInterruptLog("AGING", p.getName() + " 在Q2等待" + (clockTick - entryTime) + "tick, 老化升级到Q1");
            }
        }

        // Q1 → Q0 升级
        Iterator<ProcessControlBlock> it1 = q1.iterator();
        while (it1.hasNext()) {
            ProcessControlBlock p = it1.next();
            Integer entryTime = queueEntryTime.get(p.getPid());
            if (entryTime != null && (clockTick - entryTime) >= AGING_THRESHOLD) {
                it1.remove();                                    // 从Q1移除
                q0.add(p);                                       // 加入Q0
                queueEntryTime.put(p.getPid(), clockTick);       // 重置入队时间
                addInterruptLog("AGING", p.getName() + " 在Q1等待" + (clockTick - entryTime) + "tick, 老化升级到Q0");
            }
        }
    }

    // ========================================================================
    //  进程完成 — 进程执行完 HALT 指令或被异常终止时的清理流程
    // ========================================================================

    /**
     * ★ 进程结束 — 释放所有资源并尝试唤醒内存等待者
     *
     * 清理流程（重要）：
     *   1. saveContext() — 保存最终寄存器值（留作记录）
     *   2. 释放CPU核心、释放内存、停止音频
     *   3. 释放独占设备（打印机、USB），如果有等待者则唤醒
     *   4. 从全局进程表移除
     *   5. ★ tryWakeupMemoryWaiters() — 刚释放了内存，看能否唤醒"等内存"的进程
     */
    private void completeProcess(ProcessControlBlock p) {
        cpuCore.saveContext(p);                              // 保存最终寄存器值
        p.setState(ProcessState.TERMINATED);                 // 状态→终止
        hardwarePool.freeAllCpuCores(p.getPid());             // 释放CPU核心
        hardwarePool.freeMemory(p.getPid());                  // ★ 释放内存（可能唤醒等待者）
        ioManager.audioStop(p.getPid());                      // 停止音频设备
        // 释放打印机并唤醒等待者
        Integer printerWoken = ioManager.releaseExclusiveDevice("PRINTER", p.getPid());
        if (printerWoken != null) wakeupBlockedProcess(printerWoken, "打印机已释放（" + p.getName() + " 终止）");
        ioManager.releaseExclusiveDevice("USB_DISK", p.getPid()); // 释放USB设备
        processTable.remove(p);                               // 从全局进程表移除
        queueEntryTime.remove(p.getPid());                   // 清除老化计时
        addInterruptLog("TERMINATED", p.getName() + " (PID:" + p.getPid() + ") 执行完毕, PC=" + p.getProgramCounter());
        runningProcess = null;                                // CPU空闲
        currentQueueLevel = -1;
        timeUsed = 0;
        // ★ 内存释放后尝试唤醒等待内存的进程
        tryWakeupMemoryWaiters();
    }

    /**
     * ★ 内存不足唤醒器 — 按内存需求从小到大尝试分配
     *
     * 触发时机：completeProcess() 或 killProcess() 释放内存后
     *
     * 策略：
     *   1. 从 blockedQueue 中筛选"等待内存"的进程
     *   2. ★ 按 memoryUsage 升序排序（小需求优先，提高分配成功率）
     *   3. 逐个尝试 allocateMemory()
     *   4. 成功 → 唤醒（READY）+ 分配CPU核心 + 入就绪队列
     *
     * 为什么升序？小内存进程更容易分配成功，避免大进程占着位置不让小进程过
     */
    private void tryWakeupMemoryWaiters() {
        List<ProcessControlBlock> waiters = blockedQueue.stream()
            .filter(p -> p.getBlockedReason() != null && p.getBlockedReason().startsWith("等待内存"))
            .sorted(Comparator.comparingInt(ProcessControlBlock::getMemoryUsage)) // ★ 升序排列
            .toList();
        for (ProcessControlBlock waiter : waiters) {
            boolean memOk = hardwarePool.allocateMemory(waiter.getMemoryUsage(), waiter.getPid(), waiter.getName());
            if (memOk) {
                waiter.setCurrentMemoryUsage(waiter.getMemoryUsage());     // 标记已分配内存
                waiter.setCoreIndex(hardwarePool.allocateCpuCore(waiter.getPid())); // 分配CPU核心
                blockedQueue.remove(waiter);                                // 从阻塞队列移出
                waiter.setState(ProcessState.READY);                       // BLOCKED → READY
                waiter.setBlockedReason(null);                              // 清除阻塞原因
                int targetQueue = getQueueForPriority(waiter.getPriority());
                addToQueue(waiter, targetQueue);                            // 加入就绪队列
                queueEntryTime.put(waiter.getPid(), clockTick);            // 记录入队时间
                addInterruptLog("WAKEUP", waiter.getName() + " (PID:" + waiter.getPid() + ") 内存就绪，唤醒进Q" + targetQueue);
                eventService.info("MEMORY_MGR", waiter.getName() + " 获得内存被唤醒", waiter.getPid(), waiter.getName());
            }
        }
    }

    /**
     * 将 blockedQueue 中指定 PID 的进程唤醒回就绪队列
     * 用于打印机释放、IPC消息到达等场景
     */
    private void wakeupBlockedProcess(int pid, String reason) {
        ProcessControlBlock target = blockedQueue.stream()
            .filter(p -> p.getPid() == pid).findFirst().orElse(null);
        if (target == null) return;
        blockedQueue.remove(target);
        target.setState(ProcessState.READY);
        target.setBlockedReason(null);
        addToQueue(target, 1); // 唤醒后默认进 Q1（中优先级）
        queueEntryTime.put(pid, clockTick);
        addInterruptLog("WAKEUP", target.getName() + " 被唤醒: " + reason + " → Q1");
        eventService.info("DEVICE", target.getName() + " 获得打印机被唤醒", pid, target.getName());
    }

    /**
     * ★ 阻塞进程 — 将进程从CPU上撤下，移入阻塞队列
     *
     * 触发条件：RECV无消息(BLOCKED_IPC)、P_PRINTER被占用(BLOCKED_PRINTER)、IO请求(BLOCKED_IO)
     *
     * 流程：
     *   1. saveContext() — ★ 保存PC和寄存器（恢复时从断点继续）
     *   2. 状态→BLOCKED，记录阻塞原因
     *   3. 释放CPU核心
     *   4. 从就绪队列移除 → 加入 blockedQueue
     *   5. CPU空出，下次tick会schedule别的进程
     */
    private void blockProcess(ProcessControlBlock p, String reason) {
        cpuCore.saveContext(p);                  // ★ 保存寄存器（PC、AX、BX...）
        p.setState(ProcessState.BLOCKED);        // 状态→阻塞
        p.setBlockedReason(reason);              // 记录原因（前端显示用）
        hardwarePool.freeAllCpuCores(p.getPid()); // 释放CPU核心
        removeFromQueue(p, currentQueueLevel);    // 从就绪队列移除
        blockedQueue.add(p);                      // 加入阻塞队列
        addInterruptLog("BLOCK", p.getName() + " 阻塞: " + reason);
        runningProcess = null;                    // CPU空出
        currentQueueLevel = -1;
        timeUsed = 0;
    }

    // ========================================================================
    //  进程管理 — 手动操作：终止/挂起/恢复
    //  由前端按钮或终端命令触发
    // ========================================================================

    private final List<ProcessControlBlock> processTable = new CopyOnWriteArrayList<>(); // ★ 全局进程表
    private int nextPid = 100; // PID从100开始分配（0-99保留给系统进程）

    /**
     * 终止进程 — 从所有队列移除，释放资源
     */
    public synchronized boolean killProcess(int pid) {
        ProcessControlBlock pcb = findProcess(pid);
        if (pcb == null) return false;

        // 从所有队列中移除（确保不留痕迹）
        q0.remove(pcb); q1.remove(pcb); q2.remove(pcb); blockedQueue.remove(pcb);
        queueEntryTime.remove(pid);
        if (runningProcess == pcb) { cpuCore.saveContext(pcb); runningProcess = null; currentQueueLevel = -1; timeUsed = 0; }

        // 释放所有资源
        hardwarePool.freeMemory(pid);
        hardwarePool.freeAllCpuCores(pid);
        processTable.remove(pcb);
        ioManager.audioStop(pid);
        ioManager.releaseExclusiveDevice("PRINTER", pid);
        ioManager.releaseExclusiveDevice("USB_DISK", pid);
        pcb.setState(ProcessState.TERMINATED);
        addInterruptLog("KILL", pcb.getName() + " (PID:" + pid + ") 被终止");
        tryWakeupMemoryWaiters(); // 释放内存后尝试唤醒等待者
        return true;
    }

    /**
     * 挂起进程 — RUNNING 或 READY 的进程 → BLOCKED（手动挂起）
     * 区别：挂起的进程在 blockedQueue 中，但 resume() 可以恢复
     */
    public synchronized boolean suspendProcess(int pid) {
        ProcessControlBlock pcb = findProcess(pid);
        if (pcb == null) return false;
        if (pcb.getState() == ProcessState.RUNNING) {
            cpuCore.saveContext(pcb);                              // 保存上下文
            pcb.setState(ProcessState.BLOCKED); pcb.setBlockedReason("手动挂起");
            removeFromQueue(pcb, currentQueueLevel); blockedQueue.add(pcb);
            if (runningProcess == pcb) { runningProcess = null; currentQueueLevel = -1; timeUsed = 0; }
        } else if (pcb.getState() == ProcessState.READY) {
            pcb.setState(ProcessState.BLOCKED); pcb.setBlockedReason("手动挂起");
            q0.remove(pcb); q1.remove(pcb); q2.remove(pcb); blockedQueue.add(pcb);
        } else return false; // 已经是 BLOCKED 或 TERMINATED → 无法挂起
        addInterruptLog("SUSPEND", pcb.getName() + " 被挂起");
        return true;
    }

    /**
     * 恢复挂起的进程 — BLOCKED(手动挂起) → READY → Q2
     * 注意：恢复后默认进 Q2（低优先级），而不是回到原来的队列
     */
    public synchronized boolean resumeProcess(int pid) {
        ProcessControlBlock pcb = findProcess(pid);
        if (pcb == null || pcb.getState() != ProcessState.BLOCKED) return false;
        pcb.setState(ProcessState.READY); pcb.setBlockedReason(null);
        blockedQueue.remove(pcb);
        addToQueue(pcb, 2); // 恢复后默认进Q2（低优先级，防滥用）
        queueEntryTime.put(pid, clockTick);
        addInterruptLog("RESUME", pcb.getName() + " 恢复到Q2");
        return true;
    }

    // ========================================================================
    //  辅助方法 — 查询、日志、前端数据
    // ========================================================================

    /** 检查某种应用是否已经在运行（用于单实例检查） */
    private boolean isAppRunning(String appName) {
        return processTable.stream().anyMatch(p -> appName.equals(p.getAppType()) && p.getState() != ProcessState.TERMINATED);
    }
    /** 按应用名查找正在运行的进程（用于单实例返回已有PID） */
    private ProcessControlBlock findRunningByName(String name) {
        return processTable.stream().filter(p -> name.equals(p.getAppType()) && p.getState() != ProcessState.TERMINATED).findFirst().orElse(null);
    }

    // ————— 全局查询接口 —————
    public List<ProcessControlBlock> getAllProcesses() { return new ArrayList<>(processTable); }    // 所有进程
    public ProcessControlBlock findProcess(int pid) {                                              // 按PID查找
        return processTable.stream().filter(p -> p.getPid() == pid).findFirst().orElse(null);
    }
    public ProcessControlBlock getRunningProcess() { return runningProcess; }                      // 当前运行进程
    public List<ProcessControlBlock> getBlockedQueue() { return blockedQueue; }                    // 阻塞队列
    public List<ProcessControlBlock> getQ0() { return q0; }                                        // Q0队列
    public List<ProcessControlBlock> getQ1() { return q1; }                                        // Q1队列
    public List<ProcessControlBlock> getQ2() { return q2; }                                        // Q2队列

    // ————— 调度器状态 —————
    public int getClockTick() { return clockTick; }          // 当前时钟tick
    public boolean isPaused() { return paused; }             // 是否暂停
    public void setPaused(boolean p) { paused = p; }        // 手动设置暂停
    public void setStepping(boolean s) { stepping = s; }    // 设置步进模式
    public boolean isAutoPause() { return autoPause; }      // 是否单步模式
    public boolean togglePause() { paused = !paused; return paused; }              // 切换暂停
    public boolean toggleAutoPause() { autoPause = !autoPause; if (autoPause) paused = true; return autoPause; } // 切换单步
    public CpuCore getCpuCore() { return cpuCore; }         // 获取CPU核心（前端显示寄存器）
    public int getCurrentQueueLevel() { return currentQueueLevel; }                // 当前队列级别

    /**
     * 合并所有就绪队列 — 给旧版前端兼容
     * 新前端直接用 getQ0/getQ1/getQ2
     */
    public List<ProcessControlBlock> getReadyQueue() {
        List<ProcessControlBlock> all = new ArrayList<>();
        all.addAll(q0); all.addAll(q1); all.addAll(q2);
        return all;
    }

    /**
     * ★ 中断日志系统 — 记录所有调度事件（最多200条）
     * 用于前端"中断日志"面板显示
     *
     * 事件类型：ARRIVAL, SCHEDULE, TIMEOUT, PREEMPT, BLOCK, WAKEUP,
     *           TERMINATED, KILL, SUSPEND, RESUME, AGING, IPC, ERROR
     */
    private void addInterruptLog(String type, String desc) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("tick", clockTick);    // 发生时的tick编号
        entry.put("type", type);          // 事件类型（前端按类型标颜色）
        entry.put("description", desc);   // 事件描述
        interruptLog.add(entry);
        if (interruptLog.size() > 200) interruptLog.remove(0); // 超过200条自动移除最旧的
    }
    private final List<Map<String, Object>> interruptLog = new ArrayList<>();
    public List<Map<String, Object>> getInterruptLog() { return interruptLog; }

    // ========================================================================
    //  前端 HUD 数据 — 给任务管理器和仪表盘提供进程调度信息
    //  包括：队列级别、等待时间、剩余指令数等
    // ========================================================================

    public List<Map<String, Object>> getAllMaawsScores() { return cachedScores; }

    /**
     * ★ 刷新 HUD 分数 — 计算每个进程的调度信息供前端显示
     *
     * 为每个进程计算：
     *   - 当前所在队列级别 (0/1/2)
     *   - 时间片大小、已用时间
     *   - 等待时间（用于老化判断）
     *   - 总指令数、剩余指令数
     *   - 兼容旧前端的 score/priorityScore/waitScore/instrScore
     *
     * 每次 tick() 结束后自动调用
     */
    private void refreshScores() {
        List<Map<String, Object>> scores = new ArrayList<>();
        List<ProcessControlBlock> all = new ArrayList<>();
        all.addAll(q0); all.addAll(q1); all.addAll(q2);
        if (runningProcess != null && !all.contains(runningProcess)) all.add(runningProcess);

        for (ProcessControlBlock p : all) {
            if (p.getState() == ProcessState.TERMINATED) continue;
            // 确定进程当前所在队列
            int level = (runningProcess != null && runningProcess.getPid() == p.getPid())
                ? currentQueueLevel : (q0.contains(p) ? 0 : q1.contains(p) ? 1 : 2);
            int quantum = getQuantum(level);
            Integer entryTime = queueEntryTime.get(p.getPid());
            int waitTicks = entryTime != null ? (clockTick - entryTime) : 0; // 已等待时间
            int totalInstr = p.getCodeSegment() != null ? p.getCodeSegment().length : 0;
            int remaining = Math.max(totalInstr - p.getProgramCounter(), 0); // 剩余指令

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("pid", p.getPid());
            item.put("name", p.getName());
            item.put("state", p.getState().name());
            item.put("queueLevel", level);        // 当前队列
            item.put("quantum", quantum);          // 时间片
            item.put("timeUsed", runningProcess == p ? timeUsed : 0); // 已用时间片
            item.put("waitTicks", waitTicks);      // 等待时间
            item.put("totalInstructions", totalInstr);   // 总指令数
            item.put("remainingInstructions", remaining); // 剩余指令
            item.put("priority", p.getPriority());       // 优先级
            item.put("isRunning", runningProcess != null && runningProcess.getPid() == p.getPid());
            // 兼容旧前端字段
            item.put("score", (double) level);
            item.put("priorityScore", (double) p.getPriority());
            item.put("waitScore", (double) waitTicks);
            item.put("instrScore", (double) remaining);
            scores.add(item);
        }
        cachedScores = scores;
    }

    /**
     * 构建进程树 — 按 parentPid 组织成树形结构
     * 用于前端"进程树"面板显示
     * 根节点：parentPid <= 0 的进程
     * 子节点：parentPid = 父进程PID 的进程
     */
    public List<Map<String, Object>> getProcessTree() {
        List<Map<String, Object>> tree = new ArrayList<>();
        List<ProcessControlBlock> roots = processTable.stream()
            .filter(p -> p.getParentPid() <= 0).toList(); // 找所有根节点
        for (ProcessControlBlock root : roots) {
            Map<String, Object> node = new LinkedHashMap<>();
            node.put("pid", root.getPid()); node.put("name", root.getName());
            node.put("state", root.getState().name()); node.put("color", root.getColor());
            node.put("parentPid", root.getParentPid());
            List<Map<String, Object>> children = new ArrayList<>();
            // 找所有 parentPid=本进程PID 的子进程
            processTable.stream().filter(p -> p.getParentPid() == root.getPid()).forEach(c -> {
                Map<String, Object> cn = new LinkedHashMap<>();
                cn.put("pid", c.getPid()); cn.put("name", c.getName());
                cn.put("state", c.getState().name()); cn.put("color", c.getColor());
                cn.put("parentPid", c.getParentPid()); cn.put("children", new ArrayList<>());
                children.add(cn);
            });
            node.put("children", children);
            tree.add(node);
        }
        return tree;
    }

    /**
     * 搜索进程 — 按名称、应用类型、PID 模糊搜索
     * 用于前端搜索栏
     */
    public List<ProcessControlBlock> searchProcesses(String keyword) {
        if (keyword == null || keyword.isEmpty()) return getAllProcesses();
        String lower = keyword.toLowerCase();
        return processTable.stream()
            .filter(p -> (p.getName() != null && p.getName().toLowerCase().contains(lower))
                || (p.getAppType() != null && p.getAppType().toLowerCase().contains(lower))
                || String.valueOf(p.getPid()).contains(lower))
            .toList();
    }

    /**
     * ★ 清空所有状态 — 释放资源，重置调度器
     * 由前端 POST /api/process/clear 触发（"结束所有进程"按钮）
     *
     * 清理项：
     *   - 释放所有进程的内存、CPU核心、音频、独占设备
     *   - 清空所有队列（q0/q1/q2/blockedQueue/processTable）
     *   - 重置时钟、暂停标志
     *   - 清空日志和缓存
     */
    public void clearAll() {
        // 先释放所有硬件资源
        for (ProcessControlBlock pcb : processTable) {
            hardwarePool.freeMemory(pcb.getPid());
            hardwarePool.freeAllCpuCores(pcb.getPid());
            ioManager.audioStop(pcb.getPid());
            ioManager.releaseExclusiveDevice("PRINTER", pcb.getPid());
            ioManager.releaseExclusiveDevice("USB_DISK", pcb.getPid());
        }
        // 清空全部数据结构
        processTable.clear(); q0.clear(); q1.clear(); q2.clear(); blockedQueue.clear();
        runningProcess = null; currentQueueLevel = -1; clockTick = 0; timeUsed = 0;
        paused = false; autoPause = false;
        interruptLog.clear(); queueEntryTime.clear(); cachedScores.clear();
    }
}
