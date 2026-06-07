# PerformanceMetricsRepository.java — 调度结果评估仓库

**包路径：** `com.processos.repository.PerformanceMetricsRepository`
**注解：** `@Repository`
**继承：** `JpaRepository<PerformanceMetrics, Long>`

---

## 职责

提供 `PerformanceMetrics`（`performance_metrics` 表）的数据库操作。用于查询历史模拟的性能指标（平均周转时间、吞吐量、CPU 利用率等）。

---

## 自定义查询方法

| 方法 | 生成的 SQL |
|------|-----------|
| `findBySessionId(sessionId)` | `WHERE session_id = ?` |
| `findByAlgorithm(algorithm)` | `WHERE algorithm = ?` |
| `findByScenarioId(scenarioId)` | `WHERE scenario_id = ?` |
| `findTop10ByOrderByCreatedAtDesc()` | `ORDER BY created_at DESC LIMIT 10` |
| `findByAlgorithmAndScenarioId(algo, sid)` | `WHERE algorithm = ? AND scenario_id = ?` |
| `deleteBySessionId(sessionId)` | `DELETE FROM performance_metrics WHERE session_id = ?` |

---

## 调用关系

```
ProcessService.savePerformanceMetrics()
    → PerformanceMetricsRepository.save(metrics)  — 写入一条聚合记录

ProcessController.getHistory()
    → PerformanceMetricsRepository.findTop10ByOrderByCreatedAtDesc()
    → 返回最近 10 条模拟记录

ProcessController.deleteHistoryRecord(id)
    → PerformanceMetricsRepository.deleteById(id)  — 删除单条
    → 同时删除关联的 ExecutionLog

ProcessController.replayFromHistory(id)
    → PerformanceMetricsRepository.findById(id)
    → 获取 sessionId → 读取 ExecutionLog → 重新创建进程
```

---

## 特殊逻辑

- **Top10 限制**：`findTop10ByOrderByCreatedAtDesc()` 限制只展示最近 10 次模拟，防止历史记录无限增长。
- **多种查询维度**：支持按算法、按场景、按算法的组合查询，用于"哪个算法对哪种负载最优"的分析。
