package com.processos.controller;

import com.processos.model.ProcessControlBlock;
import com.processos.model.ProcessState;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * 内核算法实验室 API
 * 接收前端传来的进程配置和算法名称，返回甘特图时间线数据
 */
@RestController
@RequestMapping("/api/lab")
@CrossOrigin(origins = "*")
public class LabController {

    @Autowired
    private com.processos.service.ProcessService processService;

    /**
     * 运行调度模拟，返回甘特图数据
     */
    @PostMapping("/simulate")
    public Map<String, Object> simulate(@RequestBody Map<String, Object> request) {
        String algorithm = (String) request.getOrDefault("algorithm", "FCFS");
        int quantum = request.containsKey("quantum") ? (int) request.get("quantum") : 2;
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> processConfigs = (List<Map<String, Object>>) request.get("processes");

        // 先重置
        processService.reset();

        // 设置算法和时间片
        processService.setScheduler(algorithm);
        processService.setTimeQuantum(quantum);

        // 创建进程
        if (processConfigs != null) {
            for (Map<String, Object> config : processConfigs) {
                String name = (String) config.getOrDefault("name", "P");
                int burstTime = config.containsKey("burstTime") ? ((Number) config.get("burstTime")).intValue() : 5;
                int priority = config.containsKey("priority") ? ((Number) config.get("priority")).intValue() : 3;
                int arrivalTime = config.containsKey("arrivalTime") ? ((Number) config.get("arrivalTime")).intValue() : 0;
                processService.createProcess(name, burstTime, priority, arrivalTime);
            }
        }

        // 运行模拟直到所有进程完成
        List<Map<String, Object>> ganttData = new ArrayList<>();
        int maxTicks = 200; // 安全上限
        int tick = 0;

        while (tick < maxTicks) {
            processService.tick();
            tick++;

            // 收集甘特图数据
            List<Map<String, Object>> currentGantt = processService.getGanttData();
            if (currentGantt.size() > ganttData.size()) {
                // 有新的甘特图块
                ganttData = new ArrayList<>(currentGantt);
            }

            // 检查是否所有进程都完成
            List<ProcessControlBlock> processes = processService.getProcesses();
            boolean allDone = processes.stream()
                .allMatch(p -> p.getState() == ProcessState.TERMINATED);
            if (allDone && !processes.isEmpty()) {
                break;
            }
        }

        // 为每个进程分配颜色
        Map<Integer, String> colorMap = new HashMap<>();
        String[] colors = {
            "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
            "#f43f5e", "#ef4444", "#f97316", "#eab308", "#84cc16"
        };
        int colorIndex = 0;
        for (Map<String, Object> block : ganttData) {
            int pid = ((Number) block.get("pid")).intValue();
            if (!colorMap.containsKey(pid)) {
                colorMap.put(pid, colors[colorIndex % colors.length]);
                colorIndex++;
            }
            block.put("color", colorMap.get(pid));
        }

        // 获取统计信息
        Map<String, Object> stats = processService.getStats();

        Map<String, Object> response = new HashMap<>();
        response.put("gantt", ganttData);
        response.put("stats", stats);
        response.put("totalTime", processService.getCurrentTime());
        response.put("algorithm", algorithm);

        return response;
    }
}
