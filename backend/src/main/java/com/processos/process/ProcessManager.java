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
 * 进程管理器 — MLFQ多级反馈队列调度
 *
 * 三级队列：
 *   Q0（高优先级）：时间片4，新进程/高优先级进入
 *   Q1（中优先级）：时间片8，Q0降级/中优先级进入
 *   Q2（低优先级）：时间片16，Q1降级/低优先级进入
 *
 * 规则：
 *   1. CPU总是执行最高非空队列的队首进程
 *   2. 时间片用完未结束 → 降到下一级队列
 *   3. 老化机制：在低队列等待超过阈值 → 升级到上一级
 *   4. 新进程根据优先级进入对应队列
 */
@Component
public class ProcessManager {

    @Autowired private HardwarePool hardwarePool;
    @Autowired private SystemEventService eventService;
    @Autowired private IoManager ioManager;

    private final CpuCore cpuCore = new CpuCore();

    // IPC + 设备回调：注入给 CpuCore，让指令执行时能操作进程状态
    {
        cpuCore.setIpcCallback(new CpuCore.IpcCallback() {
            @Override
            public boolean sendMessage(int fromPid, String targetAppType, String message) {
                // 找目标进程，写消息，若对方在等消息则唤醒
                ProcessControlBlock target = processTable.stream()
                    .filter(p -> targetAppType.equalsIgnoreCase(p.getAppType())
                        && p.getState() != ProcessState.TERMINATED)
                    .findFirst().orElse(null);
                if (target == null) return false;
                if (target.getMessageBuffer() == null) target.setMessageBuffer(new ArrayList<>());
                target.getMessageBuffer().add(message);
                addInterruptLog("IPC", "PID:" + fromPid + " → " + target.getName() + " 发送消息: " + message);
                // 若对方正在 BLOCKED 等消息，唤醒它
                if (target.isWaitingForMessage() && target.getState() == ProcessState.BLOCKED) {
                    target.setWaitingForMessage(false);
                    target.setState(ProcessState.READY);
                    target.setBlockedReason(null);
                    blockedQueue.remove(target);
                    addToQueue(target, 1); // 唤醒后进 Q1
                    queueEntryTime.put(target.getPid(), clockTick);
                    addInterruptLog("WAKEUP", target.getName() + " 收到消息被唤醒 → Q1");
                    eventService.info("IPC", target.getName() + " 收到消息被唤醒", target.getPid(), target.getName());
                    return true;
                }
                return false;
            }

            @Override
            public boolean requestPrinter(int pid, String processName) {
                return ioManager.requestExclusiveDevice("PRINTER", pid, processName);
            }

            @Override
            public void releasePrinter(int pid) {
                Integer wokenPid = ioManager.releaseExclusiveDevice("PRINTER", pid);
                if (wokenPid != null) wakeupBlockedProcess(wokenPid, "打印机已释放");
            }
        });
    }

    // ========== MLFQ 三级队列 ==========
    private final List<ProcessControlBlock> q0 = new CopyOnWriteArrayList<>(); // 高优先级
    private final List<ProcessControlBlock> q1 = new CopyOnWriteArrayList<>(); // 中优先级
    private final List<ProcessControlBlock> q2 = new CopyOnWriteArrayList<>(); // 低优先级
    private final List<ProcessControlBlock> blockedQueue = new CopyOnWriteArrayList<>();

    private static final int Q0_QUANTUM = 8;  // Q0时间片
    private static final int Q1_QUANTUM = 10;  // Q1时间片
    private static final int Q2_QUANTUM = 16; // Q2时间片
    private static final int AGING_THRESHOLD = 30; // 老化升级阈值（tick）

    private ProcessControlBlock runningProcess = null;
    private int currentQueueLevel = -1; // 当前运行进程在哪个队列（0/1/2）
    private int clockTick = 0;
    private int timeUsed = 0;
    private boolean paused = false;
    private boolean autoPause = false;
    private boolean stepping = false; // 防止step和定时任务冲突

    // 进入就绪队列的时间戳（用于老化机制）
    private final Map<Integer, Integer> queueEntryTime = new HashMap<>();

    // 缓存的分数（给前端显示用）
    private List<Map<String, Object>> cachedScores = new ArrayList<>();

    private static final String[] COLORS = {
        "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
        "#f43f5e", "#ef4444", "#f97316", "#eab308", "#84cc16",
        "#22c55e", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6"
    };

    // =========================================================================
    //  进程创建
    // =========================================================================

    public synchronized Object[] launchApp(SimulatedApp app) {
        if (app.isSingleInstance() && isAppRunning(app.name())) {
            ProcessControlBlock existing = findRunningByName(app.name());
            if (existing != null) {
                eventService.warning("PROCESS_MGR", "启动失败：" + app.getName() + " 已在运行 (PID:" + existing.getPid() + ")");
                return new Object[]{-1, existing.getPid()};
            }
        }

        String displayName = app.getName();
        if (!app.isSingleInstance()) {
            long count = getAllProcesses().stream()
                .filter(p -> app.name().equals(p.getAppType()) && p.getState() != ProcessState.TERMINATED).count();
            displayName = app.getName() + "(" + (count + 1) + ")";
        }

        int pid = nextPid++;
        String color = COLORS[(pid - 100) % COLORS.length];

        // 分配内存
        boolean memOk = hardwarePool.allocateMemory(app.getMemoryRequired(), pid, displayName);
        if (!memOk) {
            // 内存不足：创建 PCB 进阻塞队列等待内存释放
            eventService.warning("MEMORY_MGR", "内存不足，" + displayName + " (PID:" + pid + ") 进入等待队列");
            ProcessControlBlock waitPcb = new ProcessControlBlock(pid, displayName, 0, app.getPriority(), 0, color);
            waitPcb.setState(ProcessState.BLOCKED);
            waitPcb.setBlockedReason("等待内存(" + app.getMemoryRequired() + "MB)");
            waitPcb.setAppType(app.name());
            waitPcb.setIcon(app.getIcon());
            waitPcb.setMemoryUsage(app.getMemoryRequired());
            waitPcb.setCurrentMemoryUsage(0);
            waitPcb.setDiskRead(app.getDiskRead());
            waitPcb.setDiskWrite(app.getDiskWrite());
            waitPcb.setNetworkSpeed(app.getNetworkSpeed());
            waitPcb.setParentPid(-1);
            waitPcb.setCoreIndex(-1);
            waitPcb.setCodeSegment(app.getCodeSegment());
            waitPcb.resetContext();
            blockedQueue.add(waitPcb);
            processTable.add(waitPcb);
            addInterruptLog("BLOCK", displayName + " (PID:" + pid + ") 内存不足(" + app.getMemoryRequired() + "MB)，进阻塞队列等待");
            return new Object[]{"WAITING_MEMORY", pid};
        }

        ProcessControlBlock pcb = new ProcessControlBlock(pid, displayName, 0, app.getPriority(), 0, color);
        pcb.setState(ProcessState.READY);
        pcb.setAppType(app.name());
        pcb.setIcon(app.getIcon());
        pcb.setMemoryUsage(app.getMemoryRequired());
        pcb.setCurrentMemoryUsage(app.getMemoryRequired());
        pcb.setDiskRead(app.getDiskRead());
        pcb.setDiskWrite(app.getDiskWrite());
        pcb.setNetworkSpeed(app.getNetworkSpeed());
        pcb.setParentPid(-1);
        pcb.setCoreIndex(hardwarePool.allocateCpuCore(pid));
        pcb.setCodeSegment(app.getCodeSegment());
        pcb.resetContext();

        // 根据优先级决定进入哪个队列
        int targetQueue = getQueueForPriority(app.getPriority());
        addToQueue(pcb, targetQueue);
        queueEntryTime.put(pid, clockTick);

        addInterruptLog("ARRIVAL", "进程 " + displayName + " (PID:" + pid + ") 进入Q" + targetQueue
            + " (优先级:" + app.getPriority() + ", 指令:" + app.getInstructionCount() + "条)");

        eventService.info("PROCESS_MGR", "启动进程 " + app.getName() + " (PID:" + pid + "), Q" + targetQueue,
            pid, app.getName());

        // 游戏/音乐自动注册耳机
        if (app.name().equals("CSGO") || app.name().equals("PUBG") || app.name().equals("MUSIC")
            || app.name().equals("VIDEO") || app.name().equals("MINECRAFT")) {
            ioManager.audioPlay(pid, app.getName());
        }

        processTable.add(pcb);
        paused = false; // 新进程到达，自动取消暂停
        refreshScores();

        // 高优先级进程到达时抢占：如果新进程在Q0且当前运行进程不在Q0，抢占
        if (targetQueue == 0 && runningProcess != null && currentQueueLevel > 0) {
            cpuCore.saveContext(runningProcess);
            runningProcess.setState(ProcessState.READY);
            addToQueue(runningProcess, currentQueueLevel);
            queueEntryTime.put(runningProcess.getPid(), clockTick);
            addInterruptLog("PREEMPT", runningProcess.getName() + " 被 " + displayName + " 抢占! (Q" + currentQueueLevel + "→Q0)");
            runningProcess = null;
            currentQueueLevel = -1;
            scheduleNext();
        }

        return new Object[]{pid};
    }

    /**
     * 根据优先级决定初始队列
     * 优先级1-2 → Q0（高），优先级3 → Q1（中），优先级4-5 → Q2（低）
     */
    private int getQueueForPriority(int priority) {
        if (priority <= 2) return 0;
        if (priority <= 4) return 1;
        return 2;
    }

    private void addToQueue(ProcessControlBlock pcb, int level) {
        switch (level) {
            case 0 -> q0.add(pcb);
            case 1 -> q1.add(pcb);
            case 2 -> q2.add(pcb);
        }
    }

    private void removeFromQueue(ProcessControlBlock pcb, int level) {
        switch (level) {
            case 0 -> q0.remove(pcb);
            case 1 -> q1.remove(pcb);
            case 2 -> q2.remove(pcb);
        }
    }

    // =========================================================================
    //  时钟中断 + MLFQ调度
    // =========================================================================

    /** 单步专用：不受paused状态限制，执行一个tick后保持paused */
    public synchronized void tickForced() {
        paused = false;
        tick();
        paused = true;
    }

    public synchronized void tick() {
        if (paused) return;

        clockTick++;

        // 1. 老化机制
        try { checkAging(); } catch (Exception e) { addInterruptLog("ERROR", "老化检查异常: " + e.getMessage()); }

        // 2. 确保有运行进程
        if (runningProcess == null || runningProcess.getState() != ProcessState.RUNNING) {
            scheduleNext();
        }

        // 3. 如果有运行进程
        if (runningProcess != null && runningProcess.getState() == ProcessState.RUNNING) {
            int quantum = getQuantum(currentQueueLevel);

            // 3a. 检查时间片是否到期（桌面模式用HALT结束，不依赖remainingTime）
            boolean hasMoreCode = runningProcess.getCodeSegment() != null
                && runningProcess.getProgramCounter() < runningProcess.getCodeSegment().length;
            if (timeUsed >= quantum && hasMoreCode) {
                // 时间片到期 → 降级
                addInterruptLog("TIMEOUT", runningProcess.getName() + " Q" + currentQueueLevel + "时间片" + quantum + "tick用完, 剩余" + runningProcess.getRemainingTime() + "条");
                cpuCore.saveContext(runningProcess);
                runningProcess.setState(ProcessState.READY);
                int newLevel = Math.min(currentQueueLevel + 1, 2);
                addToQueue(runningProcess, newLevel);
                queueEntryTime.put(runningProcess.getPid(), clockTick);
                runningProcess = null;
                currentQueueLevel = -1;
                timeUsed = 0;
                // 立即调度下一个进程
                scheduleNext();
            }

            // 3b. 执行一条指令（新调度的进程或未超时的进程）
            if (runningProcess != null && runningProcess.getState() == ProcessState.RUNNING) {
                try {
                    // 恢复上下文
                    if (cpuCore.isIdle() || cpuCore.getCurrentPid() != runningProcess.getPid()) {
                        cpuCore.restoreContext(runningProcess);
                        runningProcess.setContextSwitchCount(runningProcess.getContextSwitchCount() + 1);
                    }
                    // 执行
                    InstructionResult result = cpuCore.executeStep(runningProcess);
                    runningProcess.setTotalCpuTimeUsed(runningProcess.getTotalCpuTimeUsed() + 1);
                    timeUsed++;

                    switch (result.getStatus()) {
                        case HALT -> completeProcess(runningProcess);
                        case BLOCKED_IPC -> blockProcess(runningProcess, "等待IPC消息");
                        case BLOCKED_IO -> blockProcess(runningProcess, "等待I/O");
                        case BLOCKED_PRINTER -> blockProcess(runningProcess, "等待打印机");
                        default -> { }
                    }
                } catch (Exception e) {
                    addInterruptLog("ERROR", "执行异常: " + e.getMessage());
                    completeProcess(runningProcess);
                }
            }
        }

        // 4. 刷新分数
        refreshScores();

        // 5. 自动暂停
        if (autoPause) paused = true;
    }

    /**
     * 获取当前队列的时间片
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
     * MLFQ调度：从最高非空队列选队首进程
     */
    private void scheduleNext() {
        ProcessControlBlock next = null;
        int nextLevel = -1;

        // 按优先级从高到低找
        if (!q0.isEmpty()) { next = q0.remove(0); nextLevel = 0; }
        else if (!q1.isEmpty()) { next = q1.remove(0); nextLevel = 1; }
        else if (!q2.isEmpty()) { next = q2.remove(0); nextLevel = 2; }

        if (next == null) {
            runningProcess = null;
            currentQueueLevel = -1;
            hardwarePool.freeAllCpuCores(0);
            return;
        }

        next.setState(ProcessState.RUNNING);
        queueEntryTime.remove(next.getPid());
        runningProcess = next;
        currentQueueLevel = nextLevel;
        timeUsed = 0;

        cpuCore.restoreContext(runningProcess);

        int quantum = getQuantum(nextLevel);
        addInterruptLog("SCHEDULE", "MLFQ → " + next.getName() + " (PID:" + next.getPid()
            + ") 从Q" + nextLevel + "上CPU, 时间片:" + quantum + "tick"
            + ", 剩余指令:" + (next.getCodeSegment() != null ? next.getCodeSegment().length - next.getProgramCounter() : "?"));
    }

    /**
     * 老化机制：在低队列等待超过阈值的进程升级
     */
    private void checkAging() {
        // Q2中的进程如果等待太久，升级到Q1
        Iterator<ProcessControlBlock> it2 = q2.iterator();
        while (it2.hasNext()) {
            ProcessControlBlock p = it2.next();
            Integer entryTime = queueEntryTime.get(p.getPid());
            if (entryTime != null && (clockTick - entryTime) >= AGING_THRESHOLD) {
                it2.remove();
                q1.add(p);
                queueEntryTime.put(p.getPid(), clockTick);
                addInterruptLog("AGING", p.getName() + " 在Q2等待" + (clockTick - entryTime) + "tick, 老化升级到Q1");
            }
        }

        // Q1中的进程如果等待太久，升级到Q0
        Iterator<ProcessControlBlock> it1 = q1.iterator();
        while (it1.hasNext()) {
            ProcessControlBlock p = it1.next();
            Integer entryTime = queueEntryTime.get(p.getPid());
            if (entryTime != null && (clockTick - entryTime) >= AGING_THRESHOLD) {
                it1.remove();
                q0.add(p);
                queueEntryTime.put(p.getPid(), clockTick);
                addInterruptLog("AGING", p.getName() + " 在Q1等待" + (clockTick - entryTime) + "tick, 老化升级到Q0");
            }
        }
    }

    // =========================================================================
    //  进程完成/阻塞
    // =========================================================================

    private void completeProcess(ProcessControlBlock p) {
        cpuCore.saveContext(p);
        p.setState(ProcessState.TERMINATED);
        hardwarePool.freeAllCpuCores(p.getPid());
        hardwarePool.freeMemory(p.getPid());
        ioManager.audioStop(p.getPid());
        // 释放打印机并唤醒等待者
        Integer printerWoken = ioManager.releaseExclusiveDevice("PRINTER", p.getPid());
        if (printerWoken != null) wakeupBlockedProcess(printerWoken, "打印机已释放（" + p.getName() + " 终止）");
        ioManager.releaseExclusiveDevice("USB_DISK", p.getPid());
        processTable.remove(p);
        queueEntryTime.remove(p.getPid());
        addInterruptLog("TERMINATED", p.getName() + " (PID:" + p.getPid() + ") 执行完毕, PC=" + p.getProgramCounter());
        runningProcess = null;
        currentQueueLevel = -1;
        timeUsed = 0;
        // 内存释放后尝试唤醒等待内存的进程
        tryWakeupMemoryWaiters();
    }

    /** 内存释放后，按内存需求从小到大尝试唤醒等待内存的进程 */
    private void tryWakeupMemoryWaiters() {
        List<ProcessControlBlock> waiters = blockedQueue.stream()
            .filter(p -> p.getBlockedReason() != null && p.getBlockedReason().startsWith("等待内存"))
            .sorted(Comparator.comparingInt(ProcessControlBlock::getMemoryUsage))
            .toList();
        for (ProcessControlBlock waiter : waiters) {
            boolean memOk = hardwarePool.allocateMemory(waiter.getMemoryUsage(), waiter.getPid(), waiter.getName());
            if (memOk) {
                waiter.setCurrentMemoryUsage(waiter.getMemoryUsage());
                waiter.setCoreIndex(hardwarePool.allocateCpuCore(waiter.getPid()));
                blockedQueue.remove(waiter);
                waiter.setState(ProcessState.READY);
                waiter.setBlockedReason(null);
                int targetQueue = getQueueForPriority(waiter.getPriority());
                addToQueue(waiter, targetQueue);
                queueEntryTime.put(waiter.getPid(), clockTick);
                addInterruptLog("WAKEUP", waiter.getName() + " (PID:" + waiter.getPid() + ") 内存就绪，唤醒进Q" + targetQueue);
                eventService.info("MEMORY_MGR", waiter.getName() + " 获得内存被唤醒", waiter.getPid(), waiter.getName());
            }
        }
    }

    /** 将 blockedQueue 中指定 PID 的进程唤醒回 Q1 */
    private void wakeupBlockedProcess(int pid, String reason) {
        ProcessControlBlock target = blockedQueue.stream()
            .filter(p -> p.getPid() == pid).findFirst().orElse(null);
        if (target == null) return;
        blockedQueue.remove(target);
        target.setState(ProcessState.READY);
        target.setBlockedReason(null);
        addToQueue(target, 1);
        queueEntryTime.put(pid, clockTick);
        addInterruptLog("WAKEUP", target.getName() + " 被唤醒: " + reason + " → Q1");
        eventService.info("DEVICE", target.getName() + " 获得打印机被唤醒", pid, target.getName());
    }

    private void blockProcess(ProcessControlBlock p, String reason) {
        cpuCore.saveContext(p);
        p.setState(ProcessState.BLOCKED);
        p.setBlockedReason(reason);
        hardwarePool.freeAllCpuCores(p.getPid());
        removeFromQueue(p, currentQueueLevel);
        blockedQueue.add(p);
        addInterruptLog("BLOCK", p.getName() + " 阻塞: " + reason);
        runningProcess = null;
        currentQueueLevel = -1;
        timeUsed = 0;
    }

    // =========================================================================
    //  进程管理
    // =========================================================================

    private final List<ProcessControlBlock> processTable = new CopyOnWriteArrayList<>();
    private int nextPid = 100;

    public synchronized boolean killProcess(int pid) {
        ProcessControlBlock pcb = findProcess(pid);
        if (pcb == null) return false;

        q0.remove(pcb); q1.remove(pcb); q2.remove(pcb); blockedQueue.remove(pcb);
        queueEntryTime.remove(pid);
        if (runningProcess == pcb) { cpuCore.saveContext(pcb); runningProcess = null; currentQueueLevel = -1; timeUsed = 0; }

        hardwarePool.freeMemory(pid);
        hardwarePool.freeAllCpuCores(pid);
        processTable.remove(pcb);
        ioManager.audioStop(pid);
        ioManager.releaseExclusiveDevice("PRINTER", pid);
        ioManager.releaseExclusiveDevice("USB_DISK", pid);
        pcb.setState(ProcessState.TERMINATED);
        addInterruptLog("KILL", pcb.getName() + " (PID:" + pid + ") 被终止");
        tryWakeupMemoryWaiters();
        return true;
    }

    public synchronized boolean suspendProcess(int pid) {
        ProcessControlBlock pcb = findProcess(pid);
        if (pcb == null) return false;
        if (pcb.getState() == ProcessState.RUNNING) {
            cpuCore.saveContext(pcb);
            pcb.setState(ProcessState.BLOCKED); pcb.setBlockedReason("手动挂起");
            removeFromQueue(pcb, currentQueueLevel); blockedQueue.add(pcb);
            if (runningProcess == pcb) { runningProcess = null; currentQueueLevel = -1; timeUsed = 0; }
        } else if (pcb.getState() == ProcessState.READY) {
            pcb.setState(ProcessState.BLOCKED); pcb.setBlockedReason("手动挂起");
            q0.remove(pcb); q1.remove(pcb); q2.remove(pcb); blockedQueue.add(pcb);
        } else return false;
        addInterruptLog("SUSPEND", pcb.getName() + " 被挂起");
        return true;
    }

    public synchronized boolean resumeProcess(int pid) {
        ProcessControlBlock pcb = findProcess(pid);
        if (pcb == null || pcb.getState() != ProcessState.BLOCKED) return false;
        pcb.setState(ProcessState.READY); pcb.setBlockedReason(null);
        blockedQueue.remove(pcb);
        addToQueue(pcb, 2); // 恢复后默认进Q2
        queueEntryTime.put(pid, clockTick);
        addInterruptLog("RESUME", pcb.getName() + " 恢复到Q2");
        return true;
    }

    // =========================================================================
    //  辅助方法
    // =========================================================================

    private boolean isAppRunning(String appName) {
        return processTable.stream().anyMatch(p -> appName.equals(p.getAppType()) && p.getState() != ProcessState.TERMINATED);
    }
    private ProcessControlBlock findRunningByName(String name) {
        return processTable.stream().filter(p -> name.equals(p.getAppType()) && p.getState() != ProcessState.TERMINATED).findFirst().orElse(null);
    }
    public List<ProcessControlBlock> getAllProcesses() { return new ArrayList<>(processTable); }
    public ProcessControlBlock findProcess(int pid) { return processTable.stream().filter(p -> p.getPid() == pid).findFirst().orElse(null); }
    public ProcessControlBlock getRunningProcess() { return runningProcess; }
    public List<ProcessControlBlock> getBlockedQueue() { return blockedQueue; }
    public List<ProcessControlBlock> getQ0() { return q0; }
    public List<ProcessControlBlock> getQ1() { return q1; }
    public List<ProcessControlBlock> getQ2() { return q2; }
    public int getClockTick() { return clockTick; }
    public boolean isPaused() { return paused; }
    public void setPaused(boolean p) { paused = p; }
    public void setStepping(boolean s) { stepping = s; }
    public boolean isAutoPause() { return autoPause; }
    public boolean togglePause() { paused = !paused; return paused; }
    public boolean toggleAutoPause() { autoPause = !autoPause; if (autoPause) paused = true; return autoPause; }
    public CpuCore getCpuCore() { return cpuCore; }

    public int getCurrentQueueLevel() { return currentQueueLevel; }

    /**
     * 获取调度状态（给前端显示队列）
     */
    public List<ProcessControlBlock> getReadyQueue() {
        // 返回所有就绪队列的合并（用于兼容旧前端）
        List<ProcessControlBlock> all = new ArrayList<>();
        all.addAll(q0); all.addAll(q1); all.addAll(q2);
        return all;
    }

    private void addInterruptLog(String type, String desc) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("tick", clockTick);
        entry.put("type", type);
        entry.put("description", desc);
        interruptLog.add(entry);
        if (interruptLog.size() > 200) interruptLog.remove(0);
    }
    private final List<Map<String, Object>> interruptLog = new ArrayList<>();
    public List<Map<String, Object>> getInterruptLog() { return interruptLog; }

    // =========================================================================
    //  前端显示用：分数（MLFQ不需要分数，但前端需要数据）
    // =========================================================================

    public List<Map<String, Object>> getAllMaawsScores() { return cachedScores; }

    private void refreshScores() {
        List<Map<String, Object>> scores = new ArrayList<>();
        List<ProcessControlBlock> all = new ArrayList<>();
        all.addAll(q0); all.addAll(q1); all.addAll(q2);
        if (runningProcess != null && !all.contains(runningProcess)) all.add(runningProcess);

        for (ProcessControlBlock p : all) {
            if (p.getState() == ProcessState.TERMINATED) continue;
            int level = (runningProcess != null && runningProcess.getPid() == p.getPid())
                ? currentQueueLevel : (q0.contains(p) ? 0 : q1.contains(p) ? 1 : 2);
            int quantum = getQuantum(level);
            Integer entryTime = queueEntryTime.get(p.getPid());
            int waitTicks = entryTime != null ? (clockTick - entryTime) : 0;
            int totalInstr = p.getCodeSegment() != null ? p.getCodeSegment().length : 0;
            int remaining = Math.max(totalInstr - p.getProgramCounter(), 0);

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("pid", p.getPid());
            item.put("name", p.getName());
            item.put("state", p.getState().name());
            item.put("queueLevel", level);
            item.put("quantum", quantum);
            item.put("timeUsed", runningProcess == p ? timeUsed : 0);
            item.put("waitTicks", waitTicks);
            item.put("totalInstructions", totalInstr);
            item.put("remainingInstructions", remaining);
            item.put("priority", p.getPriority());
            item.put("isRunning", runningProcess != null && runningProcess.getPid() == p.getPid());
            // 兼容前端旧字段
            item.put("score", (double) level);
            item.put("priorityScore", (double) p.getPriority());
            item.put("waitScore", (double) waitTicks);
            item.put("instrScore", (double) remaining);
            scores.add(item);
        }
        cachedScores = scores;
    }

    public List<Map<String, Object>> getProcessTree() {
        List<Map<String, Object>> tree = new ArrayList<>();
        List<ProcessControlBlock> roots = processTable.stream()
            .filter(p -> p.getParentPid() <= 0).toList();
        for (ProcessControlBlock root : roots) {
            Map<String, Object> node = new LinkedHashMap<>();
            node.put("pid", root.getPid()); node.put("name", root.getName());
            node.put("state", root.getState().name()); node.put("color", root.getColor());
            node.put("parentPid", root.getParentPid());
            List<Map<String, Object>> children = new ArrayList<>();
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

    public List<ProcessControlBlock> searchProcesses(String keyword) {
        if (keyword == null || keyword.isEmpty()) return getAllProcesses();
        String lower = keyword.toLowerCase();
        return processTable.stream()
            .filter(p -> (p.getName() != null && p.getName().toLowerCase().contains(lower))
                || (p.getAppType() != null && p.getAppType().toLowerCase().contains(lower))
                || String.valueOf(p.getPid()).contains(lower))
            .toList();
    }

    public void clearAll() {
        for (ProcessControlBlock pcb : processTable) {
            hardwarePool.freeMemory(pcb.getPid());
            hardwarePool.freeAllCpuCores(pcb.getPid());
            ioManager.audioStop(pcb.getPid());
            ioManager.releaseExclusiveDevice("PRINTER", pcb.getPid());
            ioManager.releaseExclusiveDevice("USB_DISK", pcb.getPid());
        }
        processTable.clear(); q0.clear(); q1.clear(); q2.clear(); blockedQueue.clear();
        runningProcess = null; currentQueueLevel = -1; clockTick = 0; timeUsed = 0;
        paused = false; autoPause = false;
        interruptLog.clear(); queueEntryTime.clear(); cachedScores.clear();
    }
}
