# SyncDemoService.java — 同步互斥演示服务

**包路径：** `com.processos.service.SyncDemoService`
**注解：** `@Service`

---

## 职责

实现**三道经典同步互斥问题的交互式演示**：生产者消费者（多线程）、读者写者（手动步进）、哲学家用餐（手动步进 + 死锁演示）。

由 `SyncLabController` 提供 REST API，前端按步骤调用。

---

## 1. 生产者消费者（多线程自动运行）

### 信号量设计

使用 `AtomicInteger` 模拟信号量：

| 信号量 | 初始值 | 作用 |
|--------|--------|------|
| `empty` | 8（=缓冲区大小） | 空闲缓冲区数量 |
| `full` | 0 | 满缓冲区数量 |
| `mutex` | 1 | 互斥锁 |

### 严格 PV 操作

```java
// 生产者
P(empty) → P(mutex) → 放入缓冲区 → V(mutex) → V(full)

// 消费者
P(full) → P(mutex) → 取出缓冲区 → V(mutex) → V(empty)
```

### 关键方法

| 方法 | 作用 |
|------|------|
| `initProducerConsumer()` | 初始化：清空缓冲区、重置信号量 |
| `startProducerConsumer(nP, nC)` | 启动 n 个生产者线程 + n 个消费者线程 |
| `stopProducerConsumer()` | 停止所有线程、清理资源 |
| `getProducerConsumerStatus()` | 返回缓冲区状态 |

### 线程实现

- 每个生产者和消费者在独立的守护线程（Daemon Thread）中运行
- 使用 `Thread.sleep(500-1300ms)` 模拟生产和消费时间
- 500ms 定时检查 `pcRunning` 标志以支持优雅退出
- `synchronized` + `wait/notifyAll` 实现信号量等待

---

## 2. 读者写者（手动步进）

### 数据结构

```java
private AtomicInteger rwReadCount;  // 当前读者数量
private AtomicInteger rwWrt;        // 读写互斥锁（1=可用）
private boolean rwWriting;          // 是否有写者在写
private String[] rwReaderStates;    // 3 个读者的状态
private String[] rwWriterStates;    // 2 个写者的状态
```

### 规则

- **读者可同时读**（无写者时）
- **写者独占**（无读者、无写者时）
- 有写者在写时 → 读者阻塞
- 有读者在读时 → 写者阻塞

### 关键方法（手动步进）

| 方法 | 作用 |
|------|------|
| `readerStep(index)` | 读者开始读（若写者在写则阻塞） |
| `readerFinish(index)` | 读者结束读，readCount-1 |
| `writerStep(index)` | 写者开始写（若有读者/写者则阻塞） |
| `writerFinish(index)` | 写者结束写 |

---

## 3. 哲学家用餐（手动步进 + 死锁演示）

### 数据结构

```java
private String[] philosopherStates;  // 5 位哲学家的状态
private boolean[] chopsticks;        // 5 根筷子（true=被拿起）
private boolean hasDeadlock;         // 是否检测到死锁
private String deadlockStrategy;     // 死锁预防策略
```

### 规则

- 每位哲学家需要**同时拿起左右两根筷子**才能吃饭
- 拿起一根、另一根被占用 → 阻塞
- 所有人拿着左边筷子等右边 → **死锁**

### 关键方法

| 方法 | 作用 |
|------|------|
| `philosopherGetHungry(id)` | 哲学家从"思考"变"饥饿" |
| `philosopherEat(id)` | 尝试拿筷子→"吃饭"或"阻塞" |
| `philosopherPutChopsticks(id)` | 放下筷子→"思考" |
| `triggerDeadlock()` | 触发死锁演示（所有哲学家同时拿左手筷子） |
| `setDeadlockStrategy(strategy)` | 切换死锁预防策略 |

### 死锁预防策略

| 策略 | 说明 |
|------|------|
| `NONE` | 无预防，可能死锁 |
| `ODD_EVEN` | 奇偶哲学家拿筷顺序相反（偶数先右后左），破坏循环等待 |
| `LIMIT_4` | 最多 4 人同时就餐（破坏互斥条件的一种变体） |

---

## 通用

### 日志

```java
private final List<String> syncLog = new CopyOnWriteArrayList<>();

addLog("[生产者0] P(empty) 阻塞！empty=0")
```

所有操作记录日志，上限 100 条。通过 `getLog()` / `clearLog()` 由前端显示。

---

## 调用关系

```
SyncLabController
    │
    └── SyncDemoService
            │
            ├── 生产者消费者 — 多线程自动运行
            ├── 读者写者 — 手动步进
            ├── 哲学家用餐 — 手动步进 + 死锁演示
            └── 日志管理
```
