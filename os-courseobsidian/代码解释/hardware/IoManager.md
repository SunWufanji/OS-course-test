# IoManager.java — I/O 设备管理器

**包路径：** `com.processos.hardware.IoManager`
**注解：** `@Component`（Spring 单例组件）

---

## 职责

**统一管理所有 I/O 设备**，是 `IoController` 的直接调用目标。管理三类设备：

| 设备类型 | 示例 | 机制 |
|---------|------|------|
| **独占设备** | 打印机、U盘 | 一次一个进程，FIFO 等待队列 |
| **共享设备** | 音频（耳机） | 多个进程可同时使用 |
| **磁盘调度** | 硬盘 | 请求队列 + 磁头移动 + 调度算法 |

---

## 数据结构

### 独占设备
```java
private final Map<String, ExclusiveDevice> exclusiveDevices;
// key = "PRINTER" / "USB_DISK"
// value = ExclusiveDevice 实例
```
初始化时自动创建打印机和 USB 两个独占设备。

### 共享设备（音频）
```java
private final List<Integer> activeAudioPids;
// 当前正在使用耳机的进程 PID 列表
```
共享设备不设限制，任何进程都可以播放音频，多个同时播放。

### 磁盘调度
```java
private int currentHeadPosition;         // 磁头当前位置（初始 100）
private final List<DiskRequest> diskIoQueue;  // 磁盘请求队列
private String currentDiskAlgorithm;     // 当前算法（默认 SSTF）
private final List<String> diskLog;      // 操作日志（保留最近 10 条）
private int totalSeekLength;              // 总寻道长度
```

---

## 核心方法

### 独占设备 API

| 方法 | 说明 |
|------|------|
| `requestExclusiveDevice(name, pid, name)` | 申请设备 → 委托 `ExclusiveDevice.request()` |
| `releaseExclusiveDevice(name, pid)` | 释放设备 → 委托 `ExclusiveDevice.release()`，返回被唤醒 PID |
| `getExclusiveDeviceStatus(name)` | 单设备状态（占用者 + 等待队列） |
| `getAllExclusiveDeviceStatus()` | 所有独占设备状态 |

### 共享设备 API

| 方法 | 说明 |
|------|------|
| `audioPlay(pid, name)` | 开始播放 → 加入 `activeAudioPids` |
| `audioStop(pid)` | 停止播放 → 从 `activeAudioPids` 移除 |
| `getAudioStatus()` | 返回活跃 PID 列表和数量 |

### 磁盘调度 API

| 方法 | 说明 |
|------|------|
| `submitDiskRequest(pid, track, type)` | 提交请求 → 加入队列 |
| `setDiskAlgorithm(algorithm)` | 切换调度算法 |
| `diskScheduleStep()` | **步进执行**：选择一个请求处理，移动磁头，记录日志 |
| `getFullStatus()` | 完整状态（含磁头位置、队列大小、最近日志） |

---

## 磁盘调度算法实现

### `selectSSTF()` — 最短寻道时间优先
遍历请求队列，找离当前磁头位置**最近**的磁道。每次选最近的那个，可能产生"饥饿"问题。

### `selectSCAN(forward)` — 电梯算法
1. 按磁道号排序
2. 先沿当前方向（forward=true → 向磁道号增大的方向）走，处理沿途请求
3. 走到头后反向（从大到小）处理
4. **简化实现**：每次 `selectSCAN(true)` 都先向前，没有在两次调用间保持方向状态

### `selectCSCAN()` — 循环扫描
1. 按磁道号排序
2. 只向磁道号增大方向处理
3. 走到头后**跳回 0** 再继续增大
4. 比 SCAN 更公平（不会饿死某个方向的请求）

### FCFS — 先来先服务
按请求到达顺序依次处理，不排序。

---

## 状态输出

### `getFullStatus()`
```json
{
  "exclusiveDevices": {
    "PRINTER": { "name": "PRINTER", "status": "BUSY", "occupiedByPid": 1,
                 "occupiedByName": "打印-先行者", "waitingQueue": [...] },
    "USB_DISK": { "name": "USB_DISK", "status": "IDLE", ... }
  },
  "audio": { "activePids": [3], "count": 1 },
  "diskHead": 85,
  "diskAlgorithm": "SSTF",
  "diskQueue": 3,
  "diskLog": ["磁头移动: 100 → 85 (寻道长度=15, 请求Track=85)"],
  "totalSeekLength": 45
}
```

---

## 调用关系

```
IoController
    │
    └── IoManager
            │
            ├── Map<String, ExclusiveDevice>  ← 独占设备
            │       ├── "PRINTER"
            │       └── "USB_DISK"
            │
            ├── List<Integer> activeAudioPids  ← 共享设备
            │
            └── List<DiskRequest> diskIoQueue  ← 磁盘调度
                    ├── selectSSTF()
                    ├── selectSCAN()
                    ├── selectCSCAN()
                    └── FCFS（默认）
```

---

## 特殊逻辑

- **SCAN 算法的简化**：真实的 SCAN 需要跨调用保持方向状态（当前是上升还是下降），当前实现每次调用 `selectSCAN(true)` 都从头向前，等效于每次都从最小往最大方向处理。这不是完整的电梯算法，但演示效果足够。
- **日志截断**：`getFullStatus()` 只保留最近 10 条日志，防止日志无限增长。
- **磁头位置管理**：每个 `diskScheduleStep()` 处理后更新 `currentHeadPosition`，CSCAN 到头后 `currentHeadPosition = 0`。
