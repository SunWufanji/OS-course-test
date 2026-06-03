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
 * 系统管理 API - 沙盒模式
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

        int pid = (int) launchResult[0];
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
}
