# SystemEventRepository.java — 系统事件日志仓库

**包路径：** `com.processos.repository.SystemEventRepository`
**注解：** `@Repository`
**继承：** `JpaRepository<SystemEvent, Long>`

---

## 职责

提供 `SystemEvent`（`system_events` 表）的数据库操作。支持**分页查询**、**多条件筛选**（级别/来源/关键字），用于桌面"系统日志"应用。

**与其他 Repository 的区别：** 这个返回 `Page<T>` 而不是 `List<T>`，支持分页。

---

## 自定义查询方法

### 分页查询（返回 Page）

| 方法 | 生成的 SQL |
|------|-----------|
| `findAllByOrderByCreatedAtDesc(page)` | `ORDER BY created_at DESC`，支持分页 |
| `findByLevelOrderByCreatedAtDesc(level, page)` | `WHERE level = ? ORDER BY created_at DESC` |
| `findBySourceOrderByCreatedAtDesc(source, page)` | `WHERE source = ? ORDER BY created_at DESC` |
| `findByLevelAndSourceOrderByCreatedAtDesc(l, s, page)` | `WHERE level = ? AND source = ?` |
| `findByMessageContainingIgnoreCaseOrderByCreatedAtDesc(kw, page)` | `WHERE message LIKE %keyword%` |
| `findByLevelAndMessageContainingIgnoreCaseOrderByCreatedAtDesc(lvl, kw, page)` | `WHERE level = ? AND message LIKE %kw%` |

### 非分页查询

| 方法 | 说明 |
|------|------|
| `findTop50ByOrderByCreatedAtDesc()` | 获取最新 50 条（实时刷新） |
| `deleteAllByOrderByCreatedAtDesc()` | 清空所有日志 |

---

## 调用关系

```
SystemLogController.getEvents(page, size, level, source, keyword)
    → 根据参数组合调用不同方法
    → 返回 Page<SystemEvent>（含 content/totalPages/totalElements）

SystemLogController.getLatest(count=50)
    → SystemEventRepository.findTop50ByOrderByCreatedAtDesc()
    → 返回最新 50 条

SystemLogController.clearAll()
    → SystemEventRepository.deleteAll()
    → 清空日志表

SystemEventService.log(level, source, message, pid, name)
    → SystemEventRepository.save(event)
    → 写入一条日志
```

---

## 特殊逻辑

- **Page 分页**：Spring Data JPA 的 `Pageable` 参数自动处理 LIMIT/OFFSET，返回 `Page<T>` 包含总数和总页数。
- **大小写不敏感搜索**：`findByMessageContainingIgnoreCase` 对应 SQL 的 `LIKE %keyword%` 且忽略大小写（MySQL 默认 `utf8_general_ci` 已不敏感，但方法名显式声明）。
- **前端实时刷新**：`findTop50ByOrderByCreatedAtDesc()` 由 `SystemLogController.latest` 每 ~2 秒调用一次，实现类似 Windows 事件查看器的实时更新效果。
