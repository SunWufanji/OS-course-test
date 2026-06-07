package com.processos.hardware;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 物理内存管理器 — 16MB 连续物理内存，首次适应算法（First Fit）
 * 负责进程创建时分配内存、进程结束时释放内存、空闲分区合并
 */
@Component
public class MemoryManager {

    private static final int TOTAL_MEMORY = 16384; // 总物理内存 16MB (KB)
    private static final int OS_RESERVED = 1024;   // 系统内核预留 1MB

    // 空闲分区链（起始地址, 大小）
    private final List<int[]> freeList = new ArrayList<>();

    public MemoryManager() {
        // 初始化：系统预留1MB后，剩余15MB为空闲
        freeList.add(new int[]{OS_RESERVED, TOTAL_MEMORY - OS_RESERVED});
    }

    /**
     * 分配内存（首次适应算法）
     * @param size 需要的内存大小 (KB)
     * @return 分配的起始地址，-1 表示分配失败
     */
    public synchronized int allocate(int size) {
        for (int i = 0; i < freeList.size(); i++) {
            int[] block = freeList.get(i);
            if (block[1] >= size) {
                int startAddr = block[0];
                if (block[1] == size) {
                    // 恰好够，整块分配
                    freeList.remove(i);
                } else {
                    // 块更大，切割：保留剩余部分
                    block[0] += size;
                    block[1] -= size;
                }
                return startAddr;
            }
        }
        return -1; // 没有足够大的连续空闲块
    }

    /**
     * 释放内存
     * @param startAddr 起始地址
     * @param size 大小
     */
    public synchronized void free(int startAddr, int size) {
        // 加入空闲分区链
        freeList.add(new int[]{startAddr, size});
        // 按起始地址排序
        freeList.sort((a, b) -> a[0] - b[0]);
        // 合并相邻空闲分区
        merge();
    }

    /**
     * 合并相邻空闲分区
     */
    private void merge() {
        List<int[]> merged = new ArrayList<>();
        for (int[] block : freeList) {
            if (!merged.isEmpty()) {
                int[] last = merged.get(merged.size() - 1);
                // 如果相邻（上一块的结尾 == 当前块的开头）
                if (last[0] + last[1] == block[0]) {
                    last[1] += block[1]; // 合并
                    continue;
                }
            }
            merged.add(new int[]{block[0], block[1]});
        }
        freeList.clear();
        freeList.addAll(merged);
    }

    /**
     * 获取已使用内存总量
     */
    public synchronized int getUsedMemory() {
        int totalFree = 0;
        for (int[] block : freeList) {
            totalFree += block[1];
        }
        return TOTAL_MEMORY - totalFree;
    }

    /**
     * 获取空闲内存总量
     */
    public synchronized int getFreeMemory() {
        int totalFree = 0;
        for (int[] block : freeList) {
            totalFree += block[1];
        }
        return totalFree;
    }

    /**
     * 获取总内存
     */
    public int getTotalMemory() {
        return TOTAL_MEMORY;
    }

    /**
     * 获取空闲分区链快照（用于前端显示）
     */
    public synchronized List<Map<String, Integer>> getFreeListSnapshot() {
        List<Map<String, Integer>> snapshot = new ArrayList<>();
        for (int[] block : freeList) {
            snapshot.add(Map.of("start", block[0], "size", block[1]));
        }
        return snapshot;
    }

    /**
     * 重置内存管理器
     */
    public synchronized void reset() {
        freeList.clear();
        freeList.add(new int[]{OS_RESERVED, TOTAL_MEMORY - OS_RESERVED});
    }
}
