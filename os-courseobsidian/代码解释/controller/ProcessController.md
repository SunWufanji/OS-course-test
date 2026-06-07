# ProcessController.java — 算法实验室 API

**包路径：** `com.processos.controller.ProcessController`
**请求前缀：** `/api`
**自动注入：** `ProcessService`（算法实验室业务逻辑）

---

## 职责

这是**内核算法实验室**（调度算法对比平台）的控制器。桌面上的"内核算法实验室"窗口通过这个 Controller 与后端的 `ProcessService` 交互。

**与 `SystemController` 的区别：** `SystemController` 管理沙盒模式的进程生命周期，这个 Controller 专注于**算法对比实验室**——创建进程、tick 推进、切换算法、查看甘特图和统计信息，并与 MySQL 持久化交互。

---

## 端点详解

### 1. 进程管理 (算法实验室)

#### `GET /api/processes`
**核心方法。** 返回算法实验室的完整状态：
- `processes`：所有进程列表
- `readyQueue` / `blockedQueue` / `runningProcess`：三队列状态
- `currentTime`：当前时间
- `currentAlgo`：当前调度算法名称
- `ganttData`：甘特图数据块列表
- `stats`：统计信息（平均周转时间、等待时间等）
- `currentGantt`：当前运行进程的甘特图块（含颜色）
- `mfqQueues`：如果当前是 MFQ 算法，返回多级队列大小

#### `POST /api/processes`
创建进程。参数：`{name, burstTime, priority, arrivalTime}`。返回创建好的 `ProcessControlBlock`。

#### `DELETE /api/processes/{pid}`
删除指定进程。

#### `POST /api/processes/{pid}/suspend`
挂起进程。

#### `POST /api/processes/{pid}/resume`
恢复进程。

### 2. 调度控制

#### `POST /api/tick`
执行一个时间片推进。调用 `ProcessService.tick()`，返回新的状态。

#### `POST /api/scheduler`
切换调度算法。参数：`{algo: "FCFS"|"SJF"|"RR"|"Priority"|"SRTN"|"PreemptivePriority"|"MFQ"}`。

#### `POST /api/quantum`
设置时间片大小（仅 RR 算法有效）。参数：`{quantum: int}`。

### 3. 实验场景

#### `GET /api/scenarios`
从 MySQL 的 `scenario_config` 表读取所有预设场景。

#### `POST /api/scenarios/{id}/load`
加载指定场景：根据场景的 `config_json` 自动创建进程，重置当前状态。

### 4. 历史记录

#### `GET /api/history`
获取最近 10 条模拟性能记录（从 `performance_metrics` 表读取）。

#### `DELETE /api/history/{id}`
删除单条历史记录。

#### `DELETE /api/history`
清空所有历史记录。

#### `GET /api/history/{id}/processes`
获取某条历史记录的各进程详情（从 `execution_log` 表读取）。

#### `POST /api/history/{id}/replay`
从历史记录重新创建进程并运行。

### 5. 数据持久化

#### `POST /api/save`
将当前模拟结果保存到数据库（同时保存 `execution_log` 和 `performance_metrics`）。

### 6. 系统控制

#### `POST /api/reset`
重置系统：清空所有进程、队列、甘特图数据。

#### `POST /api/demo`
加载 5 个预设演示进程（用于快速演示）。

### 7. 进程树

#### `POST /api/processes/{pid}/fork`
为指定进程创建子进程。参数：`{name: "child_name"}`。

#### `DELETE /api/processes/{pid}/tree`
级联终止整个进程树（父子进程全部终止）。返回所有被终止的 PID 列表。

#### `GET /api/processes/tree`
获取进程树结构数据。

---

## 调用关系

```
ProcessController
    │
    └── ProcessService
            │
            ├── Scheduler（各种调度算法实现）
            ├── ExecutionLogRepository（JPA）
            ├── PerformanceMetricsRepository（JPA）
            └── ScenarioConfigRepository（JPA）
```

---

## 特殊逻辑说明

- **当前运行进程的甘特图补充**：`getProcesses()` 中为正在运行的进程动态生成 `currentGantt` 块（含 pid、name、color、start、end），确保甘特图实时更新。
- **MFQ 队列信息**：只有当前算法是 "MFQ" 时才返回 `mfqQueues` 数据。
- **场景加载**：`/scenarios/{id}/load` 会先 reset 再根据 JSON 配置创建进程，等价于载入一个预设。
