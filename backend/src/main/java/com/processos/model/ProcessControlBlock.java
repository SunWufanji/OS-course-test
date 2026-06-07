package com.processos.model;

import java.util.ArrayList;
import java.util.List;

/**
 * 进程控制块（PCB）— 操作系统中最重要的数据结构
 * <p>
 * 每个进程对应一个 PCB，记录进程的所有信息：
 * 调度状态、CPU寄存器上下文、代码段、内存分配、IPC状态、资源占用等
 * <p>
 * 注意：PCB 是纯内存对象（非 JPA 实体），不会被持久化到数据库
 */
public class ProcessControlBlock {

    // ========================================================================
    //  基本调度信息 — 调度算法需要的最核心字段
    // ========================================================================

    private int pid;                  // 进程唯一标识符（PID，由 ProcessManager 分配，从100开始）
    private String name;              // 进程名（如 "我的世界"、"Chrome(1)"）
    private ProcessState state;       // 进程状态：CREATED/READY/RUNNING/BLOCKED/TERMINATED
    private int priority;             // 优先级（1最高~5最低，对应 SimulatedApp 的 priority）
    private int arrivalTime;          // 到达时间（进程在第几个 tick 到达系统）
    private int burstTime;            // 总执行时间（CPU 需要跑多少个 tick）
    private int remainingTime;        // 剩余执行时间（burstTime - 已执行时间，用于 SRTN/SJF 等算法）
    private int waitingTime;          // 累计等待时间（在就绪队列里等了多少 tick，也用于老化机制）
    private int turnaroundTime;       // 周转时间 = completionTime - arrivalTime
    private int completionTime;       // 完成时间点（进程在第几个 tick 完成）
    private int startTime;            // 首次上 CPU 的时间点（用于计算响应时间）
    private String color;             // 显示颜色（甘特图中每个进程的颜色，如 "#6366f1"）
    private int parentPid;            // 父进程 PID（-1 表示无父进程，用于进程树）

    // ========================================================================
    //  CPU 执行上下文 — 上下文切换时保存/恢复的寄存器值
    // ========================================================================

    private int programCounter;       // ★ 程序计数器（指令数组下标，当前执行到第几条指令）
    private int savedAx;              // 通用寄存器 A（累加器，由 CpuCore.saveContext() 写入）
    private int savedBx;              // 通用寄存器 B（基址寄存器）
    private int savedCx;              // 通用寄存器 C（计数寄存器）
    private int savedDx;              // 通用寄存器 D（数据寄存器）

    // ========================================================================
    //  代码段 — 进程要执行的汇编指令序列
    // ========================================================================

    private String[] codeSegment;     // 汇编指令数组（整个代码段，如 ["MOV AX, 5", "ADD AX, BX", "HALT"]）
    private String currentCodeLine;   // 当前正在执行的指令原文（前端高亮显示用）

    // ========================================================================
    //  内存管理 — 记录进程在物理内存中的位置
    // ========================================================================

    private int memoryBase;           // 内存基地址（在 HardwarePool 的内存块中的起始位置，单位 MB）
    private int memoryLimit;          // 内存上限（分配的连续内存大小，单位 MB）

    // ========================================================================
    //  调度统计 — 用于性能评估
    // ========================================================================

    private int contextSwitchCount;   // 上下文切换次数（被切出 CPU 的次数）
    private int totalCpuTimeUsed;     // 累计使用的 CPU 时间（所有时间片之和）

    // ========================================================================
    //  IPC（进程间通信）— 消息缓冲区
    // ========================================================================

    private List<String> messageBuffer;     // ★ 消息缓冲区（FIFO 队列，存收到的消息字符串）
    private int messageBufferSize;           // 缓冲区容量上限（默认 5 条）
    private boolean waitingForMessage;       // 是否正在等待消息（RECV 时缓冲区为空则设为 true）

    // ========================================================================
    //  调试/可视化 — 辅助字段
    // ========================================================================

    private String lastInterruptReason;      // 最近一次中断原因（用于前端日志显示）

    // ========================================================================
    //  沙盒模式字段 — 桌面模拟器专用，非传统 PCB 内容
    // ========================================================================

    private String appType;           // 应用类型（对应 SimulatedApp 的枚举名，如 "MINECRAFT"）
    private String icon;              // 显示图标（emoji，如 "⛏️"、"🎮"）
    private double baseCpuUsage;      // CPU 基础占用率（来自 SimulatedApp 定义）
    private double cpuUsage;          // 当前 CPU 占用率（实时抖动后的值，前端 HUD 显示用）
    private int memoryUsage;          // 内存需求总量（MB，来自 SimulatedApp 定义）
    private int currentMemoryUsage;   // 当前已分配内存（MB，可能小于 memoryUsage，等待时=0）
    private int diskRead;             // 磁盘读取速度（MB/s）
    private int diskWrite;            // 磁盘写入速度（MB/s）
    private int networkSpeed;         // 网络速度（KB/s）
    private int coreIndex;            // 分配的 CPU 核心索引（-1 表示未分配核心）
    private String blockedReason;     // ★ 阻塞原因（如 "等待打印机"、"等待IPC消息"、"等待内存(14000MB)"、"手动挂起"）
    private String occupiedDevice;    // 当前占用的设备名（如 "打印机"、"耳机"，没有则为 null）


    // ========================================================================
    //  构造器
    // ========================================================================

    public ProcessControlBlock() {}   // 空构造器（用于手动 setter 赋值）

    /**
     * 完整构造器 — 创建 PCB 并初始化所有调度字段
     */
    public ProcessControlBlock(int pid, String name, int burstTime, int priority, int arrivalTime, String color) {
        this.pid = pid;
        this.name = name;
        this.state = ProcessState.CREATED;     // 初始状态：新建
        this.burstTime = burstTime;
        this.remainingTime = burstTime;         // 剩余时间 = 总执行时间（还没开始跑）
        this.priority = priority;
        this.arrivalTime = arrivalTime;
        this.waitingTime = 0;
        this.turnaroundTime = 0;
        this.completionTime = 0;
        this.color = color;
        this.parentPid = -1;                    // 默认无父进程
        // CPU 上下文初始化
        this.programCounter = 0;                // 从第 0 条指令开始执行
        this.messageBufferSize = 5;             // 默认消息缓冲区容量 5 条
        this.messageBuffer = new ArrayList<>();
        this.waitingForMessage = false;
    }

    /**
     * 带父进程的构造器 — 用于 fork 创建子进程
     */
    public ProcessControlBlock(int pid, String name, int burstTime, int priority, int arrivalTime, String color, int parentPid) {
        this(pid, name, burstTime, priority, arrivalTime, color);
        this.parentPid = parentPid;             // 记录父进程 PID
    }


    // ========================================================================
    //  核心方法
    // ========================================================================

    /**
     * 重置 CPU 执行上下文 — 进程被创建或重新调度时调用
     * 效果：所有寄存器归零，PC 指向第一条指令，清空消息缓冲区
     */
    public void resetContext() {
        this.programCounter = 0;                // 程序计数器归零（从头开始执行）
        this.savedAx = 0;                       // 寄存器清零
        this.savedBx = 0;
        this.savedCx = 0;
        this.savedDx = 0;
        this.currentCodeLine = null;            // 清空当前指令
        this.contextSwitchCount = 0;            // 上下文切换计数归零
        this.totalCpuTimeUsed = 0;              // CPU使用时间归零
        this.messageBuffer = new ArrayList<>(); // 清空消息缓冲区
        this.waitingForMessage = false;         // 取消等待消息状态
        this.lastInterruptReason = null;        // 清空中断原因
    }

    /**
     * 获取指令寄存器值（IR = PC - 1）
     * IR 表示"正在执行的指令"，PC 表示"下一条要执行的指令"
     * 因为 executeStep 先更新 PC 再执行，所以 IR = PC - 1
     */
    public int getIr() {
        return Math.max(0, programCounter - 1);
    }


    // ========================================================================
    //  基本调度字段的 Getters/Setters
    // ========================================================================

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


    // ========================================================================
    //  CPU 上下文 Getters/Setters
    // ========================================================================

    public int getProgramCounter() { return programCounter; }  // 程序计数器（下一条指令的下标）
    public void setProgramCounter(int programCounter) { this.programCounter = programCounter; }

    public int getSavedAx() { return savedAx; }
    public void setSavedAx(int savedAx) { this.savedAx = savedAx; }

    public int getSavedBx() { return savedBx; }
    public void setSavedBx(int savedBx) { this.savedBx = savedBx; }

    public int getSavedCx() { return savedCx; }
    public void setSavedCx(int savedCx) { this.savedCx = savedCx; }

    public int getSavedDx() { return savedDx; }
    public void setSavedDx(int savedDx) { this.savedDx = savedDx; }


    // ========================================================================
    //  代码段 Getters/Setters
    // ========================================================================

    public String[] getCodeSegment() { return codeSegment; }        // 获取整个代码段
    public void setCodeSegment(String[] codeSegment) { this.codeSegment = codeSegment; }

    public String getCurrentCodeLine() { return currentCodeLine; }  // 当前指令文本（前端显示用）
    public void setCurrentCodeLine(String currentCodeLine) { this.currentCodeLine = currentCodeLine; }


    // ========================================================================
    //  内存管理 Getters/Setters
    // ========================================================================

    public int getMemoryBase() { return memoryBase; }          // 内存起始地址
    public void setMemoryBase(int memoryBase) { this.memoryBase = memoryBase; }

    public int getMemoryLimit() { return memoryLimit; }        // 内存大小上限
    public void setMemoryLimit(int memoryLimit) { this.memoryLimit = memoryLimit; }


    // ========================================================================
    //  调度统计 Getters/Setters
    // ========================================================================

    public int getContextSwitchCount() { return contextSwitchCount; }
    public void setContextSwitchCount(int contextSwitchCount) { this.contextSwitchCount = contextSwitchCount; }

    public int getTotalCpuTimeUsed() { return totalCpuTimeUsed; }
    public void setTotalCpuTimeUsed(int totalCpuTimeUsed) { this.totalCpuTimeUsed = totalCpuTimeUsed; }


    // ========================================================================
    //  IPC Getters/Setters
    // ========================================================================

    public List<String> getMessageBuffer() { return messageBuffer; }
    public void setMessageBuffer(List<String> messageBuffer) { this.messageBuffer = messageBuffer; }

    public int getMessageBufferSize() { return messageBufferSize; }
    public void setMessageBufferSize(int messageBufferSize) { this.messageBufferSize = messageBufferSize; }

    public boolean isWaitingForMessage() { return waitingForMessage; }  // 是否在等消息
    public void setWaitingForMessage(boolean waitingForMessage) { this.waitingForMessage = waitingForMessage; }


    // ========================================================================
    //  调试/可视化 Getters/Setters
    // ========================================================================

    public String getLastInterruptReason() { return lastInterruptReason; }
    public void setLastInterruptReason(String lastInterruptReason) { this.lastInterruptReason = lastInterruptReason; }


    // ========================================================================
    //  沙盒模式 Getters/Setters
    // ========================================================================

    public String getAppType() { return appType; }                  // 应用类型（枚举名）
    public void setAppType(String appType) { this.appType = appType; }

    public String getIcon() { return icon; }                        // 显示图标（emoji）
    public void setIcon(String icon) { this.icon = icon; }

    public double getBaseCpuUsage() { return baseCpuUsage; }       // CPU基准占用率
    public void setBaseCpuUsage(double baseCpuUsage) { this.baseCpuUsage = baseCpuUsage; }

    public double getCpuUsage() { return cpuUsage; }               // 当前CPU使用率（实时）
    public void setCpuUsage(double cpuUsage) { this.cpuUsage = cpuUsage; }

    public int getMemoryUsage() { return memoryUsage; }             // ★ 内存需求总量（MB）
    public void setMemoryUsage(int memoryUsage) { this.memoryUsage = memoryUsage; }

    public int getCurrentMemoryUsage() { return currentMemoryUsage; } // 已分配内存（MB）
    public void setCurrentMemoryUsage(int currentMemoryUsage) { this.currentMemoryUsage = currentMemoryUsage; }

    public int getDiskRead() { return diskRead; }
    public void setDiskRead(int diskRead) { this.diskRead = diskRead; }

    public int getDiskWrite() { return diskWrite; }
    public void setDiskWrite(int diskWrite) { this.diskWrite = diskWrite; }

    public int getNetworkSpeed() { return networkSpeed; }
    public void setNetworkSpeed(int networkSpeed) { this.networkSpeed = networkSpeed; }

    public int getCoreIndex() { return coreIndex; }                 // 分配的CPU核心索引
    public void setCoreIndex(int coreIndex) { this.coreIndex = coreIndex; }

    public String getBlockedReason() { return blockedReason; }     // ★ 阻塞原因文本
    public void setBlockedReason(String blockedReason) { this.blockedReason = blockedReason; }

    public String getOccupiedDevice() { return occupiedDevice; }   // 占用的设备名
    public void setOccupiedDevice(String occupiedDevice) { this.occupiedDevice = occupiedDevice; }
}
