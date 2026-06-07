# Semaphore.java — 信号量

**包路径：** `com.processos.sync.Semaphore`

---

## 职责

经典的**信号量**（Semaphore）实现，支持 P/V 操作。用于进程/线程间的同步与互斥。

---

## 核心原理

```java
private int value;   // 信号量值（≥0 表示可用资源数，<0 表示等待线程数）
```

### P 操作（申请资源）

```java
public synchronized void P() {
    value--;
    if (value < 0) {
        wait();  // 资源不足，阻塞当前线程
    }
}
```

### V 操作（释放资源）

```java
public synchronized void V() {
    value++;
    if (value <= 0) {
        notify();  // 有线程在等待，唤醒一个
    }
}
```

---

## 计数信号量 vs 二进制信号量

| 类型 | 初始值 | 用途 |
|------|--------|------|
| 计数信号量 | N（>1） | 管理多个资源，如缓冲区空位 |
| 二进制信号量 | 1 | 互斥访问，等价于互斥锁 |

---

## 调用关系

这个类当前是**独立的经典实现**，未被项目中的沙盒 IPC/同步功能直接集成使用（沙盒模式通过 `ProcessManager.IpcCallback` 和 `IoManager` 实现同步）。

可能的使用场景：
- 在 `SyncDemoService` 中替代 `AtomicInteger` 实现更严格的信号量语义
- 在算法实验室中作为同步原语演示

---

## 特殊逻辑

- **synchronized 方法**：P/V 操作都是 `synchronized`，保证线程安全。
- **wait/notify**：使用 Java 内置的等待/通知机制实现线程阻塞和唤醒（需要在 synchronized 块中调用）。
- **InterruptedException 处理**：P 操作中如果被中断，恢复中断标志位（`Thread.currentThread().interrupt()`），而不是吞掉异常。
