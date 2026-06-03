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
            // MFQ算法：新进程进入队列0
            if ("MFQ".equals(scheduler.getName())) {
                ((MFQScheduler) scheduler).addToQueue0(pcb);
            }
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
        Map<String, Object> result = new HashMap<>();

        // 检查新到达的进程（在时间增加之前）
        for (ProcessControlBlock p : processes) {
            if (p.getArrivalTime() == currentTime && p.getState() == ProcessState.CREATED) {
                p.setState(ProcessState.READY);
                readyQueue.add(p);
            }
        }

        // 调度
        ProcessControlBlock previousRunning = runningProcess;
        if (runningProcess == null || runningProcess.getState() != ProcessState.RUNNING) {
            // 没有运行进程，调度一个
            runningProcess = scheduler.selectNext(readyQueue, currentTime);
            if (runningProcess != null) {
                readyQueue.remove(runningProcess);
                runningProcess.setState(ProcessState.RUNNING);
                runningProcess.setStartTime(currentTime);
            }
        } else if ("SRTN".equals(scheduler.getName())) {
            // SRTN算法：检查是否需要抢占
            ProcessControlBlock shortest = scheduler.selectNext(readyQueue, currentTime);
            if (shortest != null && shortest.getRemainingTime() < runningProcess.getRemainingTime()) {
                // 添加甘特图数据（被抢占）
                addGanttData(runningProcess, runningProcess.getStartTime(), currentTime);
                // 当前进程回到就绪队列
                runningProcess.setState(ProcessState.READY);
                readyQueue.add(runningProcess);
                // 调度更短的进程
                runningProcess = shortest;
                readyQueue.remove(runningProcess);
                runningProcess.setState(ProcessState.RUNNING);
                runningProcess.setStartTime(currentTime);
            }
        } else if ("PreemptivePriority".equals(scheduler.getName())) {
            // 抢占式优先级：检查是否有更高优先级的进程
            ProcessControlBlock higher = scheduler.selectNext(readyQueue, currentTime);
            if (higher != null && higher.getPriority() < runningProcess.getPriority()) {
                // 添加甘特图数据（被抢占）
                addGanttData(runningProcess, runningProcess.getStartTime(), currentTime);
                // 当前进程回到就绪队列
                runningProcess.setState(ProcessState.READY);
                readyQueue.add(runningProcess);
                // 调度更高优先级的进程
                runningProcess = higher;
                readyQueue.remove(runningProcess);
                runningProcess.setState(ProcessState.RUNNING);
                runningProcess.setStartTime(currentTime);
            }
        } else if ("MFQ".equals(scheduler.getName())) {
            // MFQ算法：检查是否有更高优先级队列的进程
            MFQScheduler mfq = (MFQScheduler) scheduler;
            ProcessControlBlock higher = mfq.selectNext(readyQueue, currentTime);
            if (higher != null && mfq.findProcessQueue(higher) < mfq.findProcessQueue(runningProcess)) {
                // 添加甘特图数据（被抢占）
                addGanttData(runningProcess, runningProcess.getStartTime(), currentTime);
                // 当前进程回到就绪队列
                runningProcess.setState(ProcessState.READY);
                readyQueue.add(runningProcess);
                // 调度更高优先级队列的进程
                runningProcess = higher;
                readyQueue.remove(runningProcess);
                runningProcess.setState(ProcessState.RUNNING);
                runningProcess.setStartTime(currentTime);
            }
        }

        // 时间增加
        currentTime++;

        // 执行
        if (runningProcess != null && runningProcess.getState() == ProcessState.RUNNING) {
            // RR算法检查时间片
            if ("RR".equals(scheduler.getName())) {
                timeUsed++;
                if (timeUsed > timeQuantum && runningProcess.getRemainingTime() > 0) {
                    // 添加甘特图数据（时间片用完）
                    addGanttData(runningProcess, runningProcess.getStartTime(), currentTime);

                    runningProcess.setState(ProcessState.READY);
                    readyQueue.add(runningProcess);
                    runningProcess = null;
                    timeUsed = 0;
                    result.put("event", "TIMEOUT");
                    return result;
                }
            }

            // MFQ算法检查时间片
            if ("MFQ".equals(scheduler.getName())) {
                MFQScheduler mfq = (MFQScheduler) scheduler;
                timeUsed++;
                int currentTimeQuantum = mfq.getCurrentTimeQuantum();

                // 执行一个时间单位
                runningProcess.setRemainingTime(runningProcess.getRemainingTime() - 1);

                if (runningProcess.getRemainingTime() == 0) {
                    // 进程完成
                    addGanttData(runningProcess, runningProcess.getStartTime(), currentTime);
                    mfq.removeProcess(runningProcess);
                    runningProcess.setState(ProcessState.TERMINATED);
                    runningProcess.setCompletionTime(currentTime);
                    runningProcess.setTurnaroundTime(currentTime - runningProcess.getArrivalTime());
                    runningProcess.setWaitingTime(runningProcess.getTurnaroundTime() - runningProcess.getBurstTime());
                    runningProcess = null;
                    timeUsed = 0;
                    result.put("event", "COMPLETED");
                    return result;
                } else if (timeUsed >= currentTimeQuantum) {
                    // 时间片用完，降级
                    addGanttData(runningProcess, runningProcess.getStartTime(), currentTime);
                    mfq.demoteProcess(runningProcess);
                    runningProcess.setState(ProcessState.READY);
                    readyQueue.add(runningProcess);
                    runningProcess = null;
                    timeUsed = 0;
                    result.put("event", "TIMEOUT");
                    return result;
                }
                return result; // MFQ直接返回，不执行后面的逻辑
            }

            // 其他算法的处理
            if (runningProcess != null) {
                runningProcess.setRemainingTime(runningProcess.getRemainingTime() - 1);

                if (runningProcess.getRemainingTime() == 0) {
                    // 添加甘特图数据（进程完成）
                    addGanttData(runningProcess, runningProcess.getStartTime(), currentTime);

                    runningProcess.setState(ProcessState.TERMINATED);
                    runningProcess.setCompletionTime(currentTime);
                    runningProcess.setTurnaroundTime(runningProcess.getCompletionTime() - runningProcess.getArrivalTime());
                    runningProcess.setWaitingTime(runningProcess.getTurnaroundTime() - runningProcess.getBurstTime());

                    runningProcess = null;
                    timeUsed = 0;
                    result.put("event", "COMPLETED");
                    return result;
                }
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
            log.setArrivalTime(p.getArrivalTime());
            log.setPriority(p.getPriority());
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
            parseAndCreateProcesses(config.getConfigJson());
        }
    }

    /**
     * 解析JSON配置并创建进程
     */
    private void parseAndCreateProcesses(String configJson) {
        try {
            // 简单解析JSON数组，格式: [{"name":"P1","burst":6,"priority":3,"arrival":0}, ...]
            String json = configJson.trim();
            if (json.startsWith("[")) {
                json = json.substring(1);
            }
            if (json.endsWith("]")) {
                json = json.substring(0, json.length() - 1);
            }

            String[] items = json.split("\\},\\s*\\{");
            for (String item : items) {
                item = item.replaceAll("[{}\"]", "").trim();
                String[] pairs = item.split(",");
                String name = "";
                int burst = 5, priority = 3, arrival = 0;

                for (String pair : pairs) {
                    String[] kv = pair.split(":");
                    if (kv.length == 2) {
                        String key = kv[0].trim();
                        String value = kv[1].trim();
                        switch (key) {
                            case "name" -> name = value;
                            case "burst" -> burst = Integer.parseInt(value);
                            case "priority" -> priority = Integer.parseInt(value);
                            case "arrival" -> arrival = Integer.parseInt(value);
                        }
                    }
                }
                if (!name.isEmpty()) {
                    createProcess(name, burst, priority, arrival);
                }
            }
        } catch (Exception e) {
            // JSON解析失败，忽略
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
            record.put("id", m.getId());
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
     * 删除单条历史记录
     */
    public void deleteHistoryRecord(Long id) {
        performanceMetricsRepository.deleteById(id);
    }

    /**
     * 清空所有历史记录
     */
    public void clearAllHistory() {
        performanceMetricsRepository.deleteAll();
    }

    /**
     * 获取历史记录的进程详情
     */
    public Map<String, Object> getHistoryProcesses(Long historyId) {
        Map<String, Object> result = new HashMap<>();
        // 获取性能指标记录
        PerformanceMetrics metrics = performanceMetricsRepository.findById(historyId).orElse(null);
        if (metrics == null) {
            result.put("found", false);
            return result;
        }

        // 获取对应的执行日志
        List<ExecutionLog> logs = executionLogRepository.findBySessionId(metrics.getSessionId());
        List<Map<String, Object>> processList = new ArrayList<>();

        for (ExecutionLog log : logs) {
            Map<String, Object> p = new HashMap<>();
            p.put("name", log.getProcessName());
            p.put("burstTime", log.getBurstTime());
            p.put("arrivalTime", log.getArrivalTime() != null ? log.getArrivalTime() : 0);
            p.put("priority", log.getPriority() != null ? log.getPriority() : 3);
            p.put("algorithm", log.getAlgorithm());
            processList.add(p);
        }

        result.put("found", true);
        result.put("processes", processList);
        result.put("algorithm", metrics.getAlgorithm());
        return result;
    }

    /**
     * 从历史记录重新创建进程
     */
    public void replayFromHistory(Long historyId) {
        Map<String, Object> history = getHistoryProcesses(historyId);
        if (!(boolean) history.get("found")) {
            return;
        }

        // 先重置
        processes.clear();
        readyQueue.clear();
        blockedQueue.clear();
        runningProcess = null;
        currentTime = 0;
        nextPid = 1;
        timeUsed = 0;
        ganttData.clear();

        // 设置算法
        String algo = (String) history.get("algorithm");
        setScheduler(algo);

        // 重新创建进程
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> processList = (List<Map<String, Object>>) history.get("processes");
        for (Map<String, Object> p : processList) {
            String name = (String) p.get("name");
            int burstTime = (int) p.get("burstTime");
            int arrivalTime = (int) p.get("arrivalTime");
            int priority = (int) p.get("priority");
            createProcess(name, burstTime, priority, arrivalTime);
        }
    }

    /**
     * 重置系统
     */
    public void reset() {
        // 只有当有进程完成时才保存
        boolean hasCompleted = processes.stream()
                .anyMatch(p -> p.getState() == ProcessState.TERMINATED);

        if (hasCompleted) {
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
        // 创建进程
        ProcessControlBlock p1 = createProcess("P1", 6, 3, 0);
        ProcessControlBlock p2 = createProcess("P2", 4, 1, 0);
        ProcessControlBlock p3 = createProcess("P3", 2, 4, 0);
        ProcessControlBlock p4 = createProcess("P4", 3, 2, 0);
        ProcessControlBlock p5 = createProcess("P5", 5, 5, 0);

        // MFQ算法：手动将进程添加到队列
        if ("MFQ".equals(scheduler.getName())) {
            MFQScheduler mfq = (MFQScheduler) scheduler;
            mfq.addToQueue0(p1);
            mfq.addToQueue0(p2);
            mfq.addToQueue0(p3);
            mfq.addToQueue0(p4);
            mfq.addToQueue0(p5);
        }
    }

    /**
     * 设置调度算法
     */
    public void setScheduler(String algo) {
        switch (algo) {
            case "FCFS": scheduler = new FCFSScheduler(); break;
            case "SJF": scheduler = new SJFScheduler(); break;
            case "SRTN": scheduler = new SRTNScheduler(); break;
            case "RR": scheduler = new RoundRobinScheduler(); break;
            case "Priority": scheduler = new PriorityScheduler(); break;
            case "PreemptivePriority": scheduler = new PreemptivePriorityScheduler(); break;
            case "MFQ": scheduler = new MFQScheduler(); break;
            default: scheduler = new FCFSScheduler();
        }
    }

    /**
     * 设置时间片
     */
    public void setTimeQuantum(int quantum) {
        this.timeQuantum = quantum;
    }

    /**
     * 派生子进程（Fork模拟）
     */
    public ProcessControlBlock forkProcess(int parentPid, String childName) {
        ProcessControlBlock parent = findProcess(parentPid);
        if (parent == null) {
            return null;
        }

        // 子进程继承父进程的部分属性
        String color = COLORS[(nextPid - 1) % COLORS.length];
        ProcessControlBlock child = new ProcessControlBlock(
                nextPid++,
                childName,
                parent.getBurstTime() / 2,  // 子进程执行时间为父进程的一半
                parent.getPriority(),        // 继承优先级
                currentTime,                 // 当前时间到达
                color,
                parentPid                   // 设置父进程ID
        );

        processes.add(child);
        child.setState(ProcessState.READY);
        readyQueue.add(child);

        return child;
    }

    /**
     * 级联终止（Kill Tree）
     */
    public List<Integer> killProcessTree(int pid) {
        List<Integer> killedPids = new ArrayList<>();
        killProcessTreeRecursive(pid, killedPids);
        return killedPids;
    }

    private void killProcessTreeRecursive(int pid, List<Integer> killedPids) {
        // 先递归杀死所有子进程
        List<ProcessControlBlock> children = processes.stream()
                .filter(p -> p.getParentPid() == pid)
                .toList();

        for (ProcessControlBlock child : children) {
            killProcessTreeRecursive(child.getPid(), killedPids);
        }

        // 再杀死当前进程
        ProcessControlBlock p = findProcess(pid);
        if (p != null) {
            p.setState(ProcessState.TERMINATED);
            p.setCompletionTime(currentTime);
            p.setTurnaroundTime(currentTime - p.getArrivalTime());
            p.setWaitingTime(p.getTurnaroundTime() - p.getBurstTime());
            readyQueue.remove(p);
            blockedQueue.remove(p);
            if (runningProcess == p) {
                runningProcess = null;
            }
            killedPids.add(pid);
        }
    }

    /**
     * 获取进程树结构
     */
    public List<Map<String, Object>> getProcessTree() {
        List<Map<String, Object>> tree = new ArrayList<>();

        // 获取所有根进程（parentPid == -1）
        List<ProcessControlBlock> roots = processes.stream()
                .filter(p -> p.getParentPid() == -1)
                .toList();

        for (ProcessControlBlock root : roots) {
            tree.add(buildTreeNode(root));
        }

        return tree;
    }

    private Map<String, Object> buildTreeNode(ProcessControlBlock process) {
        Map<String, Object> node = new HashMap<>();
        node.put("pid", process.getPid());
        node.put("name", process.getName());
        node.put("state", process.getState().name());
        node.put("color", process.getColor());
        node.put("parentPid", process.getParentPid());

        // 获取子进程
        List<Map<String, Object>> children = new ArrayList<>();
        List<ProcessControlBlock> childProcesses = processes.stream()
                .filter(p -> p.getParentPid() == process.getPid())
                .toList();

        for (ProcessControlBlock child : childProcesses) {
            children.add(buildTreeNode(child));
        }

        node.put("children", children);
        return node;
    }

    /**
     * 添加甘特图数据
     */
    private void addGanttData(ProcessControlBlock process, int start, int end) {
        // 检查是否需要合并相邻的相同进程段
        if (!ganttData.isEmpty()) {
            Map<String, Object> last = ganttData.get(ganttData.size() - 1);
            if (last.get("pid").equals(process.getPid()) && (int)last.get("end") == start) {
                // 合并相邻段
                last.put("end", end);
                return;
            }
        }

        Map<String, Object> gantt = new HashMap<>();
        gantt.put("pid", process.getPid());
        gantt.put("name", process.getName());
        gantt.put("color", process.getColor());
        gantt.put("start", start);
        gantt.put("end", end);
        ganttData.add(gantt);
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

    /**
     * 获取MFQ队列大小
     */
    public int[] getMFQQueueSizes() {
        if ("MFQ".equals(scheduler.getName())) {
            MFQScheduler mfq = (MFQScheduler) scheduler;
            return mfq.getQueueSizes();
        }
        return new int[]{0, 0, 0, 0};
    }

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
