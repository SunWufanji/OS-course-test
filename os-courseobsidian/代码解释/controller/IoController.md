# IoController.java — I/O 设备管理 API

**包路径：** `com.processos.controller.IoController`
**请求前缀：** `/api/io`
**自动注入：** `IoManager`（I/O 设备核心）、`ProcessManager`（进程管理）

---

## 职责

管理所有 I/O 设备相关的操作：**独占设备**（打印机、U盘）的申请/释放、**共享设备**（音频）的播放/停止、**磁盘调度**（电梯算法）的请求/步进。桌面上的"打印"按钮、"写入U盘"按钮、I/O 设备管理器窗口都通过这个 Controller 工作。

---

## 端点详解

### 1. 独占设备 — 打印机

#### `POST /api/io/print`
Word/Excel 等应用的"打印"按钮触发。

流程：
1. 调用 `IoManager.requestExclusiveDevice("PRINTER", pid, name)` 申请打印机
2. 如果成功 → PCB 的 `occupiedDevice` 设为 "打印机"
3. 如果失败（被占用）→ PCB 状态设为 `BLOCKED`，`blockedReason` 设为 "等待打印机"
4. 返回申请结果 + 所有独占设备的状态

**关键逻辑：** 打印机的互斥由 `ExclusiveDevice` 类维护，内含 `ownerPid` 和 `waitingQueue`（FIFO 等待队列）。

#### `POST /api/io/print-done`
打印完成，释放打印机。

流程：
1. 调用 `IoManager.releaseExclusiveDevice("PRINTER", pid)` 释放
2. 释放后如果等待队列里有进程，返回被唤醒的进程 PID
3. 被唤醒进程：状态设为 RUNNING、清除 blockedReason、占用打印机

### 2. 独占设备 — 通用（U盘等）

#### `POST /api/io/exclusive/request`
通用独占设备申请。参数：`{device, pid, processName}`。用于 U盘写入等场景。

#### `POST /api/io/exclusive/release`
通用独占设备释放。参数：`{device, pid}`。释放后自动唤醒等待队列中的下一个进程。

#### `GET /api/io/exclusive/status`
获取所有独占设备的当前状态（占用者、等待队列）。

### 3. 共享设备 — 音频

#### `POST /api/io/audio/play`
开始播放音频。参数：`{pid, processName}`。音频是共享设备，多个进程可以同时使用。

#### `POST /api/io/audio/stop`
停止音频播放。参数：`{pid}`。

#### `GET /api/io/audio/status`
获取音频设备状态（当前听众列表）。

### 4. 磁盘调度

#### `POST /api/io/disk/request`
提交磁盘读写请求。参数：`{pid, track, type: "READ"|"WRITE"}`。请求进入磁盘 I/O 队列等待调度。

#### `POST /api/io/disk/schedule`
步进磁盘调度：处理下一个磁盘请求，返回被处理的请求信息（pid、track、type）。前端定时调用实现动画效果。

#### `POST /api/io/disk/algorithm/{algorithm}`
切换磁盘调度算法。支持的算法：FCFS、SSTF、SCAN、C-SCAN、LOOK、C-LOOK。

#### `GET /api/io/disk/status`
获取磁盘调度器完整状态（当前磁道位置、请求队列、算法等）。

### 5. 综合状态

#### `GET /api/io/status`
返回所有 I/O 设备的完整状态（独占设备 + 共享设备 + 磁盘调度）。

---

## 调用关系

```
IoController
    │
    ├── IoManager.requestExclusiveDevice() / releaseExclusiveDevice()
    ├── IoManager.audioPlay() / audioStop()
    ├── IoManager.submitDiskRequest() / diskScheduleStep() / setDiskAlgorithm()
    ├── IoManager.getFullStatus()
    │
    └── ProcessManager.findProcess()（用于修改 PCB 的状态）
```

---

## 特殊逻辑说明

- **PCB 状态联动**：独占设备申请失败时，Controller **直接修改 PCB 的状态**（设为 BLOCKED），这个逻辑放在 Controller 层而非 IoManager 层，因为 IoManager 只管理设备状态，不感知进程调度。
- **等待队列自动唤醒**：释放独占设备时，`IoManager.releaseExclusiveDevice()` 返回被唤醒的进程 PID，Controller 负责修改该进程的状态。
- **打印机的特定逻辑**：打印机申请/释放有专门的端点（`/print`、`/print-done`），与通用独占设备端点的逻辑基本一致，只是额外维护了 PCB 的 `occupiedDevice` 字段。
