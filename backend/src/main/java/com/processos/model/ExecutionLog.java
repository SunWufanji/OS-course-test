package com.processos.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 进程执行轨迹表
 */
@Entity
@Table(name = "execution_log")
public class ExecutionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private String sessionId;

    @Column(nullable = false)
    private Integer pid;

    @Column(name = "process_name", nullable = false)
    private String processName;

    @Column(nullable = false)
    private String algorithm;

    @Column(name = "created_time")
    private Integer createdTime;

    @Column(name = "ready_time")
    private Integer readyTime;

    @Column(name = "start_time")
    private Integer startTime;

    @Column(name = "end_time")
    private Integer endTime;

    @Column(name = "blocked_time")
    private Integer blockedTime;

    @Column(name = "burst_time")
    private Integer burstTime;

    @Column(name = "arrival_time")
    private Integer arrivalTime;

    @Column(name = "priority")
    private Integer priority;

    @Column(name = "waiting_time")
    private Integer waitingTime;

    @Column(name = "turnaround_time")
    private Integer turnaroundTime;

    @Column(name = "completion_time")
    private Integer completionTime;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Constructors
    public ExecutionLog() {}

    public ExecutionLog(String sessionId, Integer pid, String processName, String algorithm) {
        this.sessionId = sessionId;
        this.pid = pid;
        this.processName = processName;
        this.algorithm = algorithm;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public Integer getPid() { return pid; }
    public void setPid(Integer pid) { this.pid = pid; }

    public String getProcessName() { return processName; }
    public void setProcessName(String processName) { this.processName = processName; }

    public String getAlgorithm() { return algorithm; }
    public void setAlgorithm(String algorithm) { this.algorithm = algorithm; }

    public Integer getCreatedTime() { return createdTime; }
    public void setCreatedTime(Integer createdTime) { this.createdTime = createdTime; }

    public Integer getReadyTime() { return readyTime; }
    public void setReadyTime(Integer readyTime) { this.readyTime = readyTime; }

    public Integer getStartTime() { return startTime; }
    public void setStartTime(Integer startTime) { this.startTime = startTime; }

    public Integer getEndTime() { return endTime; }
    public void setEndTime(Integer endTime) { this.endTime = endTime; }

    public Integer getBlockedTime() { return blockedTime; }
    public void setBlockedTime(Integer blockedTime) { this.blockedTime = blockedTime; }

    public Integer getBurstTime() { return burstTime; }
    public void setBurstTime(Integer burstTime) { this.burstTime = burstTime; }

    public Integer getWaitingTime() { return waitingTime; }
    public void setWaitingTime(Integer waitingTime) { this.waitingTime = waitingTime; }

    public Integer getTurnaroundTime() { return turnaroundTime; }
    public void setTurnaroundTime(Integer turnaroundTime) { this.turnaroundTime = turnaroundTime; }

    public Integer getCompletionTime() { return completionTime; }
    public void setCompletionTime(Integer completionTime) { this.completionTime = completionTime; }

    public Integer getArrivalTime() { return arrivalTime; }
    public void setArrivalTime(Integer arrivalTime) { this.arrivalTime = arrivalTime; }

    public Integer getPriority() { return priority; }
    public void setPriority(Integer priority) { this.priority = priority; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
