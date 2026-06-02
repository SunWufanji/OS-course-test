package com.processos.scheduler;

import com.processos.model.ProcessControlBlock;
import java.util.List;

/**
 * 短作业优先调度算法
 */
public class SJFScheduler implements Scheduler {

    @Override
    public ProcessControlBlock selectNext(List<ProcessControlBlock> readyQueue, int currentTime) {
        if (readyQueue == null || readyQueue.isEmpty()) {
            return null;
        }
        return readyQueue.stream()
                .min((a, b) -> {
                    int cmp = Integer.compare(a.getRemainingTime(), b.getRemainingTime());
                    return cmp != 0 ? cmp : Integer.compare(a.getArrivalTime(), b.getArrivalTime());
                })
                .orElse(null);
    }

    @Override
    public String getName() {
        return "SJF";
    }

    @Override
    public String getDescription() {
        return "短作业优先调度算法（Shortest Job First）";
    }
}
