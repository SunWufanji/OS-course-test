# ProcessService.java — 进程管理服务（算法实验室核心）

**包路径：** `com.processos.service.ProcessService`
**注解：** `@Service`

---

## 职责

**算法实验室**的核心业务逻辑。管理与 `scheduler/` 包中 7 种调度算法的交互、进程生命周期、甘特图数据、数据库持久化。

**与 `ProcessManager` 的区别：**

| 特性 | ProcessService（这个） | ProcessManager（process/ 包） |
|------|----------------------|------------------------------|
| 使用场景 | **算法实验室**（对比 7 种算法） | **桌面沙盒模式**（MLFQ 调度） |
| 调度方式 | 策略模式 → 可切换算法 | 硬编码三级 MLFQ |
| 进程来源 | 手动创建 / 预设场景 | 用户点击"启动应用" |
| 甘特图 | ✅ 完整支持 | ❌ 无 |
| 数据库 | ✅ 持久化执行日志 + 性能指标 | ❌ 仅 `SystemEventService` |

---

## 核心数据

```java
private List<ProcessControlBlock> processes;        // 所有进程
private List<ProcessControlBlock> readyQueue;        // 就绪队列
private List<ProcessControlBlock> blockedQueue;      // 阻塞队列
private ProcessControlBlock runningProcess;          // 当前运行进程
private Scheduler scheduler;                         // 当前调度算法（策略模式）
private int currentTime;                             // 当前时间
private int nextPid;                                 // 下一个 PID
private int timeQuantum;                             // 时间片大小
private int timeUsed;                                // 当前进程已用时间片
private List<Map<String, Object>> ganttData;         // 甘特图数据
private String currentSessionId;                     // 当前会话 UUID
```

---

## 核心方法

### 1. 进程生命周期

| 方法 | 功能 |
|------|------|
| `createProcess(name, burst, priority, arrival)` | 创建进程，若到达时间 ≤ 当前时间则直接入就绪队列 |
| `deleteProcess(pid)` | 删除进程 |
| `suspendProcess(pid)` | 挂起（RUNNING/READY → BLOCKED） |
| `resumeProcess(pid)` | 恢复（BLOCKED → READY） |

### 2. 调度核心 — `tick()`

**最复杂的方法（~160 行）**，每个时间步执行：

```
tick()
    │
    ├── 1. 检查新到达进程（arrivalTime == currentTime → 入就绪队列）
    │
    ├── 2. 调度：
    │   ├── 无运行进程 → scheduler.selectNext()
    │   ├── SRTN → 检查是否有剩余时间更短的进程，有则抢占
    │   ├── PreemptivePriority → 检查是否有更高优先级的进程，有则抢占
    │   └── MFQ → 检查是否有更高优先级队列的进程，有则抢占
    │
    ├── 3. currentTime++
    │
    └── 4. 执行：
        ├── RR → timeUsed++，超过 timeQuantum 则切出
        ├── MFQ → 执行 + 检查降级/完成
        └── 其他 → remainingTime--，为 0 则完成
```

**甘特图数据记录时机：**
- 进程完成 → `addGanttData(start, currentTime)`
- 进程被抢占 → `addGanttData(start, currentTime)`
- 时间片到（RR）→ `addGanttData(start, currentTime)`

### 3. 数据库持久化

| 方法 | 作用 |
|------|------|
| `saveExecutionLogs()` | 遍历所有进程，写入 `execution_log` 表 |
| `savePerformanceMetrics()` | 计算统计值，写入 `performance_metrics` 表 |

### 4. 场景管理

| 方法 | 作用 |
|------|------|
| `getAllScenarios()` | 从 DB 读取所有预设场景 |
| `loadScenario(id)` | 加载场景 → 解析 JSON → 创建进程 |
| `parseAndCreateProcesses(json)` | 手动解析 JSON（不使用 Jackson） |

### 5. 历史

| 方法 | 作用 |
|------|------|
| `getHistoryRecords()` | 最近 10 条性能记录 |
| `getHistoryProcesses(id)` | 某条历史记录的进程详情 |
| `replayFromHistory(id)` | 从历史记录重新创建进程 |
| `deleteHistoryRecord(id)` | 删除单条 |
| `clearAllHistory()` | 清空所有 |

### 6. 进程树

| 方法 | 作用 |
|------|------|
| `forkProcess(pid, name)` | 创建子进程（执行时间 = 父进程一半） |
| `killProcessTree(pid)` | 级联终止整个进程树 |
| `getProcessTree()` | 返回进程树结构 |

### 7. 算法切换

```java
public void setScheduler(String algo) {
    switch (algo) {
        case "FCFS" → new FCFSScheduler();
        case "SJF"  → new SJFScheduler();
        case "SRTN" → new SRTNScheduler();
        case "RR"   → new RoundRobinScheduler();
        case "Priority" → new PriorityScheduler();
        case "PreemptivePriority" → new PreemptivePriorityScheduler();
        case "MFQ"  → new MFQScheduler();
    }
}
```

---

## 甘特图数据合并

```java
private void addGanttData(process, start, end) {
    // 如果最后一个块的 PID 相同且 end == start → 合并
    if (ganttData.last().pid == process.pid && last.end == start) {
        last.end = end;  // 扩展上一个块
        return;
    }
    // 否则新建块
}
```

这种合并策略确保同进程的连续运行时间段不会产生碎片化甘特图块。

---

## JSON 解析（简易实现）

`parseAndCreateProcesses()` 不使用 Jackson/Gson，而是手动字符串处理：

```java
// 输入: [{"name":"P1","burst":6,"priority":3,"arrival":0}, ...]
// 步骤:
// 1. 去掉首尾 []
// 2. 按 "},{" 分割
// 3. 去掉 {} 和 ""
// 4. 按 "," 分割，再按 ":" 取 key-value
// 5. switch(key) 匹配 name/burst/priority/arrival
```

这种方式避免了引入额外的 JSON 库依赖，但要求输入格式严格固定。

---

## 调用关系

```
ProcessController
    │
    └── ProcessService
            │
            ├── Scheduler（策略模式）
            ├── ExecutionLogRepository（JPA）
            ├── PerformanceMetricsRepository（JPA）
            ├── ScenarioConfigRepository（JPA）
            └── ProcessControlBlock
```
