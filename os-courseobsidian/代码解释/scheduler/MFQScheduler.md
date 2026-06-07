# MFQScheduler.java — 多级反馈队列

**算法简称：** MFQ（Multilevel Feedback Queue）

**注意：** 这个类是**算法实验室**用的独立实现。沙盒模式使用的是 `ProcessManager` 内置的三级 MLFQ（Q0/Q1/Q2，8/10/16 tick），两者是不同的实现。

---

## 队列结构

```java
// 4 级队列
queues[0] — 时间片=1，最高优先级
queues[1] — 时间片=2
queues[2] — 时间片=4
queues[3] — FCFS（时间片=∞），最低优先级
```

## 选择逻辑

```java
// 从最高优先级队列开始查找非运行进程
for (int i = 0; i < queues.size(); i++) {
    for (ProcessControlBlock p : queues.get(i)) {
        if (p.getState() != ProcessState.RUNNING) {
            currentLevel = i;
            return p;
        }
    }
}
```

严格按优先级从高到低（Q0→Q1→Q2→Q3）查找，返回第一个非运行的进程。

---

## 额外方法

| 方法 | 功能 |
|------|------|
| `addToQueue0(process)` | 新进程加入 Q0 |
| `demoteProcess(process)` | 时间片用完 → 降级到下一级队列 |
| `removeProcess(process)` | 进程完成 → 从队列中移除 |
| `findProcessQueue(process)` | 查找进程在哪个队列 |
| `getCurrentTimeQuantum()` | 获取当前队列时间片 |
| `getQueueSizes()` | 返回各队列大小 |

---

## 特点

| 特性 | 说明 |
|------|------|
| 队列数 | **4 级**（Q0/Q1/Q2/Q3） |
| 时间片 | **递增**：1 → 2 → 4 → FCFS |
| 新进程 | 始终进入 Q0 |
| 降级规则 | 时间片用完未完成 → 降一级 |
| 抢占规则 | 高优先级队列非空时，低优先级进程被抢占 |

---

## MFQ（实验室） vs MLFQ（沙盒 ProcessManager）对比

| 特性 | MFQ（scheduler/MFQScheduler） | MLFQ（ProcessManager 内置） |
|------|-----------------------------|---------------------------|
| 使用场景 | **算法实验室** | **桌面沙盒模式** |
| 队列数 | 4 级（0/1/2/3） | 3 级（Q0/Q1/Q2） |
| 时间片 | 1/2/4/FCFS | 8/10/16 |
| 实现方式 | 独立的 Scheduler 类 | 硬编码在 ProcessManager 中 |
| 老化 | ❌ 不支持 | ✅ 30 tick 阈值升级 |
| 抢占 | ✅ 高优先级抢占 | ✅ Q0 新进程抢占 Q1/Q2 |
