# VectorScheduler.java — 向量调度算法

**算法简称：** Vector（Vector Scheduling）

---

## 职责

一种**多维加权评分**调度算法，根据 5 个维度的特征向量计算每个进程的得分，选择**得分最高**的进程。

这是一种"加分"调度策略（非传统 OS 算法，本项目自定义的算法）。

---

## 评分公式

```
Score = w₁·f_priority + w₂·f_waiting + w₃·f_remaining + w₄·f_burst + w₅·f_recency
```

### 5 个特征向量（均归一化到 0~1）

| 维度 | 公式 | 权重(默认) | 含义 |
|------|------|-----------|------|
| `f_priority` | `1 - priority/maxPriority` | **0.3** | 优先级越高，分越高 |
| `f_waiting` | `min(waitingTime/maxWaiting, 1)` | **0.25** | 等待越久，分越高（抗饥饿） |
| `f_remaining` | `1 - remainingTime/maxRemaining` | **0.25** | 剩余越少，分越高（趋近完成） |
| `f_burst` | `1 - burstTime/maxBurst` | **0.1** | 作业越短，分越高 |
| `f_recency` | `arrivalTime/latestArrival` | **0.1** | 越晚到达，分越高 |

### 权重可调

```java
private double[] weights = {0.3, 0.25, 0.25, 0.1, 0.1};

// 可通过构造器或 setter 修改：
new VectorScheduler(new double[]{0.2, 0.3, 0.2, 0.15, 0.15});
```

---

## 归一化基准值动态更新

`selectNext()` 每次调用时从就绪队列中实时计算：

```java
latestArrival = readyQueue.stream().mapToInt(ProcessControlBlock::getArrivalTime).max()...
maxPriority  = readyQueue.stream().mapToInt(ProcessControlBlock::getPriority).max()...
maxWaiting   = readyQueue.stream().mapToInt(ProcessControlBlock::getWaitingTime).max()...
maxRemaining = readyQueue.stream().mapToInt(ProcessControlBlock::getRemainingTime).max()...
maxBurst     = readyQueue.stream().mapToInt(ProcessControlBlock::getBurstTime).max()...
```

确保不同批次进程的分数可比。

---

## 特点

| 特性 | 说明 |
|------|------|
| 是否抢占 | 取决于外部调用方式 |
| 选择依据 | 加权总分（5 维度） |
| 可配置性 | **最高** — 权重可任意调整 |
| 抗饥饿 | ✅ f_waiting 维度保证等待越久分越高 |
| 适用场景 | 需要精细控制调度倾向的场景 |

---

## 前端展示

### `getScoreBreakdown(p, currentTime)` → double[5]
返回 5 个维度的**加权单项分**，前端可将其显示为雷达图或堆叠条形图：

```json
[0.15, 0.20, 0.18, 0.06, 0.08]  // 总分 = 0.67
```

### `getWeightNames()` → String[]
```json
["优先级", "等待时间", "剩余时间", "作业长度", "到达时间"]
```

---

## 调用关系

```
ProcessService
    └── scheduler.selectNext(readyQueue, currentTime)
            └── VectorScheduler.calculateScore(p, currentTime)
                    └── 加权求和 → 返回最高分进程

SystemController.getMaawsScores()
    └── ProcessManager.refreshScores()  ← 使用不同算法
```
