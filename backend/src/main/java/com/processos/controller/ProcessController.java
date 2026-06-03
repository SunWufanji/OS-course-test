package com.processos.controller;

import com.processos.model.ProcessControlBlock;
import com.processos.model.ScenarioConfig;
import com.processos.service.ProcessService;
import com.processos.service.SyncDemoService;
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

    @Autowired
    private SyncDemoService syncDemoService;

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

        // 添加当前运行进程的甘特图信息
        if (processService.getRunningProcess() != null) {
            Map<String, Object> currentGantt = new HashMap<>();
            currentGantt.put("pid", processService.getRunningProcess().getPid());
            currentGantt.put("name", processService.getRunningProcess().getName());
            currentGantt.put("color", processService.getRunningProcess().getColor());
            currentGantt.put("start", processService.getRunningProcess().getStartTime());
            currentGantt.put("end", processService.getCurrentTime());
            result.put("currentGantt", currentGantt);
        }

        // 添加MFQ队列信息
        if ("MFQ".equals(processService.getCurrentAlgo())) {
            result.put("mfqQueues", processService.getMFQQueueSizes());
        }

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

    // ==================== 新增接口：进程树 ====================

    /**
     * 派生子进程
     */
    @PostMapping("/processes/{pid}/fork")
    public Map<String, Object> forkProcess(@PathVariable int pid, @RequestBody Map<String, String> request) {
        String childName = request.getOrDefault("name", "child_" + pid);
        ProcessControlBlock child = processService.forkProcess(pid, childName);
        Map<String, Object> result = new HashMap<>();
        result.put("success", child != null);
        result.put("child", child);
        return result;
    }

    /**
     * 级联终止进程树
     */
    @DeleteMapping("/processes/{pid}/tree")
    public Map<String, Object> killProcessTree(@PathVariable int pid) {
        List<Integer> killedPids = processService.killProcessTree(pid);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("killedPids", killedPids);
        return result;
    }

    /**
     * 获取进程树
     */
    @GetMapping("/processes/tree")
    public List<Map<String, Object>> getProcessTree() {
        return processService.getProcessTree();
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
     * 删除单条历史记录
     */
    @DeleteMapping("/history/{id}")
    public Map<String, Boolean> deleteHistory(@PathVariable Long id) {
        processService.deleteHistoryRecord(id);
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", true);
        return result;
    }

    /**
     * 清空所有历史记录
     */
    @DeleteMapping("/history")
    public Map<String, Boolean> clearHistory() {
        processService.clearAllHistory();
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", true);
        return result;
    }

    /**
     * 获取历史记录的进程详情
     */
    @GetMapping("/history/{id}/processes")
    public Map<String, Object> getHistoryProcesses(@PathVariable Long id) {
        return processService.getHistoryProcesses(id);
    }

    /**
     * 从历史记录重新创建进程
     */
    @PostMapping("/history/{id}/replay")
    public Map<String, Boolean> replayHistory(@PathVariable Long id) {
        processService.replayFromHistory(id);
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", true);
        return result;
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

    // ==================== 同步机制演示 ====================

    /**
     * 演示生产者消费者问题
     */
    @PostMapping("/sync/producer-consumer")
    public Map<String, Object> startProducerConsumer() {
        syncDemoService.startProducerConsumerDemo();
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "生产者消费者演示已启动");
        return result;
    }

    /**
     * 演示哲学家就餐问题
     */
    @PostMapping("/sync/dining-philosophers")
    public Map<String, Object> startDiningPhilosophers() {
        syncDemoService.startDiningPhilosophersDemo();
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "哲学家就餐演示已启动");
        return result;
    }

    /**
     * 演示读者写者问题
     */
    @PostMapping("/sync/reader-writer")
    public Map<String, Object> startReaderWriter() {
        syncDemoService.startReaderWriterDemo();
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "读者写者演示已启动");
        return result;
    }

    /**
     * 停止同步演示
     */
    @PostMapping("/sync/stop")
    public Map<String, Boolean> stopSyncDemo() {
        syncDemoService.stopDemo();
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", true);
        return result;
    }

    /**
     * 重置同步演示
     */
    @PostMapping("/sync/reset")
    public Map<String, Boolean> resetSyncDemo() {
        syncDemoService.reset();
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", true);
        return result;
    }

    /**
     * 获取同步演示状态
     */
    @GetMapping("/sync/status")
    public Map<String, Object> getSyncStatus() {
        Map<String, Object> result = new HashMap<>();
        result.put("log", syncDemoService.getSyncLog());
        result.put("isRunning", syncDemoService.isRunning());
        result.put("buffer", syncDemoService.getBuffer());
        result.put("producerCount", syncDemoService.getProducerCount());
        result.put("consumerCount", syncDemoService.getConsumerCount());
        result.put("semaphoreValue", syncDemoService.getSemaphoreValue());
        result.put("mutexLocked", syncDemoService.isMutexLocked());
        result.put("queueSize", syncDemoService.getQueueSize());
        return result;
    }
}
