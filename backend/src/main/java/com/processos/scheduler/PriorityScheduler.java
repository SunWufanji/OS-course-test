package com.processos.scheduler;

import com.processos.model.ProcessControlBlock;
import java.util.List;

/**
 * 优先级调度算法
 */
public class PriorityScheduler implements Scheduler {

    @Override
    public ProcessControlBlock selectNext(List<ProcessControlBlock> readyQueue, int currentTime) {
        if (readyQueue == null || readyQueue.isEmpty()) {
            return null;
        }
        return readyQueue.stream()
                .min((a, b) -> {
                    int cmp = Integer.compare(a.getPriority(), b.getPriority());
                    return cmp != 0 ? cmp : Integer.compare(a.getArrivalTime(), b.getArrivalTime());
                })
                .orElse(null);
    }

    @Override
    public String getName() {
        return "Priority";
    }

    @Override
    public String getDescription() {
        return "优先级调度算法（Priority Scheduling）";
    }
}
