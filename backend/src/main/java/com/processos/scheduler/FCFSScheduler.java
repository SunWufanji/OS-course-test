package com.processos.scheduler;

import com.processos.model.ProcessControlBlock;
import java.util.List;

/**
 * 先来先服务调度算法
 */
public class FCFSScheduler implements Scheduler {

    @Override
    public ProcessControlBlock selectNext(List<ProcessControlBlock> readyQueue, int currentTime) {
        if (readyQueue == null || readyQueue.isEmpty()) {
            return null;
        }
        return readyQueue.stream()
                .min((a, b) -> Integer.compare(a.getArrivalTime(), b.getArrivalTime()))
                .orElse(null);
    }

    @Override
    public String getName() {
        return "FCFS";
    }

    @Override
    public String getDescription() {
        return "先来先服务调度算法（First Come First Served）";
    }
}
