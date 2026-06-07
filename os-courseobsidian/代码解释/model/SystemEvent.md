# SystemEvent.java — 系统事件日志（JPA 实体）

**包路径：** `com.processos.model.SystemEvent`
**注解：** `@Entity` → 映射 `system_events` 表

---

## 职责

记录系统中的**事件日志**，类似 Windows 的事件查看器（Event Viewer）。用于桌面"系统日志"应用，支持 4 级日志、来源分类、实时刷新。

---

## 字段映射

| 字段 | 数据库列 | 说明 |
|------|---------|------|
| `id` | `id` (PK) | 自增主键 |
| `level` | `level` (VARCHAR) | 日志级别：`INFO` / `SUCCESS` / `WARNING` / `ERROR` |
| `source` | `source` (VARCHAR) | 事件来源：`PROCESS_MGR` / `MEMORY_MGR` / `LAB` / `SYNC` / `SYSTEM` |
| `message` | `message` (TEXT) | 事件消息正文 |
| `pid` | `pid` (INT) | 关联的进程 PID（可选） |
| `processName` | `process_name` | 关联的进程名（可选） |
| `createdAt` | `created_at` | 事件发生时间 |

---

## 日志级别

| 级别 | 含义 | 前端颜色 | 示例 |
|------|------|---------|------|
| `INFO` | 普通信息 | 蓝色 | "进程 P1 已创建" |
| `SUCCESS` | 成功操作 | 绿色 | "进程 P2 执行完毕" |
| `WARNING` | 警告 | 黄色 | "内存使用率超过 80%" |
| `ERROR` | 错误 | 红色 | "内存分配失败" |

---

## 事件来源

| 来源 | 说明 |
|------|------|
| `PROCESS_MGR` | 进程管理（创建、调度、终止） |
| `MEMORY_MGR` | 内存管理（分配、释放） |
| `LAB` | 算法实验室 |
| `SYNC` | 同步互斥实验室 |
| `SYSTEM` | 系统操作（重置、暂停） |

---

## 调用关系

```
各层代码 → SystemEventService.log(level, source, message, pid, name)
    │
    └── SystemEventRepository.save(event)
            │
            └── 写入 MySQL system_events 表

SystemLogController.getEvents() → 分页查询
SystemLogController.getLatest() → 实时刷新
```

具体使用示例（来自代码库各处）：
```java
// ProcessManager 中：
SystemEventService.log("INFO", "PROCESS_MGR",
    "进程 " + pcb.getName() + " (PID:" + pcb.getPid() + ") 已创建");

// MemoryManager 中：
SystemEventService.log("SUCCESS", "MEMORY_MGR",
    "进程 " + name + " 已分配 " + size + "MB 内存");
```

---

## 特殊逻辑

- **可选关联进程**：`pid` 和 `processName` 可为 null，允许记录不特定于某个进程的全局事件（如"系统重置"）。
- **TEXT 类型**：`message` 用 `columnDefinition = "TEXT"`，支持长消息（不限长度）。
- **索引设计**：`schema.sql` 中 `level`、`source`、`created_at` 三列有索引，支持快速筛选排序。
- **实时刷新**：前端定时调用 `GET /api/events/latest` 拉取最新日志，实现"事件查看器"的实时更新效果。
