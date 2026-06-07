# MessageQueue.java — 消息队列

**包路径：** `com.processos.sync.MessageQueue`

---

## 职责

经典的**同步消息队列**实现，支持阻塞生产/消费。与操作系统中管程（Monitor）内的条件变量类似——`send` 在队列满时阻塞，`receive` 在队列空时阻塞。

---

## 核心原理

### `send(message)` — 发送消息

```java
public synchronized void send(String message) {
    while (queue.size() >= maxSize) {
        wait();  // 队列满，阻塞
    }
    queue.offer(message);
    notify();  // 唤醒可能阻塞的 receive
}
```

### `receive()` — 接收消息

```java
public synchronized String receive() {
    while (queue.isEmpty()) {
        wait();  // 队列空，阻塞
    }
    String message = queue.poll();
    notify();  // 唤醒可能阻塞的 send
    return message;
}
```

---

## 与项目 IPC 的对比

| 特性 | MessageQueue（sync/ 包） | PCB.messageBuffer（沙盒 IPC） |
|------|------------------------|-----------------------------|
| 实现方式 | 独立队列类，阻塞线程 | PCB 上的 `List<String>` |
| 阻塞方式 | `wait()` 阻塞线程 | 在 ProcessManager 中设置 PCB 状态为 BLOCKED |
| 容量限制 | 有（maxSize） | 有（messageBufferSize=5） |
| 线程安全 | ✅ synchronized | ❌ 需要外部同步 |
| 是否被使用 | ❌ 独立实现 | ✅ 沙盒 IPC 实际使用 |

---

## 生产者消费者模式

这个 MessageQueue 完美实现了生产者消费者模式：

```
生产者线程              消费者线程
    │                       │
send("数据")             receive()
    │                       │
    ├── 队列满→wait()       ├── 队列空→wait()
    ├── 入队                ├── 出队
    └── notify() 唤醒消费者 └── notify() 唤醒生产者
```

---

## 调用关系

与 `Semaphore`、`Mutex` 一样，这是一个**独立的经典实现**，当前未被项目直接使用。适用于扩展/教学演示。
