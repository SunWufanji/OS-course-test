package com.processos.scheduler;

import com.processos.model.ProcessControlBlock;
import java.util.List;

/**
 * 抢占式优先级调度算法
 * 当新进程到达且优先级更高时，会抢占当前进程
 */
public class PreemptivePriorityScheduler implements Scheduler {

    @Override
    public ProcessControlBlock selectNext(List<ProcessControlBlock> readyQueue, int currentTime) {
        if (readyQueue == null || readyQueue.isEmpty()) {
            return null;
        }
        // 选择优先级最高的进程（数字越小优先级越高）
        return readyQueue.stream()
                .min((a, b) -> {
                    int cmp = Integer.compare(a.getPriority(), b.getPriority());
                    // 优先级相同时，选择到达时间早的
                    return cmp != 0 ? cmp : Integer.compare(a.getArrivalTime(), b.getArrivalTime());
                })
                .orElse(null);
    }

    @Override
    public String getName() {
        return "PreemptivePriority";
    }

    @Override
    public String getDescription() {
        return "抢占式优先级调度算法（Preemptive Priority Scheduling）";
    }
}
