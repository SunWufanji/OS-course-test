# Sync 层 — 总览

**包路径：** `com.processos.sync`
**共 3 个文件**

---

## 职责

提供经典的**同步原语实现**：信号量、互斥锁、消息队列。这些是操作系统课程中最基本的进程/线程同步工具。

---

## 文件一览

| 文件 | 核心操作 | 等待机制 | 适用场景 |
|------|---------|---------|---------|
| [Semaphore](Semaphore.md) | `P()` / `V()` | `value < 0` 时 wait | 资源计数、同步 |
| [Mutex](Mutex.md) | `lock()` / `unlock()` | `while(locked)` wait | 互斥访问临界区 |
| [MessageQueue](MessageQueue.md) | `send()` / `receive()` | `queue full/empty` 时 wait | 生产者消费者 |

---

## 与项目其他部分的关系

`sleep/` 包中的三个类是**独立的经典实现**，当前**未被项目中的沙盒或实验室功能直接集成使用**。

项目实际使用的同步机制：

| 位置 | 实际使用的机制 |
|------|---------------|
| `SyncDemoService` | `AtomicInteger` + `synchronized` + `wait/notify` |
| `ProcessManager.IpcCallback` | PCB 的 `messageBuffer` + `blockedReason` |
| `IoManager` / `ExclusiveDevice` | FIFO 等待队列 + PCB 状态切换 |

---

## 对比：经典信号量 vs 项目实际实现

| 层面 | 经典信号量（sync/ 包） | 项目实际实现 |
|------|----------------------|-------------|
| 阻塞方式 | Java 线程 `wait()` | PCB 状态设为 BLOCKED |
| 唤醒方式 | `notify()` | PCB 状态改为 READY + 入队列 |
| 资源管理 | `int value` 计数 | `ExclusiveDevice.ownerPid` / 内存分配 |

---

## 教学意义

这三个类虽然未被项目直接使用，但作为**教学演示**很有价值：
- 展示了 PV 操作的完整语义
- 展示了管程（Monitor）风格的同步队列
- 可以在 `SyncLabController` 中扩展为"经典同步原语"教学模块
