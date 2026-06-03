package com.processos.scheduler;

import com.processos.model.ProcessControlBlock;
import com.processos.model.ProcessState;
import java.util.*;

/**
 * 多级反馈队列调度算法（MFQ）
 *
 * 规则：
 * 1. 新进程进入队列0（最高优先级）
 * 2. 如果时间片用完还没完成，降到下一级队列
 * 3. 低优先级队列的进程必须等高优先级队列为空才能执行
 * 4. 高优先级队列有进程时，抢占低优先级进程
 *
 * 队列结构：
 * - 队列0：时间片=1，最高优先级
 * - 队列1：时间片=2，中等优先级
 * - 队列2：时间片=4，低优先级
 * - 队列3：FCFS，最低优先级
 */
public class MFQScheduler implements Scheduler {

    // 多级队列：0=最高优先级，3=最低优先级
    private List<List<ProcessControlBlock>> queues;
    // 每个队列的时间片
    private int[] timeQuantums;
    // 当前运行的队列级别
    private int currentLevel;
    // 当前进程在当前队列已使用的时间片
    private int currentTimeUsed;

    public MFQScheduler() {
        queues = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            queues.add(new ArrayList<>());
        }
        // 时间片配置：队列0=1，队列1=2，队列2=4，队列3=FCFS
        timeQuantums = new int[]{1, 2, 4, Integer.MAX_VALUE};
        currentLevel = 0;
        currentTimeUsed = 0;
    }

    @Override
    public ProcessControlBlock selectNext(List<ProcessControlBlock> readyQueue, int currentTime) {
        // 从最高优先级队列开始查找（排除当前运行的进程）
        for (int i = 0; i < queues.size(); i++) {
            List<ProcessControlBlock> queue = queues.get(i);
            for (ProcessControlBlock p : queue) {
                if (p.getState() != ProcessState.RUNNING) {
                    currentLevel = i;
                    return p;
                }
            }
        }
        return null;
    }

    /**
     * 添加进程到队列0（新进程）
     */
    public void addToQueue0(ProcessControlBlock process) {
        queues.get(0).add(process);
        process.setStartTime(-1); // 标记为未开始执行
    }

    /**
     * 时间片用完，进程降到下一级队列
     */
    public void demoteProcess(ProcessControlBlock process) {
        int currentQueue = findProcessQueue(process);
        if (currentQueue >= 0 && currentQueue < queues.size() - 1) {
            queues.get(currentQueue).remove(process);
            queues.get(currentQueue + 1).add(process);
            System.out.println("[MFQ] " + process.getName() + " 从队列" + currentQueue + "降到队列" + (currentQueue + 1));
        }
    }

    /**
     * 进程完成，从队列中移除
     */
    public void removeProcess(ProcessControlBlock process) {
        int queue = findProcessQueue(process);
        if (queue >= 0) {
            queues.get(queue).remove(process);
        }
    }

    /**
     * 查找进程在哪个队列
     */
    public int findProcessQueue(ProcessControlBlock process) {
        for (int i = 0; i < queues.size(); i++) {
            if (queues.get(i).contains(process)) {
                return i;
            }
        }
        return -1;
    }

    /**
     * 获取当前队列的时间片
     */
    public int getCurrentTimeQuantum() {
        return timeQuantums[currentLevel];
    }

    /**
     * 获取当前队列级别
     */
    public int getCurrentLevel() {
        return currentLevel;
    }

    /**
     * 获取所有队列
     */
    public List<List<ProcessControlBlock>> getQueues() {
        return queues;
    }

    /**
     * 获取队列中进程数量
     */
    public int[] getQueueSizes() {
        int[] sizes = new int[queues.size()];
        for (int i = 0; i < queues.size(); i++) {
            sizes[i] = queues.get(i).size();
        }
        return sizes;
    }

    @Override
    public String getName() {
        return "MFQ";
    }

    @Override
    public String getDescription() {
        return "多级反馈队列调度算法（Multilevel Feedback Queue）";
    }
}
