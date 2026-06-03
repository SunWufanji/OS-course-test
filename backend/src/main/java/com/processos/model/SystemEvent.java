package com.processos.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 系统事件日志 — 仿 Windows Event Viewer
 */
@Entity
@Table(name = "system_events")
public class SystemEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 日志级别：INFO / SUCCESS / WARNING / ERROR */
    @Column(nullable = false, length = 20)
    private String level;

    /** 事件来源：PROCESS_MGR / MEMORY_MGR / LAB / SYNC / SYSTEM */
    @Column(nullable = false, length = 30)
    private String source;

    /** 事件消息 */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    /** 关联进程 PID（可选） */
    private Integer pid;

    /** 关联进程名（可选） */
    @Column(name = "process_name", length = 50)
    private String processName;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public SystemEvent() {}

    public SystemEvent(String level, String source, String message) {
        this.level = level;
        this.source = source;
        this.message = message;
    }

    public SystemEvent(String level, String source, String message, Integer pid, String processName) {
        this.level = level;
        this.source = source;
        this.message = message;
        this.pid = pid;
        this.processName = processName;
    }

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Integer getPid() { return pid; }
    public void setPid(Integer pid) { this.pid = pid; }
    public String getProcessName() { return processName; }
    public void setProcessName(String processName) { this.processName = processName; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
