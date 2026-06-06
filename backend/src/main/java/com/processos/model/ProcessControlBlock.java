package com.processos.model;

import java.util.ArrayList;
import java.util.List;

/**
 * 进程控制块（PCB）
 */
public class ProcessControlBlock {
    // ========== 基本调度信息 ==========
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
    private int startTime;   // 开始运行时间
    private String color;
    private int parentPid;  // 父进程ID，-1表示无父进程

    // ========== CPU 执行上下文 ==========
    private int programCounter;           // 程序计数器（指令数组下标）
    private int savedAx;                  // 通用寄存器 A
    private int savedBx;                  // 通用寄存器 B
    private int savedCx;                  // 通用寄存器 C
    private int savedDx;                  // 通用寄存器 D

    // ========== 代码段 ==========
    private String[] codeSegment;         // 汇编指令数组（进程的代码段）
    private String currentCodeLine;       // 当前执行的指令文本

    // ========== 内存管理 ==========
    private int memoryBase;               // 内存基地址 (MB)
    private int memoryLimit;              // 内存上限 (MB)

    // ========== 调度统计 ==========
    private int contextSwitchCount;       // 上下文切换次数
    private int totalCpuTimeUsed;         // 累计CPU时间

    // ========== IPC ==========
    private List<String> messageBuffer;   // 消息缓冲区
    private int messageBufferSize;        // 缓冲区容量（默认5）
    private boolean waitingForMessage;    // 是否在等待消息

    // ========== 调试/可视化 ==========
    private String lastInterruptReason;   // 最近一次中断原因

    // ========== 沙盒模式字段 ==========
    private String appType;       // 应用类型（对应 SimulatedApp 枚举名）
    private String icon;          // 显示图标
    private double baseCpuUsage;  // CPU 基础占用率
    private double cpuUsage;      // 当前 CPU 占用率（实时抖动）
    private int memoryUsage;      // 内存需求 (MB)，沙盒模式使用
    private int currentMemoryUsage; // 当前内存使用 (MB)
    private int diskRead;         // 磁盘读取速度 (MB/s)
    private int diskWrite;        // 磁盘写入速度 (MB/s)
    private int networkSpeed;     // 网络速度 (KB/s)
    private int coreIndex;        // 分配的 CPU 核心索引，-1 表示未分配
    private String blockedReason; // 阻塞原因（如"等待打印机"、"等待IPC消息"）
    private String occupiedDevice; // 当前占用的设备名称（如"打印机"、"耳机"）

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
        this.parentPid = -1;
        // 执行上下文初始化
        this.programCounter = 0;
        this.messageBufferSize = 5;
        this.messageBuffer = new ArrayList<>();
        this.waitingForMessage = false;
    }

    public ProcessControlBlock(int pid, String name, int burstTime, int priority, int arrivalTime, String color, int parentPid) {
        this(pid, name, burstTime, priority, arrivalTime, color);
        this.parentPid = parentPid;
    }

    /**
     * 重置CPU执行上下文（进程被创建或重新调度时调用）
     */
    public void resetContext() {
        this.programCounter = 0;
        this.savedAx = 0;
        this.savedBx = 0;
        this.savedCx = 0;
        this.savedDx = 0;
        this.currentCodeLine = null;
        this.contextSwitchCount = 0;
        this.totalCpuTimeUsed = 0;
        this.messageBuffer = new ArrayList<>();
        this.waitingForMessage = false;
        this.lastInterruptReason = null;
    }

    // ========== 基本调度 Getters/Setters ==========
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

    public int getStartTime() { return startTime; }
    public void setStartTime(int startTime) { this.startTime = startTime; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public int getParentPid() { return parentPid; }
    public void setParentPid(int parentPid) { this.parentPid = parentPid; }

    // ========== CPU 执行上下文 Getters/Setters ==========
    public int getProgramCounter() { return programCounter; }
    public void setProgramCounter(int programCounter) { this.programCounter = programCounter; }
    public int getIr() { return Math.max(0, programCounter - 1); } // IR = PC - 1，当前执行的指令

    public int getSavedAx() { return savedAx; }
    public void setSavedAx(int savedAx) { this.savedAx = savedAx; }

    public int getSavedBx() { return savedBx; }
    public void setSavedBx(int savedBx) { this.savedBx = savedBx; }

    public int getSavedCx() { return savedCx; }
    public void setSavedCx(int savedCx) { this.savedCx = savedCx; }

    public int getSavedDx() { return savedDx; }
    public void setSavedDx(int savedDx) { this.savedDx = savedDx; }

    // ========== 代码段 Getters/Setters ==========
    public String[] getCodeSegment() { return codeSegment; }
    public void setCodeSegment(String[] codeSegment) { this.codeSegment = codeSegment; }

    public String getCurrentCodeLine() { return currentCodeLine; }
    public void setCurrentCodeLine(String currentCodeLine) { this.currentCodeLine = currentCodeLine; }

    // ========== 内存管理 Getters/Setters ==========
    public int getMemoryBase() { return memoryBase; }
    public void setMemoryBase(int memoryBase) { this.memoryBase = memoryBase; }

    public int getMemoryLimit() { return memoryLimit; }
    public void setMemoryLimit(int memoryLimit) { this.memoryLimit = memoryLimit; }

    // ========== 调度统计 Getters/Setters ==========
    public int getContextSwitchCount() { return contextSwitchCount; }
    public void setContextSwitchCount(int contextSwitchCount) { this.contextSwitchCount = contextSwitchCount; }

    public int getTotalCpuTimeUsed() { return totalCpuTimeUsed; }
    public void setTotalCpuTimeUsed(int totalCpuTimeUsed) { this.totalCpuTimeUsed = totalCpuTimeUsed; }

    // ========== IPC Getters/Setters ==========
    public List<String> getMessageBuffer() { return messageBuffer; }
    public void setMessageBuffer(List<String> messageBuffer) { this.messageBuffer = messageBuffer; }

    public int getMessageBufferSize() { return messageBufferSize; }
    public void setMessageBufferSize(int messageBufferSize) { this.messageBufferSize = messageBufferSize; }

    public boolean isWaitingForMessage() { return waitingForMessage; }
    public void setWaitingForMessage(boolean waitingForMessage) { this.waitingForMessage = waitingForMessage; }

    // ========== 调试/可视化 Getters/Setters ==========
    public String getLastInterruptReason() { return lastInterruptReason; }
    public void setLastInterruptReason(String lastInterruptReason) { this.lastInterruptReason = lastInterruptReason; }

    // ========== 沙盒模式 Getters/Setters ==========
    public String getAppType() { return appType; }
    public void setAppType(String appType) { this.appType = appType; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public double getBaseCpuUsage() { return baseCpuUsage; }
    public void setBaseCpuUsage(double baseCpuUsage) { this.baseCpuUsage = baseCpuUsage; }

    public double getCpuUsage() { return cpuUsage; }
    public void setCpuUsage(double cpuUsage) { this.cpuUsage = cpuUsage; }

    public int getMemoryUsage() { return memoryUsage; }
    public void setMemoryUsage(int memoryUsage) { this.memoryUsage = memoryUsage; }

    public int getCurrentMemoryUsage() { return currentMemoryUsage; }
    public void setCurrentMemoryUsage(int currentMemoryUsage) { this.currentMemoryUsage = currentMemoryUsage; }

    public int getDiskRead() { return diskRead; }
    public void setDiskRead(int diskRead) { this.diskRead = diskRead; }

    public int getDiskWrite() { return diskWrite; }
    public void setDiskWrite(int diskWrite) { this.diskWrite = diskWrite; }

    public int getNetworkSpeed() { return networkSpeed; }
    public void setNetworkSpeed(int networkSpeed) { this.networkSpeed = networkSpeed; }

    public int getCoreIndex() { return coreIndex; }
    public void setCoreIndex(int coreIndex) { this.coreIndex = coreIndex; }

    public String getBlockedReason() { return blockedReason; }
    public void setBlockedReason(String blockedReason) { this.blockedReason = blockedReason; }

    public String getOccupiedDevice() { return occupiedDevice; }
    public void setOccupiedDevice(String occupiedDevice) { this.occupiedDevice = occupiedDevice; }
}
