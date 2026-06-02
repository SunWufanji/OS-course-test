package com.processos.controller;

import com.processos.model.ProcessControlBlock;
import com.processos.model.ScenarioConfig;
import com.processos.service.ProcessService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 进程管理API
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ProcessController {

    @Autowired
    private ProcessService processService;

    /**
     * 获取所有进程
     */
    @GetMapping("/processes")
    public Map<String, Object> getProcesses() {
        Map<String, Object> result = new HashMap<>();
        result.put("processes", processService.getProcesses());
        result.put("readyQueue", processService.getReadyQueue());
        result.put("blockedQueue", processService.getBlockedQueue());
        result.put("runningProcess", processService.getRunningProcess());
        result.put("currentTime", processService.getCurrentTime());
        result.put("currentAlgo", processService.getCurrentAlgo());
        result.put("ganttData", processService.getGanttData());
        result.put("stats", processService.getStats());
        return result;
    }

    /**
     * 创建进程
     */
    @PostMapping("/processes")
    public ProcessControlBlock createProcess(@RequestBody Map<String, Object> request) {
        String name = (String) request.getOrDefault("name", "P");
        int burstTime = (int) request.getOrDefault("burstTime", 5);
        int priority = (int) request.getOrDefault("priority", 3);
        int arrivalTime = (int) request.getOrDefault("arrivalTime", 0);
        return processService.createProcess(name, burstTime, priority, arrivalTime);
    }

    /**
     * 删除进程
     */
    @DeleteMapping("/processes/{pid}")
    public Map<String, Boolean> deleteProcess(@PathVariable int pid) {
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", processService.deleteProcess(pid));
        return result;
    }

    /**
     * 挂起进程
     */
    @PostMapping("/processes/{pid}/suspend")
    public Map<String, Boolean> suspendProcess(@PathVariable int pid) {
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", processService.suspendProcess(pid));
        return result;
    }

    /**
     * 恢复进程
     */
    @PostMapping("/processes/{pid}/resume")
    public Map<String, Boolean> resumeProcess(@PathVariable int pid) {
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", processService.resumeProcess(pid));
        return result;
    }

    /**
     * 执行一步
     */
    @PostMapping("/tick")
    public Map<String, Object> tick() {
        return processService.tick();
    }

    /**
     * 重置系统
     */
    @PostMapping("/reset")
    public Map<String, Boolean> reset() {
        processService.reset();
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", true);
        return result;
    }

    /**
     * 加载演示
     */
    @PostMapping("/demo")
    public Map<String, Boolean> loadDemo() {
        processService.loadDemo();
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", true);
        return result;
    }

    /**
     * 设置调度算法
     */
    @PostMapping("/scheduler")
    public Map<String, Boolean> setScheduler(@RequestBody Map<String, String> request) {
        String algo = request.get("algo");
        processService.setScheduler(algo);
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", true);
        return result;
    }

    /**
     * 设置时间片
     */
    @PostMapping("/quantum")
    public Map<String, Boolean> setQuantum(@RequestBody Map<String, Integer> request) {
        int quantum = request.getOrDefault("quantum", 2);
        processService.setTimeQuantum(quantum);
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", true);
        return result;
    }

    // ==================== 新增接口：场景和历史 ====================

    /**
     * 获取所有实验场景
     */
    @GetMapping("/scenarios")
    public List<ScenarioConfig> getScenarios() {
        return processService.getAllScenarios();
    }

    /**
     * 加载指定场景
     */
    @PostMapping("/scenarios/{id}/load")
    public Map<String, Boolean> loadScenario(@PathVariable Long id) {
        processService.loadScenario(id);
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", true);
        return result;
    }

    /**
     * 获取历史模拟记录
     */
    @GetMapping("/history")
    public List<Map<String, Object>> getHistory() {
        return processService.getHistoryRecords();
    }

    /**
     * 保存当前模拟结果
     */
    @PostMapping("/save")
    public Map<String, Boolean> saveResults() {
        processService.saveExecutionLogs();
        processService.savePerformanceMetrics();
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", true);
        return result;
    }
}
