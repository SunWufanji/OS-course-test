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
    private int startTime;   // 开始运行时间
    private String color;
    private int parentPid;  // 父进程ID，-1表示无父进程

    // ========== 沙盒模式字段 ==========
    private String appType;       // 应用类型（对应 SimulatedApp 枚举名）
    private String icon;          // 显示图标
    private double baseCpuUsage;  // CPU 基础占用率
    private double cpuUsage;      // 当前 CPU 占用率（实时抖动）
    private int memoryUsage;      // 内存需求 (MB)
    private int currentMemoryUsage; // 当前内存使用 (MB)
    private int diskRead;         // 磁盘读取速度 (MB/s)
    private int diskWrite;        // 磁盘写入速度 (MB/s)
    private int networkSpeed;     // 网络速度 (KB/s)
    private int coreIndex;        // 分配的 CPU 核心索引，-1 表示未分配
    private String blockedReason; // 阻塞原因（如"等待打印机"、"等待磁盘I/O"）
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
        this.parentPid = -1;  // 默认无父进程
    }

    public ProcessControlBlock(int pid, String name, int burstTime, int priority, int arrivalTime, String color, int parentPid) {
        this(pid, name, burstTime, priority, arrivalTime, color);
        this.parentPid = parentPid;
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

    public int getStartTime() { return startTime; }
    public void setStartTime(int startTime) { this.startTime = startTime; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public int getParentPid() { return parentPid; }
    public void setParentPid(int parentPid) { this.parentPid = parentPid; }

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
