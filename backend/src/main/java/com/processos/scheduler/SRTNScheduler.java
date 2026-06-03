package com.processos.scheduler;

import com.processos.model.ProcessControlBlock;
import java.util.List;

/**
 * 最短剩余时间优先调度算法（SRTN）
 * 抢占式版本的SJF
 */
public class SRTNScheduler implements Scheduler {

    @Override
    public ProcessControlBlock selectNext(List<ProcessControlBlock> readyQueue, int currentTime) {
        if (readyQueue == null || readyQueue.isEmpty()) {
            return null;
        }
        // 选择剩余时间最短的进程
        return readyQueue.stream()
                .min((a, b) -> {
                    int cmp = Integer.compare(a.getRemainingTime(), b.getRemainingTime());
                    // 剩余时间相同时，选择到达时间早的
                    return cmp != 0 ? cmp : Integer.compare(a.getArrivalTime(), b.getArrivalTime());
                })
                .orElse(null);
    }

    @Override
    public String getName() {
        return "SRTN";
    }

    @Override
    public String getDescription() {
        return "最短剩余时间优先调度算法（Shortest Remaining Time Next）";
    }
}
