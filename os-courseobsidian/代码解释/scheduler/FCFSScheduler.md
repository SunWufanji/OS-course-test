# FCFSScheduler.java — 先来先服务

**算法简称：** FCFS（First Come First Served）

---

## 选择逻辑

```java
readyQueue.stream()
    .min((a, b) -> Integer.compare(a.getArrivalTime(), b.getArrivalTime()))
```

从就绪队列中选 **arrivalTime 最小**（即最早到达）的进程。完全按到达顺序执行。

---

## 特点

| 特性 | 说明 |
|------|------|
| 是否抢占 | **非抢占** — 一旦开始执行就运行到结束 |
| 选择依据 | 到达时间 |
| 平均周转 | 可能较长（短作业排长作业后面时） |
| 公平性 | 绝对公平（先到先得） |
| 适用场景 | 批处理系统 |
