package com.processos.scheduler;

import com.processos.model.ProcessControlBlock;
import java.util.List;

/**
 * 时间片轮转调度算法
 */
public class RoundRobinScheduler implements Scheduler {

    @Override
    public ProcessControlBlock selectNext(List<ProcessControlBlock> readyQueue, int currentTime) {
        if (readyQueue == null || readyQueue.isEmpty()) {
            return null;
        }
        return readyQueue.get(0);
    }

    @Override
    public String getName() {
        return "RR";
    }

    @Override
    public String getDescription() {
        return "时间片轮转调度算法（Round Robin）";
    }
}
