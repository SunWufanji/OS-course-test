# Service 层 — 总览

**包路径：** `com.processos.service`
**共 4 个文件**

---

## 职责

**业务逻辑层**。处于 Controller 和 Repository/Manager 之间，负责具体的业务逻辑实现。

| 文件 | 类型 | 行数 | 职责 |
|------|------|------|------|
| [ProcessService](ProcessService.md) | @Service | **~770** | ⭐ **算法实验室核心**：7 种调度算法交互、甘特图、持久化 |
| [SyncDemoService](SyncDemoService.md) | @Service | ~440 | 同步互斥实验室：三道经典问题演示 |
| [SystemEventService](SystemEventService.md) | @Service | ~120 | 系统事件日志的写入和查询 |
| [IpcManager](IpcManager.md) | class | ~113 | IPC 消息传递管理器（备选实现） |

---

## 架构分层

```
Controller (REST API)
    │
    ▼
Service  ←── 当前包（业务逻辑层）
    │
    ├── ProcessService      → Repository (JPA) + Scheduler（策略模式）
    ├── SyncDemoService     → 纯内存状态（无数据库依赖）
    ├── SystemEventService  → SystemEventRepository
    └── IpcManager          → PCB messageBuffer（备选，未使用）
```

---

## 核心流程对比

### ProcessService（算法实验室）

```
ProcessController.tick()
    → ProcessService.tick()
        → scheduler.selectNext()          ← 策略模式切换算法
        → SRTN/Preemptive/MFQ 抢占检查
        → remainingTime--                  ← 时间推进
        → addGanttData()                   ← 记录甘特图
        → 进程完成 → saveExecutionLogs()    ← 持久化到 MySQL
```

### ProcessManager（沙盒模式）

```
SystemController.run()
    → ProcessManager.tick()
        → checkAging()                     ← 老化机制
        → scheduleNext()                   ← MLFQ 严格优先级
        → CpuCore.executeStep()            ← 指令级执行
        → InstructionResult 分派            ← 阻塞/完成/继续
        → tryWakeupMemoryWaiters()          ← 内存满唤醒
```

---

## 文件间的关系

```
ProcessService
    ├── 依赖 Scheduler（策略模式）
    ├── 依赖 3 个 Repository（JPA）
    └── 独立实现

SyncDemoService
    └── 独立实现（纯内存，无依赖）

SystemEventService
    └── 依赖 SystemEventRepository

IpcManager
    └── 独立实现（无 Spring 注解，备选）
```

---

## 关键设计

- **ProcessService vs ProcessManager**：两套独立的进程管理实现。`ProcessService` 用于算法实验室（需要对比多种算法），`ProcessManager` 用于桌面沙盒（需要指令级模拟 + MLFQ）。
- **SyncDemoService 的多线程**：生产者消费者使用 Java 原生线程 + `synchronized/wait/notify`，不依赖 Spring 的线程管理。
- **IpcManager 的未完成状态**：没有 `@Service` 注解，未被自动注入使用，是一个备选/参考实现。
