package com.processos.hardware;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * 硬件资源池 - 模拟整机硬件资源
 * 包含：多核 CPU、内存空间、IO 设备
 */
@Component
public class HardwarePool {

    // ==================== CPU 配置 ====================
    private final int cpuCores = 8;                      // CPU 核心数
    private final double[] coreUsage = new double[8];    // 每个核心的使用率 (0-100)
    private final int[] corePid = new int[8];            // 每个核心上运行的进程 PID

    // ==================== 内存配置 ====================
    private final int totalMemory = 16384;               // 总内存 16GB
    private int usedMemory = 1024;                       // 已用内存（系统预留 1GB）
    private final List<MemoryBlock> memoryBlocks;        // 内存块列表

    // ==================== IO 设备 ====================
    private double diskReadSpeed = 0;                    // 磁盘读取速度 MB/s
    private double diskWriteSpeed = 0;                   // 磁盘写入速度 MB/s
    private double networkSpeed = 0;                     // 网络速度 KB/s

    private final Random random = new Random();

    public HardwarePool() {
        // 初始化内存：一个大块的空闲空间
        memoryBlocks = new ArrayList<>();
        memoryBlocks.add(new MemoryBlock(0, totalMemory));

        // 初始化 CPU 核心状态
        for (int i = 0; i < cpuCores; i++) {
            coreUsage[i] = 0;
            corePid[i] = 0;
        }
    }

    // ==================== 内存管理 ====================

    /**
     * 分配内存（首次适应算法 First Fit）
     * @param requiredSize 需要的内存大小 (MB)
     * @param pid 进程 PID
     * @param processName 进程名称
     * @return 是否分配成功
     */
    public synchronized boolean allocateMemory(int requiredSize, int pid, String processName) {
        // 先检查总量是否足够
        if (usedMemory + requiredSize > totalMemory) {
            return false;
        }
        for (int i = 0; i < memoryBlocks.size(); i++) {
            MemoryBlock block = memoryBlocks.get(i);
            if (block.canFit(requiredSize)) {
                // 如果块比需要的大，需要分割
                MemoryBlock remaining = block.split(requiredSize);
                if (remaining != null) {
                    memoryBlocks.add(i + 1, remaining);
                }
                // 分配给进程
                block.allocate(pid, processName);
                usedMemory += requiredSize;
                return true;
            }
        }
        // 内存不足
        return false;
    }

    /**
     * 释放进程占用的内存
     * @param pid 进程 PID
     * @return 释放的内存大小
     */
    public synchronized int freeMemory(int pid) {
        int freedSize = 0;
        for (MemoryBlock block : memoryBlocks) {
            if (block.isAllocated() && block.getPid() == pid) {
                freedSize += block.getSize();
                usedMemory -= block.getSize();
                block.free();
            }
        }
        // 合并相邻的空闲块
        mergeFreeBlocks();
        return freedSize;
    }

    /**
     * 合并相邻的空闲内存块
     */
    private void mergeFreeBlocks() {
        for (int i = 0; i < memoryBlocks.size() - 1; i++) {
            MemoryBlock current = memoryBlocks.get(i);
            MemoryBlock next = memoryBlocks.get(i + 1);
            if (!current.isAllocated() && !next.isAllocated()) {
                // 合并：current 扩展，删除 next
                current.setSize(current.getSize() + next.getSize());
                memoryBlocks.remove(i + 1);
                i--; // 重新检查当前位置
            }
        }
    }

    // ==================== CPU 管理 ====================

    /**
     * 分配 CPU 核心给进程
     * @param pid 进程 PID
     * @return 分配的核心索引，-1 表示没有空闲核心
     */
    public synchronized int allocateCpuCore(int pid) {
        for (int i = 0; i < cpuCores; i++) {
            if (corePid[i] == 0) {
                corePid[i] = pid;
                return i;
            }
        }
        return -1; // 没有空闲核心
    }

    /**
     * 释放 CPU 核心
     * @param coreIndex 核心索引
     */
    public synchronized void freeCpuCore(int coreIndex) {
        if (coreIndex >= 0 && coreIndex < cpuCores) {
            corePid[coreIndex] = 0;
            coreUsage[coreIndex] = 0;
        }
    }

    /**
     * 释放进程占用的所有 CPU 核心
     * @param pid 进程 PID
     */
    public synchronized void freeAllCpuCores(int pid) {
        for (int i = 0; i < cpuCores; i++) {
            if (corePid[i] == pid) {
                corePid[i] = 0;
                coreUsage[i] = 0;
            }
        }
    }

    /**
     * 更新 CPU 使用率（模拟抖动）
     * 每个核心的使用率在基准值附近随机波动
     */
    public synchronized void updateCpuUsage() {
        for (int i = 0; i < cpuCores; i++) {
            if (corePid[i] != 0) {
                // 有进程在运行，使用率在 10%-100% 之间抖动
                double baseUsage = 30 + random.nextDouble() * 40; // 基础 30%-70%
                double jitter = (random.nextDouble() - 0.5) * 20; // ±10% 抖动
                coreUsage[i] = Math.max(10, Math.min(100, baseUsage + jitter));
            } else {
                coreUsage[i] = 0;
            }
        }
    }

    /**
     * 获取总 CPU 使用率（所有核心的平均值）
     */
    public double getTotalCpuUsage() {
        double total = 0;
        for (double usage : coreUsage) {
            total += usage;
        }
        return total / cpuCores;
    }

    // ==================== IO 设备管理 ====================

    /**
     * 更新 IO 设备使用情况（模拟抖动）
     */
    public void updateIoUsage(int activeProcessCount) {
        // IO 使用率与活跃进程数成正比
        double baseLoad = activeProcessCount * 5.0;
        diskReadSpeed = Math.max(0, baseLoad + (random.nextDouble() - 0.5) * 20);
        diskWriteSpeed = Math.max(0, baseLoad * 0.5 + (random.nextDouble() - 0.5) * 10);
        networkSpeed = Math.max(0, baseLoad * 2 + (random.nextDouble() - 0.5) * 50);
    }

    // ==================== 状态查询 ====================

    /**
     * 获取系统状态快照
     */
    public SystemStatus getStatus() {
        return new SystemStatus(
            cpuCores,
            getTotalCpuUsage(),
            coreUsage.clone(),
            corePid.clone(),
            totalMemory,
            usedMemory,
            memoryBlocks.stream()
                .filter(MemoryBlock::isAllocated)
                .map(b -> new MemoryAllocation(b.getPid(), b.getProcessName(), b.getSize()))
                .toList(),
            diskReadSpeed,
            diskWriteSpeed,
            networkSpeed
        );
    }

    // ==================== 内部类 ====================

    /**
     * 系统状态快照
     */
    public record SystemStatus(
        int cpuCores,
        double totalCpuUsage,
        double[] coreUsage,
        int[] corePid,
        int totalMemory,
        int usedMemory,
        List<MemoryAllocation> memoryAllocations,
        double diskReadSpeed,
        double diskWriteSpeed,
        double networkSpeed
    ) {}

    /**
     * 内存分配记录
     */
    public record MemoryAllocation(int pid, String processName, int size) {}
}
