# Mutex.java — 互斥锁

**包路径：** `com.processos.sync.Mutex`

---

## 职责

经典的**互斥锁**（Mutex）实现，确保同一时间只有一个线程能进入临界区。

---

## 核心原理

```java
private boolean locked;  // true=已被锁定
```

### lock（加锁）

```java
public synchronized void lock() {
    while (locked) {
        wait();  // 已被锁住，阻塞等待
    }
    locked = true;  // 加锁成功
}
```

使用 `while` 而非 `if` 来检查锁定状态（防止虚假唤醒，Spurious Wakeup）。

### unlock（解锁）

```java
public synchronized void unlock() {
    locked = false;
    notify();  // 唤醒一个等待线程
}
```

---

## Mutex vs Semaphore(1)

| 特性 | Mutex | 二进制信号量（初始值1） |
|------|-------|------------------------|
| 所有者概念 | 有（谁 lock 谁 unlock） | 无（任何线程都可 V） |
| 释放限制 | 只能由锁定者释放 | 任何线程都可释放 |
| 代码实现 | boolean + while 等待 | int 计数 + wait/notify |
| 典型用途 | 互斥访问共享资源 | 同步+互斥 |

---

## 调用关系

与 `Semaphore` 一样，这个类是**独立的经典实现**，当前未被项目直接集成使用。适用于：
- 需要经典互斥锁语义的演示或扩展
- 作为 `SyncDemoService` 的底层同步工具
