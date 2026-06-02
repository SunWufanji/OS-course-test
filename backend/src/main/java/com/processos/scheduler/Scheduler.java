package com.processos.scheduler;

import com.processos.model.ProcessControlBlock;
import java.util.List;

/**
 * 调度器接口
 */
public interface Scheduler {
    ProcessControlBlock selectNext(List<ProcessControlBlock> readyQueue, int currentTime);
    String getName();
    String getDescription();
}
