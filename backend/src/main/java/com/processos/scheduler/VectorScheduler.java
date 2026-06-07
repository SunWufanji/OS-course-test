package com.processos.scheduler;

import com.processos.model.ProcessControlBlock;

import java.util.List;

/**
 * 向量调度算法
 * Score = dot(feature_vector, weight_vector)
 * 选择得分最高的进程
 *
 * 特征向量（归一化到0-1）：
 *   f_priority   = 1 - priority/maxPriority       （优先级越高→分越高）
 *   f_waiting    = waitingTime/maxWaiting           （等待越久→分越高）
 *   f_remaining  = 1 - remainingTime/maxRemaining   （剩余越少→分越高）
 *   f_burst      = 1 - burstTime/maxBurst           （作业越短→分越高）
 *   f_recency    = arrivalTime/latestArrival         （越晚到达→分越高）
 */
public class VectorScheduler implements Scheduler {

    // 权重向量：[priority, waiting, remaining, burst, arrival_recency]
    private double[] weights = {0.3, 0.25, 0.25, 0.1, 0.1};

    // 归一化基准值
    private double maxPriority = 5.0;
    private double maxWaiting = 50.0;
    private double maxRemaining = 20.0;
    private double maxBurst = 20.0;
    private int latestArrival = 1;

    public VectorScheduler() {}

    public VectorScheduler(double[] weights) {
        if (weights != null && weights.length == 5) {
            this.weights = weights.clone();
        }
    }

    public void setWeights(double[] weights) {
        if (weights != null && weights.length == 5) {
            this.weights = weights.clone();
        }
    }

    public double[] getWeights() { return weights.clone(); }

    public String[] getWeightNames() {
        return new String[]{"优先级", "等待时间", "剩余时间", "作业长度", "到达时间"};
    }

    @Override
    public ProcessControlBlock selectNext(List<ProcessControlBlock> readyQueue, int currentTime) {
        if (readyQueue == null || readyQueue.isEmpty()) return null;

        // 动态更新归一化基准值
        latestArrival = readyQueue.stream()
                .mapToInt(ProcessControlBlock::getArrivalTime)
                .max().orElse(1);
        if (latestArrival == 0) latestArrival = 1;

        maxPriority = readyQueue.stream()
                .mapToInt(ProcessControlBlock::getPriority)
                .max().orElse(5);
        if (maxPriority == 0) maxPriority = 1;

        maxWaiting = Math.max(readyQueue.stream()
                .mapToInt(ProcessControlBlock::getWaitingTime)
                .max().orElse(1), 1);

        maxRemaining = Math.max(readyQueue.stream()
                .mapToInt(ProcessControlBlock::getRemainingTime)
                .max().orElse(1), 1);

        maxBurst = Math.max(readyQueue.stream()
                .mapToInt(ProcessControlBlock::getBurstTime)
                .max().orElse(1), 1);

        return readyQueue.stream()
                .max((a, b) -> Double.compare(calculateScore(a, currentTime), calculateScore(b, currentTime)))
                .orElse(null);
    }

    /**
     * 计算进程的向量得分
     */
    public double calculateScore(ProcessControlBlock p, int currentTime) {
        double f_priority = 1.0 - ((double) p.getPriority() / maxPriority);
        double f_waiting = Math.min((double) p.getWaitingTime() / maxWaiting, 1.0);
        double f_remaining = 1.0 - ((double) p.getRemainingTime() / maxRemaining);
        double f_burst = 1.0 - ((double) p.getBurstTime() / maxBurst);
        double f_recency = latestArrival > 0 ? (double) p.getArrivalTime() / latestArrival : 0;

        return weights[0] * f_priority
             + weights[1] * f_waiting
             + weights[2] * f_remaining
             + weights[3] * f_burst
             + weights[4] * f_recency;
    }

    /**
     * 获取进程的分数分解（用于前端展示）
     */
    public double[] getScoreBreakdown(ProcessControlBlock p, int currentTime) {
        double f_priority = 1.0 - ((double) p.getPriority() / maxPriority);
        double f_waiting = Math.min((double) p.getWaitingTime() / maxWaiting, 1.0);
        double f_remaining = 1.0 - ((double) p.getRemainingTime() / maxRemaining);
        double f_burst = 1.0 - ((double) p.getBurstTime() / maxBurst);
        double f_recency = latestArrival > 0 ? (double) p.getArrivalTime() / latestArrival : 0;

        return new double[]{
            weights[0] * f_priority,
            weights[1] * f_waiting,
            weights[2] * f_remaining,
            weights[3] * f_burst,
            weights[4] * f_recency
        };
    }

    @Override
    public String getName() { return "Vector"; }

    @Override
    public String getDescription() {
        return "向量调度算法（Vector Scheduling）— 多维加权评分";
    }
}
