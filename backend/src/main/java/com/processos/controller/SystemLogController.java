package com.processos.controller;

import com.processos.model.SystemEvent;
import com.processos.service.SystemEventService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 系统事件日志 API — 桌面"系统日志"应用的后端
 */
@RestController
@RequestMapping("/api/events")
@CrossOrigin(origins = "*")
public class SystemLogController {

    @Autowired
    private SystemEventService eventService;

    /**
     * 分页查询日志
     * GET /api/events?page=0&size=15&level=ERROR&source=PROCESS_MGR&keyword=csgo
     */
    @GetMapping
    public Map<String, Object> getEvents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String keyword) {

        Page<SystemEvent> result;
        if (keyword != null && !keyword.isEmpty()) {
            if (level != null && !level.isEmpty()) {
                result = eventService.searchEventsByLevel(level, keyword, page, size);
            } else {
                result = eventService.searchEvents(keyword, page, size);
            }
        } else if (level != null && !level.isEmpty() && source != null && !source.isEmpty()) {
            result = eventService.getEventsByLevelAndSource(level, source, page, size);
        } else if (level != null && !level.isEmpty()) {
            result = eventService.getEventsByLevel(level, page, size);
        } else if (source != null && !source.isEmpty()) {
            result = eventService.getEventsBySource(source, page, size);
        } else {
            result = eventService.getEvents(page, size);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("content", result.getContent());
        response.put("totalPages", result.getTotalPages());
        response.put("totalElements", result.getTotalElements());
        response.put("currentPage", result.getNumber());
        response.put("size", result.getSize());
        return response;
    }

    /**
     * 实时刷新 — 获取最新 N 条日志
     */
    @GetMapping("/latest")
    public java.util.List<SystemEvent> getLatest(@RequestParam(defaultValue = "50") int count) {
        return eventService.getLatestEvents(count);
    }

    /**
     * 清空日志
     */
    @DeleteMapping
    public Map<String, Boolean> clearAll() {
        eventService.clearAll();
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", true);
        return result;
    }

    /**
     * 日志统计
     */
    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalCount", eventService.getTotalCount());
        stats.put("infoCount", eventService.getEventsByLevel("INFO", 0, 1).getTotalElements());
        stats.put("successCount", eventService.getEventsByLevel("SUCCESS", 0, 1).getTotalElements());
        stats.put("warningCount", eventService.getEventsByLevel("WARNING", 0, 1).getTotalElements());
        stats.put("errorCount", eventService.getEventsByLevel("ERROR", 0, 1).getTotalElements());
        return stats;
    }
}
