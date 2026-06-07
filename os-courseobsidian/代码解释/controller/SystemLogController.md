# SystemLogController.java — 系统事件日志 API

**包路径：** `com.processos.controller.SystemLogController`
**请求前缀：** `/api/events`
**自动注入：** `SystemEventService`（日志业务逻辑）

---

## 职责

为桌面的"系统日志"窗口提供后端 API，功能类似 Windows 的事件查看器。支持：
- 分页查询
- 按级别/来源/关键字筛选
- 实时刷新（最新 N 条）
- 日志统计
- 清空日志

---

## 端点详解

### 1. 日志查询

#### `GET /api/events`
**核心方法。** 分页查询日志，支持多维筛选。

**参数：**
- `page`（默认0）：页码
- `size`（默认15）：每页条数
- `level`（可选）：日志级别过滤（INFO / SUCCESS / WARNING / ERROR）
- `source`（可选）：来源过滤（PROCESS_MGR / MEMORY_MGR / LAB / SYNC / SYSTEM）
- `keyword`（可选）：关键字搜索（模糊匹配 message 字段）

**筛选逻辑（优先级顺序）：**

| 条件组合 | 调用的方法 |
|---------|-----------|
| 有关键字 + 有级别 | `searchEventsByLevel(level, keyword, page, size)` |
| 有关键字 + 无级别 | `searchEvents(keyword, page, size)` |
| 有级别 + 有来源 | `getEventsByLevelAndSource(level, source, page, size)` |
| 只有级别 | `getEventsByLevel(level, page, size)` |
| 只有来源 | `getEventsBySource(source, page, size)` |
| 无条件 | `getEvents(page, size)` |

**返回：**
```json
{
  "content": [ /* SystemEvent 列表 */ ],
  "totalPages": 5,
  "totalElements": 67,
  "currentPage": 0,
  "size": 15
}
```

使用了 Spring Data JPA 的 `Page` 分页机制，前端的日志表格支持翻页。

### 2. 实时刷新

#### `GET /api/events/latest?count=50`
返回最新的 N 条日志（按创建时间倒序）。由前端定时器（~2秒间隔）调用，实现日志列表自动刷新。

### 3. 日志管理

#### `DELETE /api/events`
清空所有日志（物理删除，不可恢复）。

#### `GET /api/events/stats`
返回日志统计信息：
- `totalCount`：总日志数
- `infoCount` / `successCount` / `warningCount` / `errorCount`：各级别数量

---

## 调用关系

```
SystemLogController
    │
    └── SystemEventService
            │
            ├── getEvents(page, size)
            ├── getEventsByLevel(level, page, size)
            ├── getEventsBySource(source, page, size)
            ├── getEventsByLevelAndSource(level, source, page, size)
            ├── searchEvents(keyword, page, size)
            ├── searchEventsByLevel(level, keyword, page, size)
            ├── getLatestEvents(count)
            ├── getTotalCount()
            └── clearAll()
                │
                └── SystemEventRepository (JPA)
```

---

## 特殊逻辑说明

- **多条件组合查询**：Controller 层通过 `if-else` 链实现了 6 种查询模式的自动路由，每种模式调用 `SystemEventService` 的不同方法。避免了在 URL 中显式指定查询类型。
- **分页标准格式**：返回格式与前端 ant-design 的 Table 分页组件兼容（content/totalPages/totalElements/currentPage/size）。
- **日志级别**：4 级——INFO（普通信息）、SUCCESS（成功操作）、WARNING（警告）、ERROR（错误），与前端组件的颜色编码对应（INFO=蓝色、SUCCESS=绿色、WARNING=黄色、ERROR=红色）。
