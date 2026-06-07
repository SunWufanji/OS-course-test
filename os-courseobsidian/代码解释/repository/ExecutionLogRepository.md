# ExecutionLogRepository.java — 进程执行轨迹仓库

**包路径：** `com.processos.repository.ExecutionLogRepository`
**注解：** `@Repository`
**继承：** `JpaRepository<ExecutionLog, Long>`

---

## 职责

提供 `ExecutionLog`（`execution_log` 表）的数据库操作。`ProcessService` 通过这个 Repository 读写每个进程的执行轨迹。

---

## 继承自 JpaRepository 的方法

| 方法 | SQL 对应 |
|------|---------|
| `findAll()` | `SELECT * FROM execution_log` |
| `findById(id)` | `SELECT * FROM execution_log WHERE id = ?` |
| `save(entity)` | `INSERT` 或 `UPDATE` |
| `delete(entity)` | `DELETE FROM execution_log WHERE id = ?` |
| `count()` | `SELECT COUNT(*) FROM execution_log` |

## 自定义查询方法

Spring Data JPA 根据方法名自动生成 SQL：

| 方法 | 生成的 SQL |
|------|-----------|
| `findBySessionId(sessionId)` | `WHERE session_id = ?` |
| `findByAlgorithm(algorithm)` | `WHERE algorithm = ?` |
| `findBySessionIdAndAlgorithm(sid, algo)` | `WHERE session_id = ? AND algorithm = ?` |
| `findTop10ByOrderByCreatedAtDesc()` | `ORDER BY created_at DESC LIMIT 10` |
| `deleteBySessionId(sessionId)` | `DELETE FROM execution_log WHERE session_id = ?` |

---

## 调用关系

```
ProcessService.saveExecutionLogs()
    → ExecutionLogRepository.saveAll(logs)  — 批量写入

ProcessService.getHistoryProcesses(id)
    → ExecutionLogRepository.findBySessionId(sessionId)  — 查询某次模拟的进程详情

ProcessController.deleteHistoryRecord(id)
    → ExecutionLogRepository.deleteBySessionId(sessionId)  — 删除关联记录
```
