package com.processos.process;

import com.processos.hardware.HardwarePool;
import com.processos.hardware.IoManager;
import com.processos.model.ProcessControlBlock;
import com.processos.model.ProcessState;
import com.processos.model.SimulatedApp;
import com.processos.service.SystemEventService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

/**
 * 进程管理器 - 沙盒模式的内核核心
 * 管理桌面应用的进程生命周期
 */
@Component
public class ProcessManager {

    @Autowired
    private HardwarePool hardwarePool;

    @Autowired
    private SystemEventService eventService;

    @Autowired
    private IoManager ioManager;

    // 活跃进程表（Active Process Table）
    private final List<ProcessControlBlock> processTable = new CopyOnWriteArrayList<>();
    private int nextPid = 100;  // 沙盒进程从 PID 100 开始

    private static final String[] COLORS = {
        "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
        "#f43f5e", "#ef4444", "#f97316", "#eab308", "#84cc16",
        "#22c55e", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6"
    };

    // 子进程模拟配置（主进程启动后自动 fork 的子进程）
    private static final Map<String, String[]> CHILD_PROCESSES = Map.of(
        "CSGO", new String[]{"反作弊", "渲染引擎", "音频服务"},
        "PUBG", new String[]{"反外挂", "渲染引擎", "网络服务"},
        "CHROME", new String[]{"GPU进程", "标签页: 新标签", "扩展进程"},
        "FIREFOX", new String[]{"内容进程", "GPU进程", "扩展进程"},
        "VSCODE", new String[]{"扩展宿主", "终端进程", "语法服务器"},
        "MINECRAFT", new String[]{"渲染线程", "音频线程", "网络线程"},
        "DOWNLOAD", new String[]{"下载线程", "校验线程"},
        "ANTIVIRUS", new String[]{"实时监控", "病毒库更新"},
        "UPDATE", new String[]{"下载模块", "安装模块"}
    );

    // 子进程资源占用比例（相对于主进程）
    private static final float[] CHILD_CPU_RATIO = {0.05f, 0.15f, 0.03f};
    private static final float[] CHILD_MEM_RATIO = {0.02f, 0.10f, 0.01f};

    /**
     * 检查是否存在同名进程（单实例检测）
     */
    public boolean isAppRunning(String appName) {
        return processTable.stream()
            .anyMatch(p -> p.getAppType() != null && p.getAppType().equals(appName)
                && p.getState() != ProcessState.TERMINATED);
    }

    /**
     * 启动应用 - 创建进程并分配资源（含单实例检测 + 自动 fork 子进程）
     * @return 第一个进程的 PID，-1 表示已运行，null 表示资源不足
     */
    public synchronized Object[] launchApp(SimulatedApp app) {
        // 单实例检测（只有 singleInstance=true 的应用才检测）
        if (app.isSingleInstance() && isAppRunning(app.name())) {
            ProcessControlBlock existing = processTable.stream()
                .filter(p -> p.getAppType() != null && p.getAppType().equals(app.name())
                    && p.getState() != ProcessState.TERMINATED)
                .findFirst().orElse(null);
            if (existing != null) {
                eventService.warning("PROCESS_MGR",
                    "启动失败：" + app.getName() + " 已在运行 (PID: " + existing.getPid() + ")，单实例限制");
                return new Object[]{-1, existing.getPid()};
            }
        }

        // 非单实例应用加编号（Word(1)、Word(2)）
        String displayName = app.getName();
        if (!app.isSingleInstance()) {
            long count = processTable.stream()
                .filter(p -> p.getAppType() != null && p.getAppType().equals(app.name())
                    && p.getState() != ProcessState.TERMINATED)
                .count();
            displayName = app.getName() + "(" + (count + 1) + ")";
        }

        // 创建主进程
        ProcessControlBlock mainProcess = createProcessInternal(app, 0, null, displayName);
        if (mainProcess == null) {
            eventService.error("MEMORY_MGR",
                "启动失败：" + app.getName() + "，系统内存不足 (需要 " + app.getMemoryRequired() + "MB)");
            return null;
        }

        // 自动 fork 子进程
        String[] childNames = CHILD_PROCESSES.get(app.name());
        int childCount = 0;
        if (childNames != null) {
            for (int i = 0; i < childNames.length; i++) {
                ProcessControlBlock child = createChildProcess(childNames[i], app, mainProcess.getPid(), i);
                if (child != null) childCount++;
            }
        }

        eventService.info("PROCESS_MGR",
            "启动进程 " + app.getName() + " (PID: " + mainProcess.getPid() + "), 分配内存 " + app.getMemoryRequired() + "MB" +
            (childCount > 0 ? ", 自动创建 " + childCount + " 个子进程" : ""),
            mainProcess.getPid(), app.getName());

        // 游戏类和音乐类应用自动注册耳机（共享设备）
        if (app.name().equals("CSGO") || app.name().equals("PUBG") || app.name().equals("MUSIC")
            || app.name().equals("VIDEO") || app.name().equals("MINECRAFT")) {
            ioManager.audioPlay(mainProcess.getPid(), app.getName());
        }

        return new Object[]{mainProcess.getPid()};
    }

    /**
     * 创建子进程
     */
    private ProcessControlBlock createChildProcess(String childName, SimulatedApp parentApp,
                                                    int parentPid, int childIndex) {
        int pid = nextPid++;
        String parentColor = findProcess(parentPid) != null ? findProcess(parentPid).getColor() : "#6366f1";

        // 子进程资源 = 主进程比例
        float cpuRatio = childIndex < CHILD_CPU_RATIO.length ? CHILD_CPU_RATIO[childIndex] : 0.05f;
        float memRatio = childIndex < CHILD_MEM_RATIO.length ? CHILD_MEM_RATIO[childIndex] : 0.02f;
        int childMem = Math.max(16, (int)(parentApp.getMemoryRequired() * memRatio));
        double childCpu = Math.max(0.5, parentApp.getCpuBaseUsage() * cpuRatio);

        boolean memOk = hardwarePool.allocateMemory(childMem, pid, childName);
        if (!memOk) return null;

        ProcessControlBlock pcb = new ProcessControlBlock(pid, childName, 0, 3, 0, parentColor);
        pcb.setState(ProcessState.RUNNING);
        pcb.setAppType(parentApp.name());
        pcb.setIcon(parentApp.getIcon());
        pcb.setBaseCpuUsage(childCpu);
        pcb.setCpuUsage(childCpu);
        pcb.setMemoryUsage(childMem);
        pcb.setCurrentMemoryUsage(childMem);
        pcb.setDiskRead((int)(parentApp.getDiskRead() * cpuRatio));
        pcb.setDiskWrite((int)(parentApp.getDiskWrite() * cpuRatio));
        pcb.setNetworkSpeed((int)(parentApp.getNetworkSpeed() * cpuRatio));
        pcb.setParentPid(parentPid);
        pcb.setCoreIndex(hardwarePool.allocateCpuCore(pid));

        processTable.add(pcb);
        return pcb;
    }

    /**
     * 内部创建进程
     */
    private ProcessControlBlock createProcessInternal(SimulatedApp app, int parentPid, String color) {
        return createProcessInternal(app, parentPid, color, app.getName());
    }

    private ProcessControlBlock createProcessInternal(SimulatedApp app, int parentPid, String color, String displayName) {
        int pid = nextPid++;
        if (color == null) {
            color = COLORS[(pid - 100) % COLORS.length];
        }

        boolean memOk = hardwarePool.allocateMemory(app.getMemoryRequired(), pid, displayName);
        if (!memOk) return null;

        int coreIndex = hardwarePool.allocateCpuCore(pid);

        ProcessControlBlock pcb = new ProcessControlBlock(pid, displayName, 0, 3, 0, color);
        pcb.setState(ProcessState.RUNNING);
        pcb.setAppType(app.name());
        pcb.setIcon(app.getIcon());
        pcb.setBaseCpuUsage(app.getCpuBaseUsage());
        pcb.setCpuUsage(app.getCpuBaseUsage());
        pcb.setMemoryUsage(app.getMemoryRequired());
        pcb.setCurrentMemoryUsage(app.getMemoryRequired());
        pcb.setDiskRead(app.getDiskRead());
        pcb.setDiskWrite(app.getDiskWrite());
        pcb.setNetworkSpeed(app.getNetworkSpeed());
        pcb.setParentPid(parentPid);
        pcb.setCoreIndex(coreIndex);

        processTable.add(pcb);
        return pcb;
    }

    /**
     * 结束进程及其所有子进程
     */
    public synchronized boolean killProcess(int pid) {
        ProcessControlBlock pcb = findProcess(pid);
        if (pcb == null) return false;

        int freedMem = pcb.getCurrentMemoryUsage();

        // 找到所有子进程并一起结束
        List<ProcessControlBlock> children = processTable.stream()
            .filter(p -> p.getParentPid() == pid)
            .collect(Collectors.toList());

        for (ProcessControlBlock child : children) {
            freedMem += child.getCurrentMemoryUsage();
            hardwarePool.freeMemory(child.getPid());
            hardwarePool.freeAllCpuCores(child.getPid());
            processTable.remove(child);
        }

        // 结束自身
        hardwarePool.freeMemory(pid);
        hardwarePool.freeAllCpuCores(pid);
        processTable.remove(pcb);

        // 释放所有设备：耳机 + 独占设备
        ioManager.audioStop(pid);
        ioManager.releaseExclusiveDevice("PRINTER", pid);
        ioManager.releaseExclusiveDevice("USB_DISK", pid);

        eventService.warning("PROCESS_MGR",
            "进程 " + pcb.getName() + " (PID: " + pid + ") 被终止, 回收内存 " + freedMem + "MB" +
            (children.size() > 0 ? ", 连带终止 " + children.size() + " 个子进程" : ""),
            pid, pcb.getName());
        return true;
    }

    /**
     * 挂起进程
     */
    public synchronized boolean suspendProcess(int pid) {
        ProcessControlBlock pcb = findProcess(pid);
        if (pcb == null || pcb.getState() != ProcessState.RUNNING) return false;
        pcb.setState(ProcessState.BLOCKED);
        hardwarePool.freeAllCpuCores(pid);
        eventService.warning("PROCESS_MGR",
            "进程 " + pcb.getName() + " (PID: " + pid + ") 被挂起, 进入 BLOCKED 状态",
            pid, pcb.getName());
        return true;
    }

    /**
     * 恢复进程
     */
    public synchronized boolean resumeProcess(int pid) {
        ProcessControlBlock pcb = findProcess(pid);
        if (pcb == null || pcb.getState() != ProcessState.BLOCKED) return false;
        pcb.setState(ProcessState.RUNNING);
        int coreIndex = hardwarePool.allocateCpuCore(pid);
        pcb.setCoreIndex(coreIndex);
        eventService.success("PROCESS_MGR",
            "进程 " + pcb.getName() + " (PID: " + pid + ") 已恢复运行",
            pid, pcb.getName());
        return true;
    }

    /**
     * 更新所有进程的资源使用（抖动模拟）
     */
    public synchronized void updateResourceUsage() {
        for (ProcessControlBlock pcb : processTable) {
            if (pcb.getState() == ProcessState.RUNNING) {
                double base = pcb.getBaseCpuUsage();
                double jitter = (Math.random() - 0.5) * 10;
                double newUsage = Math.max(1, Math.min(100, base + jitter));
                pcb.setCpuUsage(Math.round(newUsage * 10.0) / 10.0);

                int memBase = pcb.getMemoryUsage();
                int memJitter = (int) ((Math.random() - 0.5) * memBase * 0.05);
                pcb.setCurrentMemoryUsage(Math.max(1, memBase + memJitter));
            }
        }
    }

    /**
     * 获取进程树结构
     * 返回根进程列表，每个根进程包含 children 子列表
     */
    public List<Map<String, Object>> getProcessTree() {
        List<ProcessControlBlock> all = new ArrayList<>(processTable);

        // 找出所有根进程（parentPid == -1 或 parentPid == 0）
        List<ProcessControlBlock> roots = all.stream()
            .filter(p -> p.getParentPid() <= 0)
            .collect(Collectors.toList());

        List<Map<String, Object>> tree = new ArrayList<>();
        for (ProcessControlBlock root : roots) {
            Map<String, Object> node = pcbToMap(root);
            List<Map<String, Object>> children = all.stream()
                .filter(p -> p.getParentPid() == root.getPid())
                .map(this::pcbToMap)
                .collect(Collectors.toList());
            node.put("children", children);
            tree.add(node);
        }
        return tree;
    }

    /**
     * 搜索进程（按名称模糊匹配）
     */
    public List<ProcessControlBlock> searchProcesses(String keyword) {
        if (keyword == null || keyword.isEmpty()) return getAllProcesses();
        String lower = keyword.toLowerCase();
        return processTable.stream()
            .filter(p -> (p.getName() != null && p.getName().toLowerCase().contains(lower))
                || (p.getAppType() != null && p.getAppType().toLowerCase().contains(lower))
                || String.valueOf(p.getPid()).contains(lower))
            .collect(Collectors.toList());
    }

    private Map<String, Object> pcbToMap(ProcessControlBlock p) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("pid", p.getPid());
        map.put("name", p.getName());
        map.put("icon", p.getIcon());
        map.put("state", p.getState().name());
        map.put("cpuUsage", p.getCpuUsage());
        map.put("currentMemoryUsage", p.getCurrentMemoryUsage());
        map.put("color", p.getColor());
        map.put("parentPid", p.getParentPid());
        map.put("appType", p.getAppType());
        return map;
    }

    public List<ProcessControlBlock> getAllProcesses() {
        return new ArrayList<>(processTable);
    }

    public ProcessControlBlock findProcess(int pid) {
        return processTable.stream().filter(p -> p.getPid() == pid).findFirst().orElse(null);
    }

    public int getProcessCount() { return processTable.size(); }

    public int getRunningCount() {
        return (int) processTable.stream().filter(p -> p.getState() == ProcessState.RUNNING).count();
    }

    public synchronized void clearAll() {
        for (ProcessControlBlock pcb : processTable) {
            hardwarePool.freeMemory(pcb.getPid());
            hardwarePool.freeAllCpuCores(pcb.getPid());
            // 释放所有 I/O 设备
            ioManager.audioStop(pcb.getPid());
            ioManager.releaseExclusiveDevice("PRINTER", pcb.getPid());
            ioManager.releaseExclusiveDevice("USB_DISK", pcb.getPid());
        }
        processTable.clear();
    }
}
