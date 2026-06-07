# PreemptivePriorityScheduler.java — 抢占式优先级调度

**算法简称：** PreemptivePriority

---

## 选择逻辑

```java
readyQueue.stream()
    .min((a, b) -> {
        int cmp = Integer.compare(a.getPriority(), b.getPriority());
        return cmp != 0 ? cmp : Integer.compare(a.getArrivalTime(), b.getArrivalTime());
    })
```

与非抢占 Priority **完全相同**的选择逻辑。抢占的实现在 `ProcessService.tick()` 中——每次 tick/新进程到达时重新评估，如果有更高优先级进程则抢占。

---

## 特点

| 特性 | Priority | PreemptivePriority |
|------|----------|-------------------|
| 逻辑 | `min(priority)` | `min(priority)` |
| 抢占 | ❌ | ✅ |
| 代码 | 完全相同 | 完全相同 |

**两个类的 selectNext() 代码完全一样，唯一区别在 `getName()` 和调度器使用方式。**

---

## 优先级抢占场景

```
tick 0: P1(优先级3) 上CPU执行
tick 2: P2(优先级1) 到达 → PreemptivePriority 发现 P2 > P1
        → 抢占 P1, P2 上 CPU
tick 5: P2 完成 → P1 继续执行
```

非抢占版本中，P1 会一直执行到结束才轮到 P2，即使 P2 优先级更高。
