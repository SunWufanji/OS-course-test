# LabController.java — 内核算法实验室模拟器

**包路径：** `com.processos.controller.LabController`
**请求前缀：** `/api/lab`
**自动注入：** `ProcessService`（业务逻辑）

---

## 职责

这是**内核算法实验室**的核心模拟引擎。前端实验室页面传入进程配置和算法名称，这个 Controller **在后端完整跑一遍调度模拟**，返回甘特图数据和统计信息。

**与 `ProcessController` 的区别：** `ProcessController` 管理实验室的增量操作（创建进程、手动 tick），而这个 Controller 执行**完整的一次性模拟**，从开始到所有进程完成。

---

## 端点详解

### `POST /api/lab/simulate`（唯一核心端点）

**请求体示例：**
```json
{
  "algorithm": "FCFS",
  "quantum": 2,
  "processes": [
    {"name": "P1", "burstTime": 6, "priority": 3, "arrivalTime": 0},
    {"name": "P2", "burstTime": 4, "priority": 1, "arrivalTime": 1}
  ]
}
```

**执行流程：**

```
1. 解析请求 → algorithm, quantum, processes[]
2. processService.reset()              ← 清空之前的状态
3. processService.setScheduler(algo)   ← 设置调度算法
4. processService.setTimeQuantum(q)    ← 设置时间片
5. 循环创建每个进程
6. 循环 tick 直到全部完成（上限200tick）
   ├── processService.tick()
   ├── 收集甘特图数据（有新块就追加）
   └── 检查是否所有进程 TERMINATED
7. 给每个 PID 分配颜色（10种固定颜色循环）
8. 返回结果
```

**返回数据：**
```json
{
  "gantt": [
    {"pid": 1, "name": "P1", "start": 0, "end": 3, "color": "#6366f1"},
    {"pid": 2, "name": "P2", "start": 3, "end": 5, "color": "#8b5cf6"}
  ],
  "stats": {
    "avgTurnaround": 5.5,
    "avgWaiting": 1.5,
    "throughput": 0.4
  },
  "totalTime": 5,
  "algorithm": "FCFS"
}
```

---

## 特殊逻辑说明

- **甘特图数据收集方式**：每次 tick 后比较当前甘特图长度与已收集长度，如果变长说明有新块产生。这种方式避免了对甘特图内部结构的深度耦合。
- **200 tick 安全上限**：防止死循环（比如算法有 bug 导致进程永远无法完成）。
- **颜色分配**：按进程首次出现的顺序循环分配 10 种预设颜色（紫/粉/红/橙/黄/绿系），确保同一个进程跨多个时间块的甘特图颜色一致。
- **完整模拟 vs 步进模拟**：这个方法是一次性跑完整个调度，适合"运行并查看结果"的场景；`ProcessController.tick()` 是单步推进，适合"一步步观察"的场景。
