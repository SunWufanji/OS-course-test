# ExclusiveDevice.java — 独占设备

**包路径：** `com.processos.hardware.ExclusiveDevice`

---

## 职责

模拟**一次只能被一个进程占用的硬件设备**，如打印机、U盘（写入时）。

**核心机制：**
- 同一时刻只能有一个进程占用设备
- 其他进程申请时自动加入 **FIFO 等待队列**
- 当前进程释放时自动唤醒队列中的下一个

---

## 字段

```java
private String name;                     // 设备名（如 "PRINTER"）
private String status;                   // "IDLE" 或 "BUSY"
private Integer occupiedByPid;           // 当前占用者的 PID（null=空闲）
private String occupiedByName;           // 当前占用者名称
private final Queue<WaitEntry> waitingQueue;  // FIFO 等待队列
```

---

## 核心方法

### `request(pid, processName)` → boolean
申请设备：
- 如果设备空闲（`IDLE`）：设为 `BUSY`，记录占用者，返回 `true`
- 如果设备忙碌（`BUSY`）：加入等待队列尾部，返回 `false`

### `release(pid)` → Integer
释放设备：
- 验证释放者的 PID 是否是当前占用者
- 如果等待队列非空：弹出队首的下一个进程，返回其 PID（供唤醒用）
- 如果队列为空：设备回到 `IDLE`，返回 `null`
- PID 不匹配时返回 `null`

---

## 内部类：`WaitEntry`

```java
public static class WaitEntry {
    public int pid;
    public String processName;
}
```
等待队列中的条目，记录等待进程的 PID 和名称。

---

## 调用关系

```
ExclusiveDevice  ←  IoManager（统一管理）
    │
    ├── request() / release()
    ├── getStatus() / getOccupiedByPid()  →  IoController → 前端
    └── WaitEntry（等待队列条目）
```

实际使用路径：
```
IoController
    → IoManager.requestExclusiveDevice("PRINTER", pid, name)
        → ExclusiveDevice.request(pid, name)
            → 成功 → PCB.occupiedDevice = "打印机"
            → 失败 → PCB.state = BLOCKED, PCB.blockedReason = "等待打印机"
```

---

## 特殊逻辑

- **FIFO 公平性**：等待队列是 `LinkedList`（Queue 接口），先到先得，不会出现"插队"。
- **释放验证**：`release(pid)` 验证 `occupiedByPid == pid`，防止其他进程误释放不属于自己的设备。
- **自动唤醒**：释放时 IoManager/Controller 拿到返回的 PID，负责将该进程的 PCB 状态改回 RUNNING——`ExclusiveDevice` 本身只记录设备状态，不感知进程调度。
