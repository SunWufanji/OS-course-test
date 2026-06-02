package com.processos.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 调度结果评估表
 */
@Entity
@Table(name = "performance_metrics")
public class PerformanceMetrics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private String sessionId;

    @Column(nullable = false)
    private String algorithm;

    @Column(name = "scenario_id")
    private Long scenarioId;

    @Column(name = "avg_turnaround")
    private BigDecimal avgTurnaround;

    @Column(name = "avg_waiting")
    private BigDecimal avgWaiting;

    @Column(name = "avg_weighted_turnaround")
    private BigDecimal avgWeightedTurnaround;

    private BigDecimal throughput;

    @Column(name = "cpu_utilization")
    private BigDecimal cpuUtilization;

    @Column(name = "total_time")
    private Integer totalTime;

    @Column(name = "completed_count")
    private Integer completedCount;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Constructors
    public PerformanceMetrics() {}

    public PerformanceMetrics(String sessionId, String algorithm, Long scenarioId) {
        this.sessionId = sessionId;
        this.algorithm = algorithm;
        this.scenarioId = scenarioId;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getAlgorithm() { return algorithm; }
    public void setAlgorithm(String algorithm) { this.algorithm = algorithm; }

    public Long getScenarioId() { return scenarioId; }
    public void setScenarioId(Long scenarioId) { this.scenarioId = scenarioId; }

    public BigDecimal getAvgTurnaround() { return avgTurnaround; }
    public void setAvgTurnaround(BigDecimal avgTurnaround) { this.avgTurnaround = avgTurnaround; }

    public BigDecimal getAvgWaiting() { return avgWaiting; }
    public void setAvgWaiting(BigDecimal avgWaiting) { this.avgWaiting = avgWaiting; }

    public BigDecimal getAvgWeightedTurnaround() { return avgWeightedTurnaround; }
    public void setAvgWeightedTurnaround(BigDecimal avgWeightedTurnaround) { this.avgWeightedTurnaround = avgWeightedTurnaround; }

    public BigDecimal getThroughput() { return throughput; }
    public void setThroughput(BigDecimal throughput) { this.throughput = throughput; }

    public BigDecimal getCpuUtilization() { return cpuUtilization; }
    public void setCpuUtilization(BigDecimal cpuUtilization) { this.cpuUtilization = cpuUtilization; }

    public Integer getTotalTime() { return totalTime; }
    public void setTotalTime(Integer totalTime) { this.totalTime = totalTime; }

    public Integer getCompletedCount() { return completedCount; }
    public void setCompletedCount(Integer completedCount) { this.completedCount = completedCount; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
