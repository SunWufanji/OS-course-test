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

    /**
     * 获取系统状态（CPU/内存/IO）
     */
    @GetMapping("/system/status")
    public HardwarePool.SystemStatus getSystemStatus() {
        return hardwarePool.getStatus();
    }

    /**
     * 获取所有可用应用列表
     */
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
     * 启动应用（生成进程）
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

        ProcessControlBlock pcb = processManager.launchApp(app);
        if (pcb == null) {
            result.put("success", false);
            result.put("error", "内存不足，无法启动 " + app.getName());
            return result;
        }

        result.put("success", true);
        result.put("process", pcb);
        return result;
    }

    /**
     * 结束进程
     */
    @PostMapping("/process/{pid}/terminate")
    public Map<String, Boolean> terminateProcess(@PathVariable int pid) {
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", processManager.killProcess(pid));
        return result;
    }

    /**
     * 挂起进程
     */
    @PostMapping("/process/{pid}/suspend")
    public Map<String, Boolean> suspendProcess(@PathVariable int pid) {
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", processManager.suspendProcess(pid));
        return result;
    }

    /**
     * 恢复进程
     */
    @PostMapping("/process/{pid}/resume")
    public Map<String, Boolean> resumeProcess(@PathVariable int pid) {
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", processManager.resumeProcess(pid));
        return result;
    }

    /**
     * 获取沙盒进程列表
     */
    @GetMapping("/process/sandbox")
    public List<ProcessControlBlock> getSandboxProcesses() {
        return processManager.getAllProcesses();
    }

    /**
     * 重置沙盒（清空所有进程）
     */
    @PostMapping("/system/reset")
    public Map<String, Boolean> resetSandbox() {
        processManager.clearAll();
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", true);
        return result;
    }
}
