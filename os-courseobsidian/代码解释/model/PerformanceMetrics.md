# PerformanceMetrics.java — 调度结果评估（JPA 实体）

**包路径：** `com.processos.model.PerformanceMetrics`
**注解：** `@Entity` → 映射 `performance_metrics` 表

---

## 职责

记录每次模拟运行的**聚合统计指标**。与 `ExecutionLog`（每个进程一条）不同，这个表是一次模拟运行一条记录，汇总全局结果。

---

## 字段映射

| 字段 | 数据库列 | 说明 |
|------|---------|------|
| `id` | `id` (PK) | 自增主键 |
| `sessionId` | `session_id` | 模拟会话 UUID（关联 ExecutionLog） |
| `algorithm` | `algorithm` | 调度算法 |
| `scenarioId` | `scenario_id` | 关联的场景 ID（可选） |
| `avgTurnaround` | `avg_turnaround` (DECIMAL) | **平均周转时间** |
| `avgWaiting` | `avg_waiting` (DECIMAL) | **平均等待时间** |
| `avgWeightedTurnaround` | `avg_weighted_turnaround` (DECIMAL) | **平均带权周转时间**（周转/服务时间） |
| `throughput` | `throughput` (DECIMAL) | **吞吐量**（单位时间完成进程数） |
| `cpuUtilization` | `cpu_utilization` (DECIMAL) | **CPU 利用率**（0-100%） |
| `totalTime` | `total_time` (INT) | 模拟总时间 |
| `completedCount` | `completed_count` (INT) | 完成的进程数 |
| `createdAt` | `created_at` | 记录创建时间 |

---

## 核心指标含义

| 指标 | 计算公式 | 评价意义 |
|------|---------|---------|
| 平均周转时间 | `Σ(完成时间-到达时间) / N` | 用户体验——越小越快 |
| 平均等待时间 | `Σ(周转时间-执行时间) / N` | 调度效率——越小越好 |
| 平均带权周转时间 | `Σ(周转时间/执行时间) / N` | 公平性——越接近 1 越好 |
| 吞吐量 | `完成进程数 / 总时间` | 系统效率——越大越好 |
| CPU 利用率 | `有效工作时间 / 总时间 × 100%` | 资源利用——越高越好 |

---

## 调用关系

```
ProcessService.savePerformanceMetrics()
    │
    ├── 从调度器收集统计信息
    ├── 计算各指标
    ├── 构建 PerformanceMetrics 对象
    └── PerformanceMetricsRepository.save(metrics)

ProcessController.getHistoryRecords()
    → PerformanceMetricsRepository.findTop10ByOrderByCreatedAtDesc()
    → 前端历史记录列表
```

---

## 特殊逻辑

- **Decimal 精度**：`BigDecimal` 类型保证计算精度，特别适合带权周转时间这种小数运算。
- **scenarioId 关联**：可选的场景关联，在分析"哪种算法最适合哪种负载"时有用。
- **时间戳自动生成**：`@PrePersist` 自动设置 `createdAt`。
