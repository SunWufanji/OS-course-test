# Repository 层 — 总览

**包路径：** `com.processos.repository`
**共 4 个文件**

---

## 职责

**数据库访问层（DAO）**。所有文件都是 **Spring Data JPA 的 Repository 接口**——只需要定义接口方法签名，Spring 自动生成 SQL 实现。

对接的 4 张 MySQL 表：

| Repository | 对应的表 | 实体 |
|-----------|---------|------|
| `ExecutionLogRepository` | `execution_log` | ExecutionLog |
| `PerformanceMetricsRepository` | `performance_metrics` | PerformanceMetrics |
| `ScenarioConfigRepository` | `scenario_config` | ScenarioConfig |
| `SystemEventRepository` | `system_events` | SystemEvent |

---

## 文件一览

| 文件 | 特点 | 主要查询维度 |
|------|------|-------------|
| [ExecutionLogRepository](ExecutionLogRepository.md) | `List<T>` 返回 | sessionId, algorithm |
| [PerformanceMetricsRepository](PerformanceMetricsRepository.md) | `List<T>` + Top10 | sessionId, algorithm, scenarioId |
| [ScenarioConfigRepository](ScenarioConfigRepository.md) | `Optional<T>` 支持 | loadType, isDefault, scenarioName |
| [SystemEventRepository](SystemEventRepository.md) | **`Page<T>` 分页** | level, source, keyword 组合筛选 |

---

## 分层关系

```
Controller 层
    │  HTTP 请求
Service 层 (SystemEventService / ProcessService)
    │  业务逻辑 → 调用 Repository
Repository 层 ←── 本包
    │  JPA 自动生成 SQL
MySQL 数据库
```

---

## Spring Data JPA 原理

每个 Repository 继承 `JpaRepository<T, ID>`，自动拥有：

```
save(entity)         — INSERT / UPDATE
saveAll(entities)    — 批量写入
findById(id)         — 按主键查询
findAll()            — 查询全部
findAll(Specification) — 条件查询
count()              — 统计
delete(entity)       — 删除
deleteById(id)       — 按主键删除
deleteAll()          — 清空
```

**自定义方法命名规则**（Spring 自动解析方法名生成 SQL）：

| 关键字 | SQL 片段 |
|--------|---------|
| `findByXxx` | `WHERE xxx = ?` |
| `findByXxxAndYyy` | `WHERE xxx = ? AND yyy = ?` |
| `findByXxxOrderByYyyDesc` | `WHERE xxx = ? ORDER BY yyy DESC` |
| `findTop10ByXxx` | `LIMIT 10` |
| `deleteByXxx` | `DELETE WHERE xxx = ?` |
| `findByXxxContainingIgnoreCase` | `WHERE xxx LIKE %?%`（忽略大小写） |

---

## 关键区别

| Repository | 分页支持 | 主要用于 |
|-----------|---------|---------|
| `ExecutionLog` | ❌ | 历史详情、回放 |
| `PerformanceMetrics` | ❌ | 最近 10 条历史记录 |
| `ScenarioConfig` | ❌ | 预设场景 CRUD |
| `SystemEvent` | **✅ Page** | 日志查看器（需要翻页） |

`SystemEventRepository` 是唯一使用 `Page<T>` 分页的，因为系统日志会积累大量数据（每次 tick 可能产生多条），需要分页展示。
