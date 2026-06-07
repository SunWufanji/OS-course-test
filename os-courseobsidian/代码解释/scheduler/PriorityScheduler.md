# PriorityScheduler.java — 优先级调度（非抢占）

**算法简称：** Priority（Priority Scheduling）

---

## 选择逻辑

```java
readyQueue.stream()
    .min((a, b) -> {
        int cmp = Integer.compare(a.getPriority(), b.getPriority());
        return cmp != 0 ? cmp : Integer.compare(a.getArrivalTime(), b.getArrivalTime());
    })
```

从就绪队列中选 **priority 最小**（数字越小优先级越高）的进程。优先级相同时选先到达的。

---

## 特点

| 特性 | 说明 |
|------|------|
| 是否抢占 | **非抢占** — 一旦开始就运行到结束 |
| 选择依据 | 优先级（1最高，5最低） |
| 公平性 | 差 — 低优先级可能饥饿 |
| 与抢占式区别 | 只在进程完成/到达时选，不中断正在运行的高优先级进程 |

---

## 优先级定义

项目中使用数字 **1-5**（与 `SimulatedApp` 的 priority 一致）：
- **1** — 最高（CSGO、PUBG）
- **2** — 高（我的世界、IPC演示）
- **3** — 中（Chrome、VSCode、打印机演示）
- **4** — 低（Notepad、Word、Excel、杀毒软件）
- **5** — 最低（下载工具、系统更新）
