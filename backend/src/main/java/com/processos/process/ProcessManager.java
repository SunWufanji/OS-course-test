package com.processos.process;

import com.processos.hardware.HardwarePool;
import com.processos.model.ProcessControlBlock;
import com.processos.model.ProcessState;
import com.processos.model.SimulatedApp;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * 进程管理器 - 沙盒模式的内核核心
 * 管理桌面应用的进程生命周期
 */
@Component
public class ProcessManager {

    @Autowired
    private HardwarePool hardwarePool;

    // 活跃进程表（Active Process Table）
    private final List<ProcessControlBlock> processTable = new CopyOnWriteArrayList<>();
    private int nextPid = 100;  // 沙盒进程从 PID 100 开始（避免和调度算法冲突）

    private static final String[] COLORS = {
        "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
        "#f43f5e", "#ef4444", "#f97316", "#eab308", "#84cc16",
        "#22c55e", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6"
    };

    /**
     * 启动应用 - 创建进程并分配资源
     * @param app 应用类型
     * @return 创建的进程，如果资源不足返回 null
     */
    public synchronized ProcessControlBlock launchApp(SimulatedApp app) {
        int pid = nextPid++;
        String color = COLORS[(pid - 100) % COLORS.length];

        // 1. 尝试分配内存
        boolean memoryOk = hardwarePool.allocateMemory(app.getMemoryRequired(), pid, app.getName());
        if (!memoryOk) {
            return null;  // 内存不足，启动失败
        }

        // 2. 分配 CPU 核心
        int coreIndex = hardwarePool.allocateCpuCore(pid);

        // 3. 创建进程控制块
        ProcessControlBlock pcb = new ProcessControlBlock(
            pid, app.getName(), app.getMemoryRequired(), 3, 0, color
        );
        pcb.setState(ProcessState.RUNNING);
        pcb.setAppType(app.name());
        pcb.setIcon(app.getIcon());
        pcb.setBaseCpuUsage(app.getCpuBaseUsage());
        pcb.setCpuUsage(app.getCpuBaseUsage());
        pcb.setMemoryUsage(app.getMemoryRequired());
        pcb.setDiskRead(app.getDiskRead());
        pcb.setDiskWrite(app.getDiskWrite());
        pcb.setNetworkSpeed(app.getNetworkSpeed());
        pcb.setCoreIndex(coreIndex);

        processTable.add(pcb);
        return pcb;
    }

    /**
     * 结束进程 - 释放所有资源
     * @param pid 进程 PID
     * @return 是否成功
     */
    public synchronized boolean killProcess(int pid) {
        ProcessControlBlock pcb = findProcess(pid);
        if (pcb == null) return false;

        // 释放内存
        hardwarePool.freeMemory(pid);

        // 释放 CPU 核心
        hardwarePool.freeAllCpuCores(pid);

        // 从进程表移除
        processTable.remove(pcb);
        return true;
    }

    /**
     * 挂起进程
     */
    public synchronized boolean suspendProcess(int pid) {
        ProcessControlBlock pcb = findProcess(pid);
        if (pcb == null || pcb.getState() != ProcessState.RUNNING) return false;

        pcb.setState(ProcessState.BLOCKED);
        hardwarePool.freeAllCpuCores(pid);
        return true;
    }

    /**
     * 恢复进程
     */
    public synchronized boolean resumeProcess(int pid) {
        ProcessControlBlock pcb = findProcess(pid);
        if (pcb == null || pcb.getState() != ProcessState.BLOCKED) return false;

        pcb.setState(ProcessState.RUNNING);
        int coreIndex = hardwarePool.allocateCpuCore(pid);
        pcb.setCoreIndex(coreIndex);
        return true;
    }

    /**
     * 更新所有进程的资源使用（抖动模拟）
     * 由定时任务每秒调用
     */
    public synchronized void updateResourceUsage() {
        for (ProcessControlBlock pcb : processTable) {
            if (pcb.getState() == ProcessState.RUNNING) {
                // CPU 使用率在基础值附近随机抖动
                double base = pcb.getBaseCpuUsage();
                double jitter = (Math.random() - 0.5) * 10;  // ±5% 抖动
                double newUsage = Math.max(1, Math.min(100, base + jitter));
                pcb.setCpuUsage(Math.round(newUsage * 10.0) / 10.0);

                // 内存使用率小幅抖动
                int memBase = pcb.getMemoryUsage();
                int memJitter = (int) ((Math.random() - 0.5) * memBase * 0.05);
                pcb.setCurrentMemoryUsage(Math.max(1, memBase + memJitter));
            }
        }
    }

    /**
     * 获取所有活跃进程
     */
    public List<ProcessControlBlock> getAllProcesses() {
        return new ArrayList<>(processTable);
    }

    /**
     * 根据 PID 查找进程
     */
    public ProcessControlBlock findProcess(int pid) {
        return processTable.stream()
            .filter(p -> p.getPid() == pid)
            .findFirst()
            .orElse(null);
    }

    /**
     * 获取进程数量
     */
    public int getProcessCount() {
        return processTable.size();
    }

    /**
     * 获取运行中的进程数
     */
    public int getRunningCount() {
        return (int) processTable.stream()
            .filter(p -> p.getState() == ProcessState.RUNNING)
            .count();
    }

    /**
     * 清空所有进程（重置）
     */
    public synchronized void clearAll() {
        for (ProcessControlBlock pcb : processTable) {
            hardwarePool.freeMemory(pcb.getPid());
            hardwarePool.freeAllCpuCores(pcb.getPid());
        }
        processTable.clear();
    }
}
