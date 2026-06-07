# Scheduler 层 — 总览

**包路径：** `com.processos.scheduler`
**共 9 个文件**

---

## 职责

实现**算法实验室**中的 7 种调度算法 + 1 个自定义向量调度。所有算法实现 `Scheduler` 接口，通过**策略模式**由 `ProcessService` 统一调用。

---

## 文件一览

| 文件 | 算法名 | 类型 | 选择依据 | 抢占 |
|------|--------|------|---------|------|
| [Scheduler](Scheduler.md) | 接口 | interface | — | — |
| [FCFSScheduler](FCFSScheduler.md) | FCFS | 非抢占 | 到达时间 | ❌ |
| [SJFScheduler](SJFScheduler.md) | SJF | 非抢占 | 总执行时间 | ❌ |
| [RoundRobinScheduler](RoundRobinScheduler.md) | RR | 抢占（时间片） | 队首 | ✅ |
| [PriorityScheduler](PriorityScheduler.md) | Priority | 非抢占 | 优先级数字 | ❌ |
| [SRTNScheduler](SRTNScheduler.md) | SRTN | 抢占（剩余时间） | 剩余时间 | ✅ |
| [PreemptivePriorityScheduler](PreemptivePriorityScheduler.md) | PreemptivePriority | 抢占（优先级） | 优先级数字 | ✅ |
| [MFQScheduler](MFQScheduler.md) | MFQ | 抢占（多级队列） | 最高非空队列 | ✅ |
| [VectorScheduler](VectorScheduler.md) | Vector | 加权评分 | 5维特征总分 | 取决于调用 |

---

## 架构关系

```
ProcessService
    │  (策略模式: 运行时切换算法)
    └── Scheduler 接口
            │
            ├── FCFSScheduler        — 先来先服务
            ├── SJFScheduler          — 短作业优先
            ├── RoundRobinScheduler   — 时间片轮转
            ├── PriorityScheduler     — 优先级（非抢占）
            ├── SRTNScheduler         — 最短剩余时间
            ├── PreemptivePriority    — 抢占式优先级
            ├── MFQScheduler          — 多级反馈队列
            └── VectorScheduler       — 向量加权评分
```

---

## 两种调度体系

项目中有**两套独立的调度实现**：

| 特性 | scheduler/ 包（7算法） | ProcessManager 内置 |
|------|----------------------|-------------------|
| 使用场景 | **算法实验室**（对比展示） | **桌面沙盒模式**（实际运行） |
| 调度策略 | FCFS/SJF/RR/Priority/SRTN/Preemptive/MFQ/Vector | 三级 MLFQ（硬编码） |
| 接入方式 | 实现 Scheduler 接口，策略模式 | 直接在 tick() 中实现 |
| 队列结构 | 单个就绪队列（传参） | Q0/Q1/Q2 + blockedQueue |
| 抢占总控 | ProcessService.tick() | ProcessManager.tick() |

---

## 策略模式实现

`ProcessService` 中通过 switch 切换算法：

```java
public void setScheduler(String algo) {
    this.scheduler = switch (algo) {
        case "FCFS" -> new FCFSScheduler();
        case "SJF"  -> new SJFScheduler();
        case "RR"   -> new RoundRobinScheduler();
        case "Priority" -> new PriorityScheduler();
        case "SRTN" -> new SRTNScheduler();
        case "PreemptivePriority" -> new PreemptivePriorityScheduler();
        case "MFQ"  -> new MFQScheduler();
        default -> throw new IllegalArgumentException("Unknown: " + algo);
    };
}
```

---

## SRTN vs SJF 代码相同的问题

```java
// SRTNScheduler 和 SJFScheduler 的 selectNext() 代码完全一样：
readyQueue.stream().min((a, b) -> Integer.compare(a.getRemainingTime(), b.getRemainingTime()))
```

区别在于**调用方式**：
- SJF：只在进程完成/新进程到达时调用一次 selectNext（非抢占）
- SRTN：每个 tick 都调用 selectNext（抢占），有新进程到达时也触发
