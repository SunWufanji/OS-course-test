# Scheduler.java — 调度器接口

**包路径：** `com.processos.scheduler.Scheduler`

---

## 职责

所有调度算法的**统一接口**。7 种调度算法都实现这个接口，`ProcessService` 通过多态调用而不关心具体算法。

---

## 接口定义

```java
public interface Scheduler {
    ProcessControlBlock selectNext(List<ProcessControlBlock> readyQueue, int currentTime);
    String getName();
    String getDescription();
}
```

| 方法 | 说明 |
|------|------|
| `selectNext(readyQueue, currentTime)` | **核心方法** — 从就绪队列中选择下一个要运行的进程 |
| `getName()` | 算法简称（如 "FCFS"、"SJF"） |
| `getDescription()` | 算法中文全名 |

---

## 所有实现

| 实现类 | getName() | 类型 |
|--------|-----------|------|
| `FCFSScheduler` | FCFS | 非抢占 |
| `SJFScheduler` | SJF | 非抢占 |
| `RoundRobinScheduler` | RR | 抢占（时间片到） |
| `PriorityScheduler` | Priority | 非抢占 |
| `SRTNScheduler` | SRTN | 抢占（剩余时间更短时） |
| `PreemptivePriorityScheduler` | PreemptivePriority | 抢占（更高优先级到达时） |
| `MFQScheduler` | MFQ | 抢占（多级队列） |

---

## 调用关系

```
ProcessService
    │
    └── scheduler.selectNext(readyQueue, currentTime)
            │
            ├── FCFSScheduler.selectNext()     — 选 arrivalTime 最小的
            ├── SJFScheduler.selectNext()       — 选 remainingTime 最小的
            ├── RoundRobinScheduler.selectNext() — 取队首
            ├── PriorityScheduler.selectNext()   — 选 priority 最小的
            ├── SRTNScheduler.selectNext()       — 选 remainingTime 最小的
            ├── PreemptivePriorityScheduler     — 选 priority 最小的
            └── MFQScheduler.selectNext()        — 从最高非空队列取
```

---

## 设计模式

**策略模式（Strategy Pattern）** — `ProcessService` 持有一个 `Scheduler` 引用，运行时通过 `setScheduler(algo)` 切换：

```java
public void setScheduler(String algo) {
    scheduler = switch (algo) {
        case "FCFS" -> new FCFSScheduler();
        case "SJF" -> new SJFScheduler();
        case "RR" -> new RoundRobinScheduler();
        // ...
    };
}
```
