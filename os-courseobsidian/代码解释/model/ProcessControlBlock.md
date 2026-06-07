# ProcessControlBlock.java — 进程控制块（PCB）

**包路径：** `com.processos.model.ProcessControlBlock`

---

## 职责

**操作系统中最重要的数据结构。** 每个进程对应一个 PCB，记录进程的所有信息——调度状态、CPU 寄存器上下文、内存分配、IPC 状态、资源占用等。

这个 PCB 是**内存中的数据结构**（非 JPA 实体），不持久化到数据库。

---

## 字段分组

### 1. 基本调度信息
```java
private int pid;               // 进程唯一标识
private String name;           // 进程名
private ProcessState state;    // 当前状态（CREATED/READY/RUNNING/BLOCKED/TERMINATED）
private int priority;          // 优先级（1最高，5最低）
private int arrivalTime;       // 到达时间
private int burstTime;         // 总执行时间（CPU 需求）
private int remainingTime;     // 剩余执行时间
private int waitingTime;       // 累计等待时间（用于统计 + 老化机制）
private int turnaroundTime;    // 周转时间
private int completionTime;    // 完成时间
private int startTime;         // 首次运行时间
private String color;          // 显示颜色（甘特图用）
private int parentPid;         // 父进程PID（-1=无父进程，用于进程树）
```

### 2. CPU 上下文（上下文切换的关键）
```java
private int programCounter;    // 程序计数器 → 当前执行到第几条指令
private int savedAx;           // 通用寄存器 A（累加器）
private int savedBx;           // 通用寄存器 B（基址）
private int savedCx;           // 通用寄存器 C（计数）
private int savedDx;           // 通用寄存器 D（数据）
```
这些值由 `CpuCore.saveContext()` 写入、`CpuCore.restoreContext()` 恢复。

派生值：`getIr()` → `programCounter - 1`（指令寄存器，即正在执行的那条指令）。

### 3. 代码段
```java
private String[] codeSegment;    // 汇编指令数组（进程要执行的代码）
private String currentCodeLine;  // 当前正在执行的那条指令原文
```
用于前端代码段可视化——高亮当前行 + 显示寄存器值。

### 4. 内存管理
```java
private int memoryBase;     // 内存基地址（HardwarePool 中的起始位置）
private int memoryLimit;    // 内存上限
```
记录进程在物理内存中的位置。

### 5. 调度统计
```java
private int contextSwitchCount;  // 被切换出 CPU 的次数
private int totalCpuTimeUsed;    // 累计使用的 CPU 时间
```

### 6. IPC（进程间通信）
```java
private List<String> messageBuffer;   // 消息缓冲区（FIFO 队列）
private int messageBufferSize;        // 容量（默认5条）
private boolean waitingForMessage;    // 是否正在等待消息
```
`CpuCore` 执行 RECV 指令时检查此值：
- `messageBuffer` 非空 → 消费第一条，继续执行
- 空且 `waitingForMessage=true` → 返回 `BLOCKED_IPC`

### 7. 沙盒模式字段（桌面模拟器专用）
```java
private String appType;          // 对应 SimulatedApp 枚举名
private String icon;             // 显示图标（如 ⛏️🎮🌐）
private double baseCpuUsage;     // CPU 基础占用率
private double cpuUsage;         // 当前 CPU 占用率（实时抖动）
private int memoryUsage;         // 内存需求（MB）
private int currentMemoryUsage;  // 当前已分配内存（MB）
private int diskRead;            // 磁盘读取速度
private int diskWrite;           // 磁盘写入速度
private int networkSpeed;        // 网络速度
private int coreIndex;           // 分配的 CPU 核心索引（-1=未分配）
private String blockedReason;    // 阻塞原因文本
private String occupiedDevice;   // 占用的设备名（如"打印机"）
```

---

## 核心方法

### `resetContext()`
重置 CPU 执行上下文——进程刚创建或被重新调度时调用：
- 清空所有寄存器值
- PC 归零（从第一条指令开始）
- 清空消息缓冲区
- 重置上下文切换计数

### `getIr()`（派生值）
```java
public int getIr() { return Math.max(0, programCounter - 1); }
```
指令寄存器 IR = PC - 1。因为 PC 已经指向下一条指令，当前正在执行的指令编号就是 PC-1。

---

## PCB 生命周期

```
launchApp()  →  构造 PCB（CREATED）
                    │
                    ↓
               设置 appType/icon/memoryUsage
               设置 codeSegment
               分配 PID、coreIndex
               调用 resetContext()
                    │
                    ↓
               加入就绪队列 → state = READY
                    │
                    ↓
               被调度上 CPU → restoreContext() → state = RUNNING
                    │
                    ↓
               时间片到/被抢占 → saveContext() → state = READY
               或 I/O 阻塞 → saveContext() → state = BLOCKED
                    │
                    ↓
               HALT/被 kill → state = TERMINATED
```

---

## 调用关系

```
ProcessManager — 创建/销毁 PCB
    │
    ├── CpuCore.saveContext(pcb)    ← 写入 savedAx/savedBx/...
    ├── CpuCore.restoreContext(pcb) ← 读出 programCounter/寄存器
    └── HardwarePool.allocateMemory() ← 设置 memoryBase/memoryLimit

SystemController → 返回 PCB 给前端（JSON 序列化）
```

---

## 特殊逻辑

- **PCB 不在数据库**：与常规 OS 课设不同，这个 PCB 是纯内存对象。只有执行统计（`ExecutionLog`）和性能指标（`PerformanceMetrics`）会持久化到 MySQL。
- **沙盒字段 vs 调度字段**：`memoryUsage`（需求）和 `currentMemoryUsage`（实际分配）分开，支持内存不足时 `memoryUsage > currentMemoryUsage` 的等待状态。
- **派生值 getIr()**：避免在 PCB 中额外存储 IR 字段，由 PC 计算得出——体现了数据结构设计的简洁性。
