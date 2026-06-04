package com.processos.hardware;

import org.springframework.stereotype.Component;

import java.util.*;

/**
 * I/O 设备管理器 — 统一管理独占设备、共享设备、磁盘调度
 */
@Component
public class IoManager {

    // ==================== 独占设备 ====================
    private final Map<String, ExclusiveDevice> exclusiveDevices = new LinkedHashMap<>();

    // ==================== 共享设备 ====================
    private final List<Integer> activeAudioPids = new ArrayList<>();  // 正在使用耳机的进程

    // ==================== 磁盘调度 ====================
    private int currentHeadPosition = 100;  // 磁头当前位置 (0-199)
    private final List<DiskRequest> diskIoQueue = new ArrayList<>();
    private String currentDiskAlgorithm = "SSTF";
    private final List<String> diskLog = new ArrayList<>();
    private int totalSeekLength = 0;

    public IoManager() {
        // 初始化独占设备
        exclusiveDevices.put("PRINTER", new ExclusiveDevice("PRINTER"));
        exclusiveDevices.put("USB_DISK", new ExclusiveDevice("USB_DISK"));
    }

    // ==================== 独占设备 API ====================

    /**
     * 申请独占设备
     * @return true=成功, false=需要排队
     */
    public boolean requestExclusiveDevice(String deviceName, int pid, String processName) {
        ExclusiveDevice device = exclusiveDevices.get(deviceName);
        if (device == null) return false;
        return device.request(pid, processName);
    }

    /**
     * 释放独占设备
     * @return 被唤醒的进程 PID，如果没有则返回 null
     */
    public Integer releaseExclusiveDevice(String deviceName, int pid) {
        ExclusiveDevice device = exclusiveDevices.get(deviceName);
        if (device == null) return null;
        return device.release(pid);
    }

    /**
     * 获取独占设备状态
     */
    public Map<String, Object> getExclusiveDeviceStatus(String deviceName) {
        ExclusiveDevice device = exclusiveDevices.get(deviceName);
        if (device == null) return null;
        Map<String, Object> status = new HashMap<>();
        status.put("name", device.getName());
        status.put("status", device.getStatus());
        status.put("occupiedByPid", device.getOccupiedByPid());
        status.put("occupiedByName", device.getOccupiedByName());
        List<Map<String, Object>> queue = new ArrayList<>();
        for (ExclusiveDevice.WaitEntry entry : device.getWaitingQueue()) {
            Map<String, Object> item = new HashMap<>();
            item.put("pid", entry.pid);
            item.put("processName", entry.processName);
            queue.add(item);
        }
        status.put("waitingQueue", queue);
        return status;
    }

    /**
     * 获取所有独占设备状态
     */
    public Map<String, Object> getAllExclusiveDeviceStatus() {
        Map<String, Object> result = new HashMap<>();
        for (Map.Entry<String, ExclusiveDevice> entry : exclusiveDevices.entrySet()) {
            result.put(entry.getKey(), getExclusiveDeviceStatus(entry.getKey()));
        }
        return result;
    }

    // ==================== 共享设备（耳机）API ====================

    public synchronized void audioPlay(int pid, String processName) {
        if (!activeAudioPids.contains(pid)) {
            activeAudioPids.add(pid);
        }
    }

    public synchronized void audioStop(int pid) {
        activeAudioPids.remove(Integer.valueOf(pid));
    }

    public Map<String, Object> getAudioStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("activePids", new ArrayList<>(activeAudioPids));
        status.put("count", activeAudioPids.size());
        return status;
    }

    // ==================== 磁盘调度 API ====================

    /**
     * 提交磁盘 I/O 请求
     */
    public synchronized void submitDiskRequest(int pid, int track, String type) {
        DiskRequest req = new DiskRequest(pid, track, type);
        diskIoQueue.add(req);
    }

    /**
     * 获取磁盘调度算法列表
     */
    public List<String> getDiskAlgorithms() {
        return Arrays.asList("FCFS", "SSTF", "SCAN", "CSCAN");
    }

    /**
     * 设置磁盘调度算法
     */
    public void setDiskAlgorithm(String algorithm) {
        this.currentDiskAlgorithm = algorithm;
    }

    /**
     * 磁盘调度一步（根据算法选择下一个磁道）
     * @return 被处理的请求，如果没有请求返回 null
     */
    public synchronized DiskRequest diskScheduleStep() {
        if (diskIoQueue.isEmpty()) return null;

        DiskRequest next = null;

        switch (currentDiskAlgorithm) {
            case "FCFS":
                next = diskIoQueue.remove(0);
                break;
            case "SSTF":
                next = selectSSTF();
                break;
            case "SCAN":
                next = selectSCAN(true);
                break;
            case "CSCAN":
                next = selectCSCAN();
                break;
            default:
                next = diskIoQueue.remove(0);
        }

        if (next != null) {
            int seekLength = Math.abs(next.getTrack() - currentHeadPosition);
            totalSeekLength += seekLength;
            currentHeadPosition = next.getTrack();
            next.setHandled(true);
            diskLog.add("磁头移动: " + (currentHeadPosition - seekLength) + " → " + currentHeadPosition + " (寻道长度=" + seekLength + ", 请求Track=" + next.getTrack() + ")");
        }

        return next;
    }

    private DiskRequest selectSSTF() {
        int minDist = Integer.MAX_VALUE;
        int minIdx = 0;
        for (int i = 0; i < diskIoQueue.size(); i++) {
            int dist = Math.abs(diskIoQueue.get(i).getTrack() - currentHeadPosition);
            if (dist < minDist) {
                minDist = dist;
                minIdx = i;
            }
        }
        return diskIoQueue.remove(minIdx);
    }

    private DiskRequest selectSCAN(boolean forward) {
        // 电梯算法：先向一个方向走到底，再反向
        diskIoQueue.sort(Comparator.comparingInt(DiskRequest::getTrack));
        for (DiskRequest req : diskIoQueue) {
            if (forward && req.getTrack() >= currentHeadPosition) {
                diskIoQueue.remove(req);
                return req;
            }
        }
        // 反向
        for (int i = diskIoQueue.size() - 1; i >= 0; i--) {
            if (diskIoQueue.get(i).getTrack() <= currentHeadPosition) {
                return diskIoQueue.remove(i);
            }
        }
        return diskIoQueue.remove(0);
    }

    private DiskRequest selectCSCAN() {
        // 循环扫描：只向一个方向走，到头后跳回起点
        diskIoQueue.sort(Comparator.comparingInt(DiskRequest::getTrack));
        for (DiskRequest req : diskIoQueue) {
            if (req.getTrack() >= currentHeadPosition) {
                diskIoQueue.remove(req);
                return req;
            }
        }
        // 跳回起点
        currentHeadPosition = 0;
        return diskIoQueue.remove(0);
    }

    // ==================== 综合状态 ====================

    public Map<String, Object> getFullStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("exclusiveDevices", getAllExclusiveDeviceStatus());
        status.put("audio", getAudioStatus());
        status.put("diskHead", currentHeadPosition);
        status.put("diskAlgorithm", currentDiskAlgorithm);
        status.put("diskQueue", diskIoQueue.size());
        status.put("diskLog", new ArrayList<>(diskLog.subList(Math.max(0, diskLog.size() - 10), diskLog.size())));
        status.put("totalSeekLength", totalSeekLength);
        return status;
    }

    public void clearDiskLog() { diskLog.clear(); totalSeekLength = 0; }
    public int getDiskHeadPosition() { return currentHeadPosition; }
    public List<DiskRequest> getDiskIoQueue() { return diskIoQueue; }
    public String getCurrentDiskAlgorithm() { return currentDiskAlgorithm; }
}
