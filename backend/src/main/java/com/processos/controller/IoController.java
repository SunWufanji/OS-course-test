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

    // ==================== 独占设备 ====================

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
