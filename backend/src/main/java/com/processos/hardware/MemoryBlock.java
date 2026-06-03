package com.processos.hardware;

/**
 * 内存块 - 表示一段连续的内存空间
 */
public class MemoryBlock {

    private int startAddress;    // 起始地址
    private int size;            // 大小 (MB)
    private boolean allocated;   // 是否已分配
    private int pid;             // 占用进程的 PID（0 表示空闲）
    private String processName;  // 占用进程名称

    public MemoryBlock() {}

    public MemoryBlock(int startAddress, int size) {
        this.startAddress = startAddress;
        this.size = size;
        this.allocated = false;
        this.pid = 0;
        this.processName = null;
    }

    /**
     * 分配内存给进程
     */
    public void allocate(int pid, String processName) {
        this.allocated = true;
        this.pid = pid;
        this.processName = processName;
    }

    /**
     * 释放内存
     */
    public void free() {
        this.allocated = false;
        this.pid = 0;
        this.processName = null;
    }

    /**
     * 检查是否可以容纳指定大小的内存请求
     */
    public boolean canFit(int requiredSize) {
        return !this.allocated && this.size >= requiredSize;
    }

    /**
     * 分割内存块（当分配的内存小于块大小时）
     */
    public MemoryBlock split(int requiredSize) {
        if (requiredSize >= this.size) {
            return null;
        }
        // 创建剩余空间的新块
        MemoryBlock remaining = new MemoryBlock(
            this.startAddress + requiredSize,
            this.size - requiredSize
        );
        // 当前块缩小
        this.size = requiredSize;
        return remaining;
    }

    // Getters and Setters
    public int getStartAddress() { return startAddress; }
    public void setStartAddress(int startAddress) { this.startAddress = startAddress; }

    public int getSize() { return size; }
    public void setSize(int size) { this.size = size; }

    public boolean isAllocated() { return allocated; }
    public void setAllocated(boolean allocated) { this.allocated = allocated; }

    public int getPid() { return pid; }
    public void setPid(int pid) { this.pid = pid; }

    public String getProcessName() { return processName; }
    public void setProcessName(String processName) { this.processName = processName; }

    @Override
    public String toString() {
        return String.format("MemoryBlock{addr=%d, size=%dMB, allocated=%s, pid=%d}",
            startAddress, size, allocated, pid);
    }
}
