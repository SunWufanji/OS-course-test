# SJFScheduler.java — 短作业优先

**算法简称：** SJF（Shortest Job First）

---

## 选择逻辑

```java
readyQueue.stream()
    .min((a, b) -> {
        int cmp = Integer.compare(a.getRemainingTime(), b.getRemainingTime());
        return cmp != 0 ? cmp : Integer.compare(a.getArrivalTime(), b.getArrivalTime());
    })
```

从就绪队列中选 **remainingTime 最小**（即总执行时间最短）的进程。时间相同时选先到达的。

---

## 特点

| 特性 | 说明 |
|------|------|
| 是否抢占 | **非抢占** — 一旦开始就运行到结束 |
| 选择依据 | 剩余时间（=总执行时间，非抢占场景下等价于 burstTime） |
| 平均周转 | **理论最优**（非抢占模式下平均等待时间最小） |
| 公平性 | 差 — 长作业可能"饥饿" |
| 问题 | 需要预知进程执行时间，现实中难以实现 |

---

## 与 SRTN 的区别

| 特性 | SJF | SRTN |
|------|-----|------|
| 抢占 | ❌ 非抢占 | ✅ 可抢占 |
| 选择时机 | 进程完成/到达时 | 每个 tick/到达时 |
| 选谁 | 总时间最短 | 剩余时间最短 |
