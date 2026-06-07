# ExecutionLog.java — 进程执行轨迹（JPA 实体）

**包路径：** `com.processos.model.ExecutionLog`
**注解：** `@Entity` → 映射 `execution_log` 表

---

## 职责

记录每个进程的**完整执行轨迹**，包括从创建到完成的各个时间点和统计值。每个模拟会话（`sessionId`）中的每个进程一条记录。

**数据来源：** 模拟运行结束后由 `ProcessService.saveExecutionLogs()` 写入。

---

## 字段映射

| 字段 | 数据库列 | 说明 |
|------|---------|------|
| `id` | `id` (BIGINT, PK, Auto) | 自增主键 |
| `sessionId` | `session_id` (VARCHAR) | 模拟会话 UUID，一次运行一个 ID |
| `pid` | `pid` (INT) | 进程 ID |
| `processName` | `process_name` | 进程名 |
| `algorithm` | `algorithm` | 使用的调度算法 |
| `createdTime` | `created_time` | 进程创建时间点 |
| `readyTime` | `ready_time` | 进入就绪队列时间点 |
| `startTime` | `start_time` | 首次运行时间点（重要：计算响应时间用） |
| `endTime` | `end_time` | 结束时间点 |
| `blockedTime` | `blocked_time` | 阻塞总时长 |
| `burstTime` | `burst_time` | CPU 执行时间需求 |
| `arrivalTime` | `arrival_time` | 到达时间 |
| `priority` | `priority` | 优先级 |
| `waitingTime` | `waiting_time` | 等待总时长 |
| `turnaroundTime` | `turnaround_time` | **周转时间**（completion - arrival） |
| `completionTime` | `completion_time` | 完成时间点 |
| `createdAt` | `created_at` | 记录创建时间（自动 @PrePersist） |

---

## 关键时间点关系

```
arrivalTime → readyTime → startTime → endTime / completionTime
    ↑           ↑            ↑             ↑
  创建请求   进入队列     首次上CPU     执行完毕

turnaroundTime = completionTime - arrivalTime
waitingTime = turnaroundTime - burstTime - blockedTime
```

---

## 调用关系

```
ProcessService.saveExecutionLogs()
    │
    ├── 遍历所有进程的 PCB
    ├── 从 PCB 读取各时间点值
    ├── 构建 ExecutionLog 对象
    └── ExecutionLogRepository.saveAll(logs)
            │
            └── 写入 MySQL execution_log 表
```

查询路径：
```
ProcessController.getHistoryProcesses(id)
    → ExecutionLogRepository.findBySessionId()
    → 前端历史详情页面
```

---

## 特殊逻辑

- **sessionId 分组**：一次模拟运行生成一个 UUID，所有进程的日志共享同一 `sessionId`，方便按批次查询。
- **BIGINT 主键**：支持大量历史记录积累。
- `@PrePersist`：`createdAt` 在写入时自动赋值，不需要手动设置。
