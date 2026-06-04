package com.processos.hardware;

import java.util.LinkedList;
import java.util.Queue;

/**
 * 独占设备 — 同一时间只能被一个进程占用
 * 如：打印机、U盘（写入时）
 */
public class ExclusiveDevice {

    private String name;
    private String status;             // IDLE / BUSY
    private Integer occupiedByPid;
    private String occupiedByName;
    private final Queue<WaitEntry> waitingQueue = new LinkedList<>();

    public ExclusiveDevice(String name) {
        this.name = name;
        this.status = "IDLE";
    }

    /**
     * 申请设备
     * @return true=成功占用, false=需要排队等待
     */
    public synchronized boolean request(int pid, String processName) {
        if ("IDLE".equals(status)) {
            status = "BUSY";
            occupiedByPid = pid;
            occupiedByName = processName;
            return true;
        } else {
            // 加入等待队列
            waitingQueue.add(new WaitEntry(pid, processName));
            return false;
        }
    }

    /**
     * 释放设备，唤醒队列中的下一个进程
     * @return 被唤醒的进程 PID，如果没有则返回 null
     */
    public synchronized Integer release(int pid) {
        if (occupiedByPid != null && occupiedByPid == pid) {
            if (!waitingQueue.isEmpty()) {
                WaitEntry next = waitingQueue.poll();
                occupiedByPid = next.pid;
                occupiedByName = next.processName;
                return next.pid;  // 唤醒下一个
            } else {
                status = "IDLE";
                occupiedByPid = null;
                occupiedByName = null;
                return null;
            }
        }
        return null;
    }

    public boolean isBusy() { return "BUSY".equals(status); }
    public String getName() { return name; }
    public String getStatus() { return status; }
    public Integer getOccupiedByPid() { return occupiedByPid; }
    public String getOccupiedByName() { return occupiedByName; }
    public Queue<WaitEntry> getWaitingQueue() { return waitingQueue; }

    public static class WaitEntry {
        public int pid;
        public String processName;
        public WaitEntry(int pid, String processName) {
            this.pid = pid;
            this.processName = processName;
        }
    }
}
