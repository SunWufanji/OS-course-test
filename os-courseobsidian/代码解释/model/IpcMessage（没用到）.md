# IpcMessage.java — IPC 消息数据结构

**包路径：** `com.processos.model.IpcMessage`

---

## 职责

表示一条**进程间通信（IPC）消息**。当进程 A SEND 消息给进程 B 时，消息封装为 `IpcMessage` 对象传递给接收方。

**注意：** 当前代码中沙盒模式的 IPC 通信实际上使用 PCB 的 `messageBuffer`（`List<String>`），直接传字符串消息。`IpcMessage` 是一个更通用的数据结构，可能为后续扩展使用。

---

## 字段

```java
private int senderPid;       // 发送方进程 PID
private int receiverPid;     // 接收方进程 PID
private String content;      // 消息内容
private int timestamp;       // 发送时间戳（时钟滴答数）
```

---

## 对比：两种 IPC 实现

| 特性 | PCB.messageBuffer（当前使用） | IpcMessage（备选） |
|------|------------------------------|-------------------|
| 数据类型 | `List<String>`（纯文本） | 结构化对象 |
| 是否持久化 | 否（内存） | 否 |
| 字段 | 只有内容字符串 | 发送方、接收方、内容、时间戳 |
| 使用场景 | CpuCore SEND/RECV 指令 | 预留扩展 |

---

## 调用关系

虽然当前未被 CpuCore/IPC 流程直接使用，`IpcMessage` 可以用于：
- `IpcManager` 中的消息追踪
- 前端 IPC 通信可视化（显示谁在何时给谁发了什么消息）
- 消息持久化或重放

---

## 特殊逻辑

- **纯 POJO**：无 `@Entity` 注解，不映射数据库表。所有字段是基本类型和 String。
- **空构造器 + 全参构造器**：同时支持无参实例化和一次性构建设置。
