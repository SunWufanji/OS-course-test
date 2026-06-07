# SystemEventService.java — 系统事件日志服务

**包路径：** `com.processos.service.SystemEventService`
**注解：** `@Service`

---

## 职责

提供**写入**和**查询**系统事件日志的能力。项目各处（ProcessManager、HardwarePool 等）通过这个 Service 记录事件，`SystemLogController` 通过它查询日志。

---

## 写入方法

提供 4 种级别的便捷写入方法，每种有带/不带进程信息的重载：

```java
// 4 种级别 × 2 种重载 = 8 个方法

info(source, "进程已创建")
info(source, "进程已创建", pid, processName)   // 带关联进程

success(source, message)
warning(source, message)
error(source, message)
```

最终统一调用私有的 `save(SystemEvent)`：

```java
private void save(SystemEvent event) {
    eventRepository.save(event);  // JPA 写入 MySQL
}
```

---

## 查询方法

| 方法 | 用途 | 映射到 Repository |
|------|------|------------------|
| `getEvents(page, size)` | 全部日志，分页 | `findAllByOrderByCreatedAtDesc` |
| `getEventsByLevel(level, page, size)` | 按级别筛选 | `findByLevelOrderByCreatedAtDesc` |
| `getEventsBySource(source, page, size)` | 按来源筛选 | `findBySourceOrderByCreatedAtDesc` |
| `getEventsByLevelAndSource(l, s, page, size)` | 级别+来源 | `findByLevelAndSourceOrderByCreatedAtDesc` |
| `searchEvents(keyword, page, size)` | 关键字模糊搜索 | `findByMessageContainingIgnoreCase` |
| `searchEventsByLevel(level, keyword, page, size)` | 级别+关键字 | `findByLevelAndMessageContainingIgnoreCase` |
| `getLatestEvents(count)` | 最新 N 条（实时刷新） | `findTop50ByOrderByCreatedAtDesc` |
| `getTotalCount()` | 总计数 | `count()` |
| `clearAll()` | 清空所有 | `deleteAll()` |

---

## 调用关系

```
ProcessManager.tick()
    → eventService.info("PROCESS_MGR", "进程已创建", pid, name)

HardwarePool.allocateMemory()
    → eventService.warning("MEMORY_MGR", "内存不足...")

SystemController
    → SystemLogController
        → SystemEventService.getEvents(page, size, level, source, keyword)
            → SystemEventRepository.xxx()

SystemLogController
    → SystemEventService.getLatestEvents(50)  ← 前端实时刷新
```
