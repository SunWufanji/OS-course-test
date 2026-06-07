# IpcManager.java — IPC 消息传递管理器

**包路径：** `com.processos.service.IpcManager`

---

## 职责

管理进程间的**消息传递**（IPC）。提供 SEND/RECEIVE 操作的底层实现，包括消息投递、阻塞注册、唤醒检查。

**注意：** 这个类当前**未被沙盒模式实际使用**。沙盒模式的 IPC 通信通过 `ProcessManager` 中注入 CpuCore 的 `IpcCallback` 实现（直接操作 PCB 的 messageBuffer）。这个类是一个更通用的 IPC 管理器备选实现。

---

## 数据结构

```java
// 正在等待接收消息的进程表
private final Map<Integer, ProcessControlBlock> waitingReceivers;

// 消息历史记录（上限 100 条）
private final List<Map<String, Object>> messageHistory;
```

---

## 核心方法

### `send(message, sender, allProcesses)` → boolean

```
SEND 流程：
1. 在 allProcesses 中找到接收方
2. 如果接收方在 waitingReceivers 中（已在等消息）
   → 直接投递到缓冲区 → 从 waitingReceivers 移除 → 返回 true
3. 如果接收方缓冲区已满（>= messageBufferSize）
   → 返回 false（发送方需阻塞等待）
4. 否则投递到缓冲区 → 返回 true
```

### `receive(receiver)` → boolean

```
RECEIVE 流程：
1. 如果接收方缓冲区非空 → 消费最早的消息 → 返回 true
2. 如果缓冲区为空
   → 注册到 waitingReceivers → receiver.waitingForMessage = true → 返回 false（接收方需阻塞）
```

### `checkWokenReceivers()` → List<Integer>

在中断处理阶段调用：遍历 `waitingReceivers`，检查哪些接收方的缓冲区已有消息（被其他进程 SEND 投递了），返回这些 PID 列表供唤醒。

---

## 调用关系（假设被使用）

```
ProcessManager (沙盒)
    │  当前使用 IpcCallback 直接操作 PCB
    │
IpcManager (备选)
    │
    ├── send()     — 发送消息
    ├── receive()  — 接收消息
    ├── checkWokenReceivers() — 检查可唤醒的接收者
    └── getMessageHistory() — 获取消息历史
```

---

## 与沙盒 IPC 的对比

| 特性 | IpcManager（备选） | ProcessManager.IpcCallback（使用中） |
|------|------------------|-----------------------------------|
| 消息查找 | 通过 `receiverPid` 精确匹配 | 通过 `targetAppType`（应用类型名）匹配 |
| 阻塞管理 | 独立的 `waitingReceivers` 表 | 直接操作 PCB 的 `waitingForMessage` 标志 |
| 唤醒方式 | `checkWokenReceivers()` 批量检查 | 在 SEND 回调中立即唤醒 |
| 历史记录 | ✅ 有 `messageHistory` | ❌ 无 |
| 缓冲满处理 | 返回 false，发送方阻塞 | 未处理 |

---

## 特殊逻辑

- **消息历史记录上限**：`messageHistory` 超过 100 条自动移除最早的。
- **不可修改视图**：`getWaitingReceivers()` 返回 `Collections.unmodifiableMap()`，防止外部修改。
- **暂无 `@Service` 注解**：这个类没有 Spring 注解，需要手动实例化或添加 `@Service` 才能被自动注入。
