# ProcessManager.java — 进程管理器（MLFQ 调度核心）

**包路径：** `com.processos.process.ProcessManager`
**注解：** `@Component`（Spring 单例组件）

---

## 职责

**沙盒模式的核心大脑。** 它实现了一个完整的三级 MLFQ（多级反馈队列）调度器，管理进程的整个生命周期——创建、调度、执行、阻塞、终止。

`SystemController` 的所有沙盒操作最终都调用到这里。

---

## MLFQ 调度规则

### 三级队列

| 队列 | 优先级 | 时间片 | 进入条件 |
|------|--------|--------|---------|
| **Q0** | 高 | **8 tick** | 优先级 1-2 的新进程，Q1 老化升级 |
| **Q1** | 中 | **10 tick** | 优先级 3-4 的新进程，Q0 降级，Q2 老化升级 |
| **Q2** | 低 | **16 tick** | 优先级 5 的新进程，Q1 降级，恢复后默认进入 |

### 调度规则

1. **严格优先级**：CPU 总是执行最高非空队列的队首进程（Q0 → Q1 → Q2）
2. **时间片降级**：时间片用完还没结束 → 降到下一级队列（Q0→Q1→Q2）
3. **老化升级**：在低队列等待超过 **30 tick** → 升到上一级（防饥饿）
4. **高优先级抢占**：新进程进入 Q0 时，如果当前运行进程在 Q1/Q2，立即抢占

---

## 核心数据

```java
private final List<ProcessControlBlock> q0;             // Q0 就绪队列（高优先级）
private final List<ProcessControlBlock> q1;             // Q1 就绪队列（中）
private final List<ProcessControlBlock> q2;             // Q2 就绪队列（低）
private final List<ProcessControlBlock> blockedQueue;   // 阻塞队列
private final List<ProcessControlBlock> processTable;   // 全局进程表（所有进程）

private ProcessControlBlock runningProcess;    // 当前运行进程
private int currentQueueLevel;                 // 当前运行进程在 Q0/Q1/Q2
private int clockTick;                         // 全局时钟滴答
private int timeUsed;                          // 当前进程已用时间片
private boolean paused;                        // 暂停标志
private boolean autoPause;                     // 单步模式（每步自动暂停）

private final Map<Integer, Integer> queueEntryTime;  // 进入队列的时间（老化用）
```

---

## 核心方法详解

### 1. 进程创建 — `launchApp(SimulatedApp)`

```
launchApp(app)
    │
    ├── 单实例检查 → 已运行则返回 -1
    │
    ├── 生成 displayName（非单实例加编号：记事本(1), 记事本(2)...）
    │
    ├── 分配内存 (HardwarePool.allocateMemory)
    │   │
    │   ├── 成功 → 创建 PCB，设 READY，入队列
    │   │       ├── 优先级 1-2 → Q0
    │   │       ├── 优先级 3-4 → Q1
    │   │       └── 优先级 5 → Q2
    │   │       │
    │   │       └── 高优先级抢占：如果是 Q0 新进程且当前在 Q1/Q2 → 抢占
    │   │
    │   └── 失败 → 创建 BLOCKED 进程，blockedReason="等待内存(XMB)"
    │            入 blockedQueue，返回 "WAITING_MEMORY"
    │
    └── 游戏/音乐类应用自动注册音频设备
```

### 2. 时钟中断 — `tick()`

这是**调度核心**，每个时钟滴答调一次：

```
tick()
    │
    ├── 1. clockTick++
    ├── 2. checkAging() — 检查老化（Q2→Q1, Q1→Q0）
    ├── 3. 无运行进程 → scheduleNext()
    │
    └── 4. 有运行进程
            │
            ├── 时间片到期？(timeUsed >= quantum)
            │   ├── saveContext（保存寄存器）
            │   ├── 降级到下一级队列（Q0→Q1, Q1→Q2, Q2→Q2）
            │   └── scheduleNext() 重新调度
            │
            └── 执行一条指令
                ├── restoreContext（恢复寄存器）
                ├── cpuCore.executeStep(pcb)
                ├── timeUsed++
                │
                ├── HALT → completeProcess()
                ├── BLOCKED_IPC → blockProcess("等待IPC消息")
                ├── BLOCKED_PRINTER → blockProcess("等待打印机")
                └── OK → 继续（下一个 tick 再执行）
```

### 3. MLFQ 调度 — `scheduleNext()`

```
scheduleNext()
    │
    ├── Q0 非空？→ 取 Q0[0]
    ├── Q1 非空？→ 取 Q1[0]
    ├── Q2 非空？→ 取 Q2[0]
    └── 全空 → runningProcess = null, 空闲
```

### 4. 老化机制 — `checkAging()`

```
checkAging()
    │
    ├── 遍历 Q2: clockTick - entryTime >= 30 tick → 升级到 Q1
    └── 遍历 Q1: clockTick - entryTime >= 30 tick → 升级到 Q0
```

防止低优先级进程永远得不到 CPU。

### 5. 进程完成 — `completeProcess()`

```
completeProcess(p)
    │
    ├── cpuCore.saveContext(p)
    ├── state = TERMINATED
    ├── 释放 CPU 核心
    ├── 释放内存 (hardwarePool.freeMemory)
    ├── 释放 I/O（音频、打印机、USB）
    ├── 从 processTable 移除
    └── tryWakeupMemoryWaiters()
            │
            └── 按内存需求从小到大，尝试唤醒等待内存的进程
```

### 6. 进程阻塞 — `blockProcess()`

```
blockProcess(p, reason)
    │
    ├── saveContext → state = BLOCKED
    ├── 从队列移除 → 加入 blockedQueue
    └── 清空 runningProcess
```

### 7. 进程唤醒 — `wakeupBlockedProcess()`

将 blockedQueue 中指定 PID 的进程移回 Q1：
```
wakeupBlockedProcess(pid, reason)
    │
    ├── 从 blockedQueue 找到目标
    ├── state = READY, blockedReason = null
    └── addToQueue(target, 1) → 进入 Q1
```

### 8. 进程管理

| 方法 | 功能 |
|------|------|
| `killProcess(pid)` | 终止进程：从所有队列移除，释放资源，尝试唤醒内存等待者 |
| `suspendProcess(pid)` | 挂起：RUNNING 或 READY → BLOCKED + "手动挂起" |
| `resumeProcess(pid)` | 恢复：BLOCKED → READY，默认进入 Q2 |

### 9. 优先级 → 队列映射

```java
private int getQueueForPriority(int priority) {
    if (priority <= 2) return 0;  // 高优先级 → Q0
    if (priority <= 4) return 1;  // 中优先级 → Q1
    return 2;                      // 低优先级 → Q2
}
```

---

## IpcCallback 注入

在构造时通过 `cpuCore.setIpcCallback()` 注入，让 CPU 执行指令时能回调到 ProcessManager：

| 回调方法 | CPU 指令 | 行为 |
|---------|---------|------|
| `sendMessage(fromPid, targetAppType, message)` | SEND | 找目标进程，写入 messageBuffer，如果对方 BLOCKED+waitingForMessage 则唤醒 |
| `requestPrinter(pid, processName)` | P_PRINTER | 通过 IoManager 申请打印机 |
| `releasePrinter(pid)` | V_PRINTER | 释放打印机，唤醒等待者 |

---

## 调用关系

```
SystemController
    │
    ├── launchApp()  →  ProcessManager.launchApp()
    ├── terminate()  →  ProcessManager.killProcess()
    ├── suspend()    →  ProcessManager.suspendProcess()
    ├── resume()     →  ProcessManager.resumeProcess()
    ├── run()        →  ProcessManager.tick()
    ├── step()       →  ProcessManager.tickForced()
    └── scheduler    →  processManager.getQ0/Q1/Q2/blockedQueue

ProcessManager
    │
    ├── HardwarePool          — CPU核心 + 内存分配释放
    ├── CpuCore               — 指令执行 + 上下文切换
    ├── IoManager              — 独占设备(打印机)
    └── SystemEventService     — 事件日志记录
```

---

## 特殊逻辑

- **tick 防冲撞**：`tickForced()` 用于单步模式——强制设 `paused=false` 执行后再设回 `paused=true`，避免定时任务和手动单步冲突。
- **CopyOnWriteArrayList**：队列使用 `CopyOnWriteArrayList`，允许在遍历时修改（如老化检查中移除/添加元素）。
- **内存不足阻塞**：`launchApp()` 时内存不够不直接拒绝，而是创建 BLOCKED 进程在阻塞队列等，`tryWakeupMemoryWaiters()` 在进程完成/终止时自动按需唤醒。
- **老化触发时机**：每个 tick 开始时检查，而非进程入队时。30 tick 阈值确保低优先级进程不会无限等待。
- **暂停自动取消**：新进程到达时 `paused = false`，确保即使暂停状态也能响应新应用启动。
- **IPC 唤醒锁**：`sendMessage` 回调检查 `waitingForMessage && state == BLOCKED` 双条件，防止误唤醒。
