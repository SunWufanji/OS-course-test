# SRTNScheduler.java — 最短剩余时间优先（抢占式）

**算法简称：** SRTN（Shortest Remaining Time Next）

---

## 选择逻辑

```java
readyQueue.stream()
    .min((a, b) -> {
        int cmp = Integer.compare(a.getRemainingTime(), b.getRemainingTime());
        return cmp != 0 ? cmp : Integer.compare(a.getArrivalTime(), b.getArrivalTime());
    })
```

与 SJF 的选择逻辑**完全相同**（都是选 remainingTime 最小的），区别在于：

| 特性 | SJF | SRTN |
|------|-----|------|
| 代码 | `min(remainingTime)` | `min(remainingTime)` |
| 抢占 | ❌ | ✅ |

SRTN 的抢占逻辑在 `ProcessService.tick()` 中实现——每次有新进程到达或每个 tick 时都检查是否有剩余时间更短的进程，有则抢占。

---

## 特点

| 特性 | 说明 |
|------|------|
| 是否抢占 | **是**（新进程剩余时间更短时抢占） |
| 选择依据 | 剩余时间 |
| 平均周转 | **理论最优**（抢占模式下平均周转时间最小） |
| 公平性 | 差 — 长作业可能饥饿 |
| 上下文切换 | 比 SJF 多（频繁抢占） |
