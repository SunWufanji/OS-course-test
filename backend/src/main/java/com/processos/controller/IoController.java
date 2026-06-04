package com.processos.controller;

import com.processos.hardware.IoManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * I/O 设备管理 API
 */
@RestController
@RequestMapping("/api/io")
@CrossOrigin(origins = "*")
public class IoController {

    @Autowired
    private IoManager ioManager;

    @Autowired
    private com.processos.process.ProcessManager processManager;

    // ==================== 独占设备 ====================

    /**
     * Word/Excel 点击"打印"按钮
     */
    @PostMapping("/print")
    public Map<String, Object> print(@RequestBody Map<String, Object> request) {
        int pid = (int) request.get("pid");
        String name = (String) request.get("processName");
        boolean success = ioManager.requestExclusiveDevice("PRINTER", pid, name);

        // 更新 PCB 状态
        var pcb = processManager.findProcess(pid);
        if (pcb != null) {
            if (success) {
                pcb.setOccupiedDevice("打印机");
            } else {
                pcb.setState(com.processos.model.ProcessState.BLOCKED);
                pcb.setBlockedReason("等待打印机");
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("success", success);
        result.put("message", success ? "已占用打印机" : "打印机已被占用，进程进入等待队列");
        result.putAll(ioManager.getAllExclusiveDeviceStatus());
        return result;
    }

    /**
     * 打印完成释放打印机
     */
    @PostMapping("/print-done")
    public Map<String, Object> printDone(@RequestBody Map<String, Object> request) {
        int pid = (int) request.get("pid");
        Integer wokenPid = ioManager.releaseExclusiveDevice("PRINTER", pid);

        // 释放当前进程的设备占用
        var pcb = processManager.findProcess(pid);
        if (pcb != null) {
            pcb.setOccupiedDevice(null);
        }

        // 唤醒等待队列中的下一个进程
        if (wokenPid != null) {
            var woken = processManager.findProcess(wokenPid);
            if (woken != null) {
                woken.setState(com.processos.model.ProcessState.RUNNING);
                woken.setBlockedReason(null);
                woken.setOccupiedDevice("打印机");
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("wokenPid", wokenPid);
        result.putAll(ioManager.getAllExclusiveDeviceStatus());
        return result;
    }

    @PostMapping("/exclusive/request")
    public Map<String, Object> requestExclusive(@RequestBody Map<String, Object> request) {
        String device = (String) request.get("device");
        int pid = (int) request.get("pid");
        String name = (String) request.get("processName");
        boolean success = ioManager.requestExclusiveDevice(device, pid, name);
        Map<String, Object> result = new HashMap<>();
        result.put("success", success);
        result.putAll(ioManager.getAllExclusiveDeviceStatus());
        return result;
    }

    @PostMapping("/exclusive/release")
    public Map<String, Object> releaseExclusive(@RequestBody Map<String, Object> request) {
        String device = (String) request.get("device");
        int pid = (int) request.get("pid");
        Integer wokenPid = ioManager.releaseExclusiveDevice(device, pid);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("wokenPid", wokenPid);
        result.putAll(ioManager.getAllExclusiveDeviceStatus());
        return result;
    }

    @GetMapping("/exclusive/status")
    public Map<String, Object> getExclusiveStatus() {
        return ioManager.getAllExclusiveDeviceStatus();
    }

    // ==================== 共享设备（耳机） ====================

    @PostMapping("/audio/play")
    public Map<String, Object> audioPlay(@RequestBody Map<String, Object> request) {
        int pid = (int) request.get("pid");
        String name = (String) request.get("processName");
        ioManager.audioPlay(pid, name);
        return ioManager.getAudioStatus();
    }

    @PostMapping("/audio/stop")
    public Map<String, Object> audioStop(@RequestBody Map<String, Object> request) {
        int pid = (int) request.get("pid");
        ioManager.audioStop(pid);
        return ioManager.getAudioStatus();
    }

    @GetMapping("/audio/status")
    public Map<String, Object> getAudioStatus() {
        return ioManager.getAudioStatus();
    }

    // ==================== 磁盘调度 ====================

    @PostMapping("/disk/request")
    public Map<String, Object> submitDiskRequest(@RequestBody Map<String, Object> request) {
        int pid = (int) request.get("pid");
        int track = (int) request.get("track");
        String type = (String) request.getOrDefault("type", "READ");
        ioManager.submitDiskRequest(pid, track, type);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("queueSize", ioManager.getDiskIoQueue().size());
        return result;
    }

    @PostMapping("/disk/schedule")
    public Map<String, Object> diskScheduleStep() {
        var processed = ioManager.diskScheduleStep();
        Map<String, Object> result = new HashMap<>();
        result.put("processed", processed != null);
        if (processed != null) {
            result.put("pid", processed.getPid());
            result.put("track", processed.getTrack());
            result.put("type", processed.getType());
        }
        result.putAll(ioManager.getFullStatus());
        return result;
    }

    @PostMapping("/disk/algorithm/{algorithm}")
    public Map<String, Object> setDiskAlgorithm(@PathVariable String algorithm) {
        ioManager.setDiskAlgorithm(algorithm);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("algorithm", algorithm);
        return result;
    }

    @GetMapping("/disk/status")
    public Map<String, Object> getDiskStatus() {
        return ioManager.getFullStatus();
    }

    // ==================== 综合状态 ====================

    @GetMapping("/status")
    public Map<String, Object> getFullStatus() {
        return ioManager.getFullStatus();
    }
}
