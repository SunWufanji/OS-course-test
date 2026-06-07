package com.processos.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 进程执行轨迹表 — 每个进程从创建到完成的完整时间线记录
 * 一次模拟运行（一次sessionId）会产生N条ExecutionLog，每个进程一条
 * 用于历史回放、算法对比分析
 */
@Entity
@Table(name = "execution_log")
public class ExecutionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;                     // 自增主键（数据库自动生成）

    @Column(name = "session_id", nullable = false)
    private String sessionId;            // 模拟会话UUID — 一次模拟运行一个UUID，所有进程共享

    @Column(nullable = false)
    private Integer pid;                 // 进程ID（这个日志属于哪个进程）

    @Column(name = "process_name", nullable = false)
    private String processName;          // 进程名（如"P1"、"CS:GO"）

    @Column(nullable = false)
    private String algorithm;            // 本次运行使用的调度算法（FCFS/SJF/RR等）

    @Column(name = "created_time")
    private Integer createdTime;         // 进程创建时间点（在第几个tick被创建）

    @Column(name = "ready_time")
    private Integer readyTime;           // 进入就绪队列的时间点（不一定等于创建时间）

    @Column(name = "start_time")
    private Integer startTime;           // ★ 首次上CPU的时间点（计算响应时间的关键字段）

    @Column(name = "end_time")
    private Integer endTime;             // 结束时间点（进程完成或被终止时的tick编号）

    @Column(name = "blocked_time")
    private Integer blockedTime;         // 阻塞总时长（进程在BLOCKED状态的tick总数）

    @Column(name = "burst_time")
    private Integer burstTime;           // CPU执行时间需求（需要跑多少个tick）

    @Column(name = "arrival_time")
    private Integer arrivalTime;         // 到达时间（进程何时进入系统）

    @Column(name = "priority")
    private Integer priority;            // 优先级（1最高~5最低）

    @Column(name = "waiting_time")
    private Integer waitingTime;         // 等待时间 = 周转时间 - 执行时间 - 阻塞时间

    @Column(name = "turnaround_time")
    private Integer turnaroundTime;      // ★ 周转时间 = completionTime - arrivalTime（调度算法最重要指标）

    @Column(name = "completion_time")
    private Integer completionTime;      // 完成时间点（进程完成的tick编号）

    @Column(name = "created_at")
    private LocalDateTime createdAt;     // ★ 数据库记录创建时间（不是进程创建时间）

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now(); // save()之前自动赋值为当前时间
    }

    // Constructors
    public ExecutionLog() {}             // JPA需要的空构造器

    public ExecutionLog(String sessionId, Integer pid, String processName, String algorithm) {
        // 创建日志时必须确定：哪次模拟的哪个进程用的什么算法
        this.sessionId = sessionId;
        this.pid = pid;
        this.processName = processName;
        this.algorithm = algorithm;
    }

    // ========== Getters and Setters ==========
    // 所有的getter/setter由Spring/Jackson用于JSON序列化
    // JPA/Hibernate也通过setter将数据库行数据写入对象

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

    public Integer getCreatedTime() { return createdTime; }    // 创建时间点（tick编号）
    public void setCreatedTime(Integer createdTime) { this.createdTime = createdTime; }

    public Integer getReadyTime() { return readyTime; }        // 进入就绪队列时间点
    public void setReadyTime(Integer readyTime) { this.readyTime = readyTime; }

    public Integer getStartTime() { return startTime; }        // ★ 首次上CPU的时间点
    public void setStartTime(Integer startTime) { this.startTime = startTime; }

    public Integer getEndTime() { return endTime; }            // 结束时间点
    public void setEndTime(Integer endTime) { this.endTime = endTime; }

    public Integer getBlockedTime() { return blockedTime; }    // 阻塞总时长
    public void setBlockedTime(Integer blockedTime) { this.blockedTime = blockedTime; }

    public Integer getBurstTime() { return burstTime; }        // CPU执行时间需求
    public void setBurstTime(Integer burstTime) { this.burstTime = burstTime; }

    public Integer getWaitingTime() { return waitingTime; }    // 等待时间 = 周转-执行-阻塞
    public void setWaitingTime(Integer waitingTime) { this.waitingTime = waitingTime; }

    public Integer getTurnaroundTime() { return turnaroundTime; }  // ★ 周转时间
    public void setTurnaroundTime(Integer turnaroundTime) { this.turnaroundTime = turnaroundTime; }

    public Integer getCompletionTime() { return completionTime; }  // 完成时间点
    public void setCompletionTime(Integer completionTime) { this.completionTime = completionTime; }

    public Integer getArrivalTime() { return arrivalTime; }    // 到达时间
    public void setArrivalTime(Integer arrivalTime) { this.arrivalTime = arrivalTime; }

    public Integer getPriority() { return priority; }          // 优先级（1~5）
    public void setPriority(Integer priority) { this.priority = priority; }

    public LocalDateTime getCreatedAt() { return createdAt; }  // 数据库记录创建时间
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
