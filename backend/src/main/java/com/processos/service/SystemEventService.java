package com.processos.service;

import com.processos.model.SystemEvent;
import com.processos.repository.SystemEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 系统事件日志服务
 * 负责写入和查询系统事件
 */
@Service
public class SystemEventService {

    @Autowired
    private SystemEventRepository eventRepository;

    // ===== 写入方法 =====

    public void info(String source, String message) {
        save(new SystemEvent("INFO", source, message));
    }

    public void info(String source, String message, int pid, String processName) {
        save(new SystemEvent("INFO", source, message, pid, processName));
    }

    public void success(String source, String message) {
        save(new SystemEvent("SUCCESS", source, message));
    }

    public void success(String source, String message, int pid, String processName) {
        save(new SystemEvent("SUCCESS", source, message, pid, processName));
    }

    public void warning(String source, String message) {
        save(new SystemEvent("WARNING", source, message));
    }

    public void warning(String source, String message, int pid, String processName) {
        save(new SystemEvent("WARNING", source, message, pid, processName));
    }

    public void error(String source, String message) {
        save(new SystemEvent("ERROR", source, message));
    }

    private void save(SystemEvent event) {
        eventRepository.save(event);
    }

    // ===== 查询方法 =====

    /**
     * 分页查询所有日志
     */
    public Page<SystemEvent> getEvents(int page, int size) {
        return eventRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
    }

    /**
     * 按级别筛选
     */
    public Page<SystemEvent> getEventsByLevel(String level, int page, int size) {
        return eventRepository.findByLevelOrderByCreatedAtDesc(level, PageRequest.of(page, size));
    }

    /**
     * 按来源筛选
     */
    public Page<SystemEvent> getEventsBySource(String source, int page, int size) {
        return eventRepository.findBySourceOrderByCreatedAtDesc(source, PageRequest.of(page, size));
    }

    /**
     * 按级别+来源筛选
     */
    public Page<SystemEvent> getEventsByLevelAndSource(String level, String source, int page, int size) {
        return eventRepository.findByLevelAndSourceOrderByCreatedAtDesc(level, source, PageRequest.of(page, size));
    }

    /**
     * 关键词搜索
     */
    public Page<SystemEvent> searchEvents(String keyword, int page, int size) {
        return eventRepository.findByMessageContainingIgnoreCaseOrderByCreatedAtDesc(keyword, PageRequest.of(page, size));
    }

    /**
     * 按级别+关键词搜索
     */
    public Page<SystemEvent> searchEventsByLevel(String level, String keyword, int page, int size) {
        return eventRepository.findByLevelAndMessageContainingIgnoreCaseOrderByCreatedAtDesc(level, keyword, PageRequest.of(page, size));
    }

    /**
     * 获取最新 N 条日志（用于实时刷新）
     */
    public List<SystemEvent> getLatestEvents(int count) {
        return eventRepository.findTop50ByOrderByCreatedAtDesc();
    }

    /**
     * 清空所有日志
     */
    public void clearAll() {
        eventRepository.deleteAll();
    }

    /**
     * 获取日志总数
     */
    public long getTotalCount() {
        return eventRepository.count();
    }
}
