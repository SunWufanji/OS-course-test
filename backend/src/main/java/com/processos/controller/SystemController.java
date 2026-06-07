package com.processos.controller;

import com.processos.hardware.HardwarePool;
import com.processos.model.ProcessControlBlock;
import com.processos.model.SimulatedApp;
import com.processos.process.ProcessManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 系统管理 API - 沙盒模式，沙盒核心：启动/结束/挂起/恢复进程，暂停单步，系统状态
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class SystemController {

    @Autowired
    private ProcessManager processManager;

    @Autowired
    private HardwarePool hardwarePool;

    @GetMapping("/system/status")
    public HardwarePool.SystemStatus getSystemStatus() {
        return hardwarePool.getStatus();
    }

    @GetMapping("/system/apps")
    public List<Map<String, Object>> getAvailableApps() {
        return java.util.Arrays.stream(SimulatedApp.values())
            .map(app -> {
                Map<String, Object> info = new HashMap<>();
                info.put("id", app.name());
                info.put("name", app.getName());
                info.put("icon", app.getIcon());
                info.put("cpuUsage", app.getCpuBaseUsage());
                info.put("memoryRequired", app.getMemoryRequired());
                return info;
            })
            .toList();
    }

    /**
     * 启动应用（含单实例检测 + 自动 fork 子进程）
     */
    @PostMapping("/process/launch")
    public Map<String, Object> launchApp(@RequestBody Map<String, String> request) {
        String appName = request.get("appName");
        SimulatedApp app = SimulatedApp.findByName(appName);

        Map<String, Object> result = new HashMap<>();
        if (app == null) {
            result.put("success", false);
            result.put("error", "未知应用: " + appName);
            return result;
        }

        Object[] launchResult = processManager.launchApp(app);
        if (launchResult == null) {
            result.put("success", false);
            result.put("error", "内存不足，无法启动 " + app.getName());
            return result;
        }

        // launchResult[0] 可能是 Integer(pid), -1(已运行), 或 String("WAITING_MEMORY")
        Object first = launchResult[0];
        if ("WAITING_MEMORY".equals(first)) {
            int waitPid = (int) launchResult[1];
            result.put("success", true);
            result.put("waitingMemory", true);
            result.put("pid", waitPid);
            result.put("message", app.getName() + " 内存不足，已进入阻塞队列等待（PID:" + waitPid + "）");
            result.put("process", processManager.findProcess(waitPid));
            return result;
        }

        int pid = (int) first;
        if (pid == -1) {
            // 已运行，返回现有进程PID供前端激活窗口
            int existingPid = (int) launchResult[1];
            result.put("success", false);
            result.put("alreadyRunning", true);
            result.put("existingPid", existingPid);
            result.put("error", app.getName() + " 已在运行中");
            return result;
        }

        result.put("success", true);
        result.put("pid", pid);
        result.put("process", processManager.findProcess(pid));
        return result;
    }

    @PostMapping("/process/{pid}/terminate")
    public Map<String, Object> terminateProcess(@PathVariable int pid) {
        Map<String, Object> result = new HashMap<>();
        result.put("success", processManager.killProcess(pid));
        return result;
    }

    @PostMapping("/process/{pid}/suspend")
    public Map<String, Boolean> suspendProcess(@PathVariable int pid) {
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", processManager.suspendProcess(pid));
        return result;
    }

    @PostMapping("/process/{pid}/resume")
    public Map<String, Boolean> resumeProcess(@PathVariable int pid) {
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", processManager.resumeProcess(pid));
        return result;
    }

    @GetMapping("/process/sandbox")
    public List<ProcessControlBlock> getSandboxProcesses() {
        return processManager.getAllProcesses();
    }

    /**
     * 获取进程树结构
     */
    @GetMapping("/process/tree")
    public List<Map<String, Object>> getProcessTree() {
        return processManager.getProcessTree();
    }

    /**
     * 搜索进程
     */
    @GetMapping("/process/search")
    public List<ProcessControlBlock> searchProcesses(@RequestParam String q) {
        return processManager.searchProcesses(q);
    }

    @PostMapping("/system/reset")
    public Map<String, Boolean> resetSandbox() {
        processManager.clearAll();
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", true);
        return result;
    }

    /**
     * 获取CPU寄存器快照
     */
    @GetMapping("/system/registers")
    public Map<String, Object> getCpuRegisters() {
        return processManager.getCpuCore().getRegisterSnapshot();
    }

    /**
     * 获取所有进程的MAAWS调度分数
     */
    @GetMapping("/system/maaws-scores")
    public List<Map<String, Object>> getMaawsScores() {
        return processManager.getAllMaawsScores();
    }

    /**
     * 获取中断日志
     */
    @GetMapping("/system/interrupt-log")
    public List<Map<String, Object>> getInterruptLog() {
        return processManager.getInterruptLog();
    }

    /**
     * 获取调度队列状态（就绪队列、阻塞队列、运行进程）
     */
    @GetMapping("/system/scheduler")
    public Map<String, Object> getSchedulerState() {
        Map<String, Object> result = new HashMap<>();
        result.put("runningProcess", processManager.getRunningProcess());
        result.put("readyQueue", processManager.getReadyQueue());
        result.put("blockedQueue", processManager.getBlockedQueue());
        result.put("q0", processManager.getQ0());
        result.put("q1", processManager.getQ1());
        result.put("q2", processManager.getQ2());
        result.put("currentQueueLevel", processManager.getCurrentQueueLevel());
        result.put("clockTick", processManager.getClockTick());
        result.put("paused", processManager.isPaused());
        return result;
    }

    /**
     * 暂停/恢复CPU时钟中断
     */
    @PostMapping("/system/pause")
    public Map<String, Object> togglePause() {
        boolean nowPaused = processManager.togglePause();
        return Map.of("paused", nowPaused);
    }

    /**
     * 单步模式：每步自动暂停
     */
    @PostMapping("/system/auto-pause")
    public Map<String, Object> toggleAutoPause() {
        boolean nowAutoPause = processManager.toggleAutoPause();
        return Map.of("autoPause", nowAutoPause, "paused", processManager.isPaused());
    }

    /**
     * 单步执行（暂停状态下执行一个时钟滴答）
     */
    @PostMapping("/system/step")
    public Map<String, Object> step() {
        processManager.tickForced();   // 绕过 paused 检查，执行后自动保持 paused
        hardwarePool.updateIoUsage(processManager.getAllProcesses().size());
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("clockTick", processManager.getClockTick());
        return result;
    }

    /**
     * 连续运行：执行一个tick（已暂停则跳过，由前端定时调用）
     */
    @PostMapping("/system/run")
    public Map<String, Object> run() {
        Map<String, Object> result = new HashMap<>();
        if (!processManager.isPaused()) {
            processManager.tick();
            hardwarePool.updateIoUsage(processManager.getAllProcesses().size());
        }
        result.put("success", true);
        result.put("clockTick", processManager.getClockTick());
        result.put("paused", processManager.isPaused());
        return result;
    }
}
