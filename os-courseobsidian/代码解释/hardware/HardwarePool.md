# HardwarePool.java — 硬件资源池

**包路径：** `com.processos.hardware.HardwarePool`
**注解：** `@Component`（Spring 单例组件）

---

## 职责

模拟整台计算机的**硬件资源**，包括 CPU、内存、I/O 设备。它是 `SystemController` 和 `ProcessManager` 获取硬件状态的入口。

**核心功能：**
- CPU 核心分配/释放 + 使用率模拟（带随机抖动）
- 内存分配/释放（首次适应算法 + 分割/合并）
- I/O 设备速度模拟（磁盘读写/网络）
- 系统状态快照（给前端 HUD 仪表盘）

---

## 数据模型

### CPU 配置（单核）
```java
private final int cpuCores = 1;           // 单核
private final double[] coreUsage;          // 每个核心的使用率 0-100
private final int[] corePid;               // 每个核心上跑的进程 PID
```

### 内存配置
```java
private final int totalMemory = 16384;     // 总内存 16 GB
private int usedMemory = 1024;             // 已用（系统预留 1GB）
private final List<MemoryBlock> memoryBlocks;  // 内存块链表
```

### I/O 速度
```java
private double diskReadSpeed;   // 磁盘读取 MB/s
private double diskWriteSpeed;  // 磁盘写入 MB/s
private double networkSpeed;    // 网络 KB/s
```

---

## 核心方法

### 内存管理

#### `allocateMemory(requiredSize, pid, processName)`
**首次适应算法（First-Fit）：**
1. 检查总量是否足够（`usedMemory + requiredSize > totalMemory`）
2. 遍历 `memoryBlocks` 链表，找第一个能容纳的**空闲块**
3. 如果块比需要的大，调用 `block.split()` 分割，剩余部分插回链表
4. 标记为已分配，增加 `usedMemory`
5. 返回 true/false

#### `freeMemory(pid)`
1. 遍历所有块，找到该 PID 占用的块
2. 逐个释放（`block.free()`）
3. 调用 `mergeFreeBlocks()` 合并相邻空闲块
4. 返回释放的总大小

#### `mergeFreeBlocks()`
合并连续的空闲块：
1. 遍历链表，检查 `current` 和 `next` 是否都空闲
2. 是则合并：`current.size += next.size`，删除 `next`
3. 回退索引重新检查（因为可能三个连续空闲块）

### CPU 管理

#### `allocateCpuCore(pid)`
找第一个 `corePid[i] == 0`（空闲核心）分配给进程，返回核心索引。单核模式下只能同时运行一个进程。

#### `freeCpuCore(coreIndex)` / `freeAllCpuCores(pid)`
释放核心：清空 PID 和使用率。

#### `updateCpuUsage()`
模拟 CPU 使用率抖动：
- 有进程 → 基础 30%-70% + 随机 ±10% 抖动，限幅 10%-100%
- 空闲 → 0%

### I/O 速度模拟

#### `updateIoUsage(activeProcessCount)`
I/O 速度与活跃进程数成正比：
- 磁盘读 = `activeCount × 5 ± 10`
- 磁盘写 = `activeCount × 2.5 ± 5`
- 网速 = `activeCount × 10 ± 25`

### 状态查询

#### `getStatus()` → `SystemStatus`
返回系统状态快照（Java 16+ Record）：
- CPU 核心数 / 总使用率 / 各核心使用率 / 各核心进程 PID
- 总内存 / 已用内存 / 内存分配列表
- 磁盘速度 / 网速

---

## 内部类

#### `SystemStatus`（Record）
```java
public record SystemStatus(
    int cpuCores,
    double totalCpuUsage,
    double[] coreUsage,
    int[] corePid,
    int totalMemory,
    int usedMemory,
    List<MemoryAllocation> memoryAllocations,
    double diskReadSpeed,
    double diskWriteSpeed,
    double networkSpeed
) {}
```

#### `MemoryAllocation`（Record）
```java
public record MemoryAllocation(
    int pid,
    String processName,
    int size,
    int startAddress
) {}
```

---

## 调用关系

```
HardwarePool  ←  SystemController / ProcessManager / ProcessManager
    │
    ├── MemoryBlock  (内存块链表)
    └── SystemStatus / MemoryAllocation  (返回给前端)
```

---

## 特殊逻辑

- **同步锁**：`allocateMemory()`、`freeMemory()`、`allocateCpuCore()` 都是 `synchronized`，防止并发访问时内存状态不一致。
- **内存分割链式维护**：`split()` 返回剩余块，由调用方插入链表位置 `i+1`，保证地址顺序。
- **合并算法的循环回溯**：合并后 `i--` 重新检查当前位置，确保 3+ 个连续空闲块能全部合并。
- **CPU 抖动模拟**：不是真实 CPU 使用率，而是为了前端 HUD 视觉效果模拟的随机值。
