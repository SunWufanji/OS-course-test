package com.processos.service;

import com.processos.model.*;
import com.processos.repository.*;
import com.processos.scheduler.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.UUID;

/**
 * 进程管理服务
 */
@Service
public class ProcessService {

    @Autowired
    private ExecutionLogRepository executionLogRepository;

    @Autowired
    private ScenarioConfigRepository scenarioConfigRepository;

    @Autowired
    private PerformanceMetricsRepository performanceMetricsRepository;

    private List<ProcessControlBlock> processes;
    private List<ProcessControlBlock> readyQueue;
    private List<ProcessControlBlock> blockedQueue;
    private ProcessControlBlock runningProcess;
    private Scheduler scheduler;
    private int currentTime;
    private int nextPid;
    private int timeQuantum;
    private int timeUsed;
    private List<Map<String, Object>> ganttData;
    private boolean isRunning;
    private String currentSessionId;
    private Long currentScenarioId;

    private static final String[] COLORS = {
        "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
        "#f43f5e", "#ef4444", "#f97316", "#eab308", "#84cc16",
        "#22c55e", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6"
    };

    public ProcessService() {
        this.processes = new CopyOnWriteArrayList<>();
        this.readyQueue = new CopyOnWriteArrayList<>();
        this.blockedQueue = new CopyOnWriteArrayList<>();
        this.scheduler = new FCFSScheduler();
        this.currentTime = 0;
        this.nextPid = 1;
        this.timeQuantum = 2;
        this.timeUsed = 0;
        this.ganttData = new ArrayList<>();
        this.isRunning = false;
        this.currentSessionId = UUID.randomUUID().toString();
    }

    /**
     * 创建进程
     */
    public ProcessControlBlock createProcess(String name, int burstTime, int priority, int arrivalTime) {
        String color = COLORS[(nextPid - 1) % COLORS.length];
        ProcessControlBlock pcb = new ProcessControlBlock(nextPid++, name, burstTime, priority, arrivalTime, color);
        processes.add(pcb);

        if (arrivalTime <= currentTime) {
            pcb.setState(ProcessState.READY);
            readyQueue.add(pcb);
        }

        return pcb;
    }

    /**
     * 删除进程
     */
    public boolean deleteProcess(int pid) {
        ProcessControlBlock p = findProcess(pid);
        if (p != null) {
            processes.remove(p);
            readyQueue.remove(p);
            blockedQueue.remove(p);
            if (runningProcess == p) {
                runningProcess = null;
            }
            return true;
        }
        return false;
    }

    /**
     * 挂起进程
     */
    public boolean suspendProcess(int pid) {
        ProcessControlBlock p = findProcess(pid);
        if (p != null && (p.getState() == ProcessState.READY || p.getState() == ProcessState.RUNNING)) {
            if (p.getState() == ProcessState.RUNNING) {
                runningProcess = null;
            }
            p.setState(ProcessState.BLOCKED);
            readyQueue.remove(p);
            blockedQueue.add(p);
            return true;
        }
        return false;
    }

    /**
     * 恢复进程
     */
    public boolean resumeProcess(int pid) {
        ProcessControlBlock p = findProcess(pid);
        if (p != null && p.getState() == ProcessState.BLOCKED) {
            p.setState(ProcessState.READY);
            blockedQueue.remove(p);
            readyQueue.add(p);
            return true;
        }
        return false;
    }

    /**
     * 执行一个时间步
     */
    public Map<String, Object> tick() {
        currentTime++;
        Map<String, Object> result = new HashMap<>();

        // 检查新到达的进程
        for (ProcessControlBlock p : processes) {
            if (p.getArrivalTime() == currentTime && p.getState() == ProcessState.CREATED) {
                p.setState(ProcessState.READY);
                readyQueue.add(p);
            }
        }

        // 调度
        if (runningProcess == null || runningProcess.getState() != ProcessState.RUNNING) {
            runningProcess = scheduler.selectNext(readyQueue, currentTime);
            if (runningProcess != null) {
                readyQueue.remove(runningProcess);
                runningProcess.setState(ProcessState.RUNNING);
            }
        }

        // 执行
        if (runningProcess != null && runningProcess.getState() == ProcessState.RUNNING) {
            if ("RR".equals(scheduler.getName())) {
                timeUsed++;
                if (timeUsed > timeQuantum && runningProcess.getRemainingTime() > 0) {
                    runningProcess.setState(ProcessState.READY);
                    readyQueue.add(runningProcess);
                    runningProcess = null;
                    timeUsed = 0;
                    result.put("event", "TIMEOUT");
                    return result;
                }
            }

            runningProcess.setRemainingTime(runningProcess.getRemainingTime() - 1);

            if (runningProcess.getRemainingTime() == 0) {
                runningProcess.setState(ProcessState.TERMINATED);
                runningProcess.setCompletionTime(currentTime);
                runningProcess.setTurnaroundTime(runningProcess.getCompletionTime() - runningProcess.getArrivalTime());
                runningProcess.setWaitingTime(runningProcess.getTurnaroundTime() - runningProcess.getBurstTime());

                Map<String, Object> gantt = new HashMap<>();
                gantt.put("pid", runningProcess.getPid());
                gantt.put("name", runningProcess.getName());
                gantt.put("color", runningProcess.getColor());
                gantt.put("start", ganttData.isEmpty() ? 0 : ganttData.get(ganttData.size() - 1).get("end"));
                gantt.put("end", currentTime);
                ganttData.add(gantt);

                runningProcess = null;
                timeUsed = 0;
                result.put("event", "COMPLETED");
                return result;
            }
        }

        // 更新等待时间
        for (ProcessControlBlock p : readyQueue) {
            p.setWaitingTime(p.getWaitingTime() + 1);
        }

        result.put("event", "TICK");
        return result;
    }

    /**
     * 保存执行轨迹到数据库
     */
    public void saveExecutionLogs() {
        for (ProcessControlBlock p : processes) {
            ExecutionLog log = new ExecutionLog(currentSessionId, p.getPid(), p.getName(), scheduler.getName());
            log.setBurstTime(p.getBurstTime());
            log.setStartTime(p.getCompletionTime() > 0 ? p.getCompletionTime() - p.getTurnaroundTime() : null);
            log.setEndTime(p.getCompletionTime());
            log.setWaitingTime(p.getWaitingTime());
            log.setTurnaroundTime(p.getTurnaroundTime());
            log.setCompletionTime(p.getCompletionTime());
            executionLogRepository.save(log);
        }
    }

    /**
     * 保存性能指标到数据库
     */
    public PerformanceMetrics savePerformanceMetrics() {
        PerformanceMetrics metrics = new PerformanceMetrics(currentSessionId, scheduler.getName(), currentScenarioId);

        List<ProcessControlBlock> completed = processes.stream()
                .filter(p -> p.getState() == ProcessState.TERMINATED)
                .toList();

        if (!completed.isEmpty()) {
            double avgTurnaround = completed.stream().mapToInt(ProcessControlBlock::getTurnaroundTime).average().orElse(0);
            double avgWaiting = completed.stream().mapToInt(ProcessControlBlock::getWaitingTime).average().orElse(0);
            double avgWeighted = completed.stream()
                    .mapToDouble(p -> (double) p.getTurnaroundTime() / p.getBurstTime())
                    .average().orElse(0);
            double throughput = (double) completed.size() / currentTime;
            double cpuUsage = completed.stream().mapToInt(ProcessControlBlock::getBurstTime).sum() * 100.0 / currentTime;

            metrics.setAvgTurnaround(BigDecimal.valueOf(avgTurnaround).setScale(2, RoundingMode.HALF_UP));
            metrics.setAvgWaiting(BigDecimal.valueOf(avgWaiting).setScale(2, RoundingMode.HALF_UP));
            metrics.setAvgWeightedTurnaround(BigDecimal.valueOf(avgWeighted).setScale(2, RoundingMode.HALF_UP));
            metrics.setThroughput(BigDecimal.valueOf(throughput).setScale(4, RoundingMode.HALF_UP));
            metrics.setCpuUtilization(BigDecimal.valueOf(cpuUsage).setScale(2, RoundingMode.HALF_UP));
        } else {
            metrics.setAvgTurnaround(BigDecimal.ZERO);
            metrics.setAvgWaiting(BigDecimal.ZERO);
            metrics.setAvgWeightedTurnaround(BigDecimal.ZERO);
            metrics.setThroughput(BigDecimal.ZERO);
            metrics.setCpuUtilization(BigDecimal.ZERO);
        }

        metrics.setTotalTime(currentTime);
        metrics.setCompletedCount(completed.size());

        return performanceMetricsRepository.save(metrics);
    }

    /**
     * 从数据库加载场景配置
     */
    public List<ScenarioConfig> getAllScenarios() {
        return scenarioConfigRepository.findAll();
    }

    /**
     * 加载指定场景
     */
    public void loadScenario(Long scenarioId) {
        Optional<ScenarioConfig> scenario = scenarioConfigRepository.findById(scenarioId);
        if (scenario.isPresent()) {
            reset();
            currentScenarioId = scenarioId;
            ScenarioConfig config = scenario.get();
            // 解析JSON配置并创建进程
            // 这里简化处理，实际需要解析JSON
        }
    }

    /**
     * 获取历史模拟记录
     */
    public List<Map<String, Object>> getHistoryRecords() {
        List<PerformanceMetrics> metrics = performanceMetricsRepository.findTop10ByOrderByCreatedAtDesc();
        List<Map<String, Object>> records = new ArrayList<>();

        for (PerformanceMetrics m : metrics) {
            Map<String, Object> record = new HashMap<>();
            record.put("sessionId", m.getSessionId());
            record.put("algorithm", m.getAlgorithm());
            record.put("avgTurnaround", m.getAvgTurnaround());
            record.put("avgWaiting", m.getAvgWaiting());
            record.put("throughput", m.getThroughput());
            record.put("cpuUtilization", m.getCpuUtilization());
            record.put("totalTime", m.getTotalTime());
            record.put("completedCount", m.getCompletedCount());
            record.put("createdAt", m.getCreatedAt());
            records.add(record);
        }

        return records;
    }

    /**
     * 重置系统
     */
    public void reset() {
        // 保存当前模拟数据到数据库
        if (!processes.isEmpty()) {
            saveExecutionLogs();
            savePerformanceMetrics();
        }

        processes.clear();
        readyQueue.clear();
        blockedQueue.clear();
        runningProcess = null;
        currentTime = 0;
        nextPid = 1;
        timeUsed = 0;
        ganttData.clear();
        isRunning = false;
        currentSessionId = UUID.randomUUID().toString();
    }

    /**
     * 加载演示数据
     */
    public void loadDemo() {
        reset();
        createProcess("P1", 6, 3, 0);
        createProcess("P2", 4, 1, 1);
        createProcess("P3", 2, 4, 2);
        createProcess("P4", 3, 2, 3);
        createProcess("P5", 5, 5, 4);
    }

    /**
     * 设置调度算法
     */
    public void setScheduler(String algo) {
        switch (algo) {
            case "FCFS": scheduler = new FCFSScheduler(); break;
            case "SJF": scheduler = new SJFScheduler(); break;
            case "RR": scheduler = new RoundRobinScheduler(); break;
            case "Priority": scheduler = new PriorityScheduler(); break;
            default: scheduler = new FCFSScheduler();
        }
    }

    /**
     * 设置时间片
     */
    public void setTimeQuantum(int quantum) {
        this.timeQuantum = quantum;
    }

    private ProcessControlBlock findProcess(int pid) {
        return processes.stream().filter(p -> p.getPid() == pid).findFirst().orElse(null);
    }

    // Getters
    public List<ProcessControlBlock> getProcesses() { return processes; }
    public List<ProcessControlBlock> getReadyQueue() { return readyQueue; }
    public List<ProcessControlBlock> getBlockedQueue() { return blockedQueue; }
    public ProcessControlBlock getRunningProcess() { return runningProcess; }
    public int getCurrentTime() { return currentTime; }
    public String getCurrentAlgo() { return scheduler.getName(); }
    public List<Map<String, Object>> getGanttData() { return ganttData; }
    public boolean isRunning() { return isRunning; }
    public void setRunning(boolean running) { isRunning = running; }

    /**
     * 获取统计信息
     */
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();
        List<ProcessControlBlock> completed = processes.stream()
                .filter(p -> p.getState() == ProcessState.TERMINATED)
                .toList();

        if (!completed.isEmpty()) {
            double avgTurnaround = completed.stream().mapToInt(ProcessControlBlock::getTurnaroundTime).average().orElse(0);
            double avgWaiting = completed.stream().mapToInt(ProcessControlBlock::getWaitingTime).average().orElse(0);
            stats.put("avgTurnaround", Math.round(avgTurnaround * 10.0) / 10.0);
            stats.put("avgWaiting", Math.round(avgWaiting * 10.0) / 10.0);
            stats.put("cpuUsage", currentTime > 0 ? Math.round(completed.stream().mapToInt(ProcessControlBlock::getBurstTime).sum() * 100.0 / currentTime) : 0);
        } else {
            stats.put("avgTurnaround", 0);
            stats.put("avgWaiting", 0);
            stats.put("cpuUsage", 0);
        }

        stats.put("completed", completed.size());
        return stats;
    }
}
