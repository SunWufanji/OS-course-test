package com.processos.model;

/**
 * 进程控制块（PCB）
 */
public class ProcessControlBlock {
    private int pid;
    private String name;
    private ProcessState state;
    private int priority;
    private int arrivalTime;
    private int burstTime;
    private int remainingTime;
    private int waitingTime;
    private int turnaroundTime;
    private int completionTime;
    private String color;

    public ProcessControlBlock() {}

    public ProcessControlBlock(int pid, String name, int burstTime, int priority, int arrivalTime, String color) {
        this.pid = pid;
        this.name = name;
        this.state = ProcessState.CREATED;
        this.burstTime = burstTime;
        this.remainingTime = burstTime;
        this.priority = priority;
        this.arrivalTime = arrivalTime;
        this.waitingTime = 0;
        this.turnaroundTime = 0;
        this.completionTime = 0;
        this.color = color;
    }

    // Getters and Setters
    public int getPid() { return pid; }
    public void setPid(int pid) { this.pid = pid; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public ProcessState getState() { return state; }
    public void setState(ProcessState state) { this.state = state; }

    public int getPriority() { return priority; }
    public void setPriority(int priority) { this.priority = priority; }

    public int getArrivalTime() { return arrivalTime; }
    public void setArrivalTime(int arrivalTime) { this.arrivalTime = arrivalTime; }

    public int getBurstTime() { return burstTime; }
    public void setBurstTime(int burstTime) { this.burstTime = burstTime; }

    public int getRemainingTime() { return remainingTime; }
    public void setRemainingTime(int remainingTime) { this.remainingTime = remainingTime; }

    public int getWaitingTime() { return waitingTime; }
    public void setWaitingTime(int waitingTime) { this.waitingTime = waitingTime; }

    public int getTurnaroundTime() { return turnaroundTime; }
    public void setTurnaroundTime(int turnaroundTime) { this.turnaroundTime = turnaroundTime; }

    public int getCompletionTime() { return completionTime; }
    public void setCompletionTime(int completionTime) { this.completionTime = completionTime; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
}
