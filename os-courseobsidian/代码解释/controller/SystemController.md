# SystemController.java — 沙盒主控 API

**包路径：** `com.processos.controller.SystemController`
**请求前缀：** `/api`
**自动注入：** `ProcessManager`（进程管理核心）、`HardwarePool`（硬件资源）

---

## 职责

这是**桌面沙盒模式**的**核心控制器**。前端桌面上的所有操作——启动应用、结束进程、挂起/恢复、暂停/单步——都由这个 Controller 处理。它与 `ProcessManager` 对接，`ProcessManager` 是沙盒模式下调度逻辑的核心。

---

## 端点详解

### 1. 系统状态

#### `GET /api/system/status`
返回硬件资源的实时状态（CPU 使用率、内存使用率、总内存、可用内存等），供桌面的 HUD 仪表盘和任务管理器使用。

#### `GET /api/system/apps`
遍历 `SimulatedApp` 枚举的所有值，返回可在桌面启动的应用列表（id、name、icon、cpuUsage、memoryRequired）。

#### `GET /api/system/registers`
调用 `CpuCore.getRegisterSnapshot()` 获取当前运行进程的 CPU 寄存器值快照（PC、AX、BX、CX、DX），用于代码段执行可视化。

#### `GET /api/system/maaws-scores`
返回所有进程的 MAAWS 调度分数（一种综合调度评估指标）。

### 2. 进程生命周期

#### `POST /api/process/launch`
**核心方法。** 接收 `{appName}`，调用 `ProcessManager.launchApp(app)`。

`launchApp()` 有三种返回值，需要分别处理：

| 返回值类型 | 含义 | 处理方式 |
|-----------|------|---------|
| `Integer(pid)` | 正常启动成功 | `success=true`，返回进程信息 |
| `-1` | 单实例应用已在运行 | `success=false, alreadyRunning=true`，前端激活已有窗口 |
| `"WAITING_MEMORY"` | 内存不足，已进入阻塞队列 | `success=true, waitingMemory=true`，前端静默刷新 |
| `null` | 内存不足（旧路径） | `success=false, error="内存不足"` |

**注意：** `"WAITING_MEMORY"` 的检测必须放在 `Integer(pid)` 之前，因为 String 不能 cast 为 int。

#### `POST /api/process/{pid}/terminate`
调用 `ProcessManager.killProcess(pid)` 终止进程。

#### `POST /api/process/{pid}/suspend`
调用 `ProcessManager.suspendProcess(pid)` 挂起进程。

#### `POST /api/process/{pid}/resume`
调用 `ProcessManager.resumeProcess(pid)` 恢复进程。

### 3. 进程查询

#### `GET /api/process/sandbox`
返回所有沙盒进程的列表（每个进程的 PCB 信息）。

#### `GET /api/process/tree`
返回进程树结构（父子关系），前端用于可视化展示。

#### `GET /api/process/search?q=xxx`
按关键字搜索进程。

### 4. 调度控制

#### `GET /api/system/scheduler`
返回完整的调度器状态：
- `runningProcess`：当前运行进程
- `readyQueue`：统一就绪队列
- `blockedQueue`：阻塞队列
- `q0/q1/q2`：三级 MLFQ 队列
- `currentQueueLevel`：当前从哪一级取进程
- `clockTick`：当前时钟滴答数
- `paused`：是否暂停

#### `POST /api/system/pause`
切换时钟暂停/恢复，返回新的 paused 状态。

#### `POST /api/system/auto-pause`
切换单步模式（每执行一个 tick 后自动暂停）。

#### `POST /api/system/step`
单步执行：调用 `ProcessManager.tickForced()`（绕过暂停检查），执行后保持暂停状态。用于调试模式下一步步观察。

#### `POST /api/system/run`
连续运行：如果不处于暂停状态，执行一个 tick。由前端定时器（500ms）循环调用。

### 5. 系统管理

#### `POST /api/system/reset`
调用 `ProcessManager.clearAll()`：终止所有进程、释放所有资源、清空队列，完全重置沙盒。

#### `GET /api/system/interrupt-log`
获取中断历史日志（最近 50 条，含事件类型、颜色编码）。

---

## 调用关系

```
SystemController
    │
    ├── ProcessManager.launchApp()
    ├── ProcessManager.killProcess()
    ├── ProcessManager.suspendProcess()
    ├── ProcessManager.resumeProcess()
    ├── ProcessManager.clearAll()
    ├── ProcessManager.tick() / tickForced()
    ├── ProcessManager.getAllProcesses()
    ├── ProcessManager.getProcessTree()
    └── HardwarePool.getStatus()
```

---

## 特殊逻辑说明

- **WAITING_MEMORY 处理**：`launchResult[0]` 的类型是 `Object`，需要先用 `String.equals()` 判断再 `(int)` 转型，否则 `ClassCastException`。
- **暂停的两种模式**：`togglePause()` 是手动暂停/恢复；`toggleAutoPause()` 是单步模式（每个 tick 后自动停）。
- **tick 方法选择**：`step()` 用 `tickForced()`（无视暂停强制推进），`run()` 用 `tick()`（暂停时跳过）。
