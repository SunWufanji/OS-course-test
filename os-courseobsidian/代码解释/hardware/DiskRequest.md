# DiskRequest.java — 磁盘 I/O 请求

**包路径：** `com.processos.hardware.DiskRequest`

---

## 职责

表示一个**磁盘 I/O 请求**，由 `IoManager` 管理，供磁盘调度算法（FCFS / SSTF / SCAN / C-SCAN）处理和选择。

---

## 字段

```java
private int pid;              // 发起请求的进程 PID
private int track;            // 目标磁道号（0-199）
private String type;          // READ / WRITE
private long arrivalTime;     // 请求到达时间（毫秒时间戳）
private boolean handled;      // 是否已被处理
```

---

## 生命周期

```
submitDiskRequest(pid, track, "READ")
    │
    └→ DiskRequest 加入 IoManager.diskIoQueue
        │
        ├── selectSSTF()      ← 按最近磁道优先排序
        ├── selectSCAN()      ← 电梯算法（正反方向）
        ├── selectCSCAN()     ← 循环扫描（单向到头后回0）
        └── FCFS              ← 按到达顺序
                │
                └→ handled = true
                     moved to diskLog
```

---

## 调用关系

```
IoController
    → IoManager.submitDiskRequest(pid, track, type)
        → new DiskRequest(...)  → 加入 diskIoQueue
    → IoManager.diskScheduleStep()
        → selectSSTF() / selectSCAN() / ...
            → DiskRequest 出队并返回
```

---

## 特殊逻辑

- **磁道范围**：`track` 取值 0-199，模拟经典磁盘的 200 个柱面。
- **到达时间**：`arrivalTime` 用 `System.currentTimeMillis()` 记录，主要用于 FCFS 排序。
- **handled 标记**：请求被磁盘调度器处理后标记为 `true`，但当前未被实际使用（处理完直接出队）。
