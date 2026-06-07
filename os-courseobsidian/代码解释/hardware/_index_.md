# Hardware 层 — 总览

**包路径：** `com.processos.hardware`
**共 9 个文件**

---

## 职责

模拟计算机的**硬件资源**及其管理逻辑。这个包是模拟器的"硬件层"，为上层（ProcessManager、Controller）提供 CPU 执行、内存分配、I/O 设备管理的能力。

**核心原则：** 硬件层只关心"怎么做"，不关心"为什么做"——它不包含调度策略，只提供指令执行、内存操作等基础能力。

---

## 文件一览

| 文件 | 类型 | 职责 |
|------|------|------|
| [HardwarePool](HardwarePool.md) | @Component | **硬件资源池** — CPU核心、内存、I/O速度的统一管理入口 |
| [CpuCore](CpuCore.md) | class | **CPU 核心模拟** — 寄存器、指令执行、上下文切换 |
| [MemoryBlock](MemoryBlock.md) | class | **内存块** — 连续内存空间的数据结构 |
| [MemoryManager](MemoryManager.md) | @Component | **物理内存管理器** — 独立的内存管理实现（当前未使用） |
| [InstructionResult](InstructionResult.md) | class | **指令执行结果** — CpuCore 的返回值类型 |
| [ExclusiveDevice](ExclusiveDevice.md) | class | **独占设备** — 打印机/U盘，一次一个进程使用 |
| [DiskRequest](DiskRequest.md) | class | **磁盘请求** — I/O 请求的数据结构 |
| [IoManager](IoManager.md) | @Component | **I/O 设备管理器** — 统一管理独占/共享设备、磁盘调度 |
| [CodeSegmentGenerator](CodeSegmentGenerator.md) | class | **代码段生成器** — 为进程随机生成汇编指令序列 |

---

## 架构关系

```
                    HardwarePool  ← 系统资源的统一入口
                   /    |     \
                  /     |      \
           MemoryBlock  |   updateCpuUsage()
           (内存块链表) |   updateIoUsage()
                        |
                    CpuCore  ← CPU 模拟核心
                        |
                 InstructionResult
                        |
         ┌──────────────┼──────────────┐
     P_PRINTER        SEND/RECV       HALT
         │               │              │
    ExclusiveDevice   IpcCallback   终止进程
      (打印机互斥)    (进程间通信)
         │
    IoManager  ← I/O 设备统一管理
         │
    DiskRequest (磁盘调度)
```

---

## 两种内存管理

这个包中存在**两个并行的内存管理实现**：

| 实现 | 所在类 | 总量 | 是否被使用 |
|------|--------|------|-----------|
| 内存块链表 + 首次适应 | `HardwarePool` + `MemoryBlock` | 16 GB | **是** — 沙盒模式实际使用 |
| 空闲分区链 + 首次适应 | `MemoryManager` | 16 MB | **否** — 独立实现，当前未使用 |

`MemoryManager` 是一个独立的内存管理实现，与 `HardwarePool` 互不关联。它可能为后续扩展准备，或者作为算法参考实现。

---

## CPU 模拟的完整流程

```
ProcessManager.tick()
    │
    ├── 选择就绪队列中的下一个进程
    ├── CpuCore.restoreContext(pcb)       ← 加载该进程的寄存器状态
    ├── CpuCore.executeStep(pcb)          ← 执行一条指令
    │       │
    │       ├── MOV/ADD/SUB → 更新寄存器
    │       ├── SEND → 回调 IpcCallback.sendMessage()
    │       ├── P_PRINTER → 回调 IpcCallback.requestPrinter()
    │       ├── RECV（空缓冲）→ BLOCKED_IPC
    │       └── HALT → 进程终止
    │
    ├── 根据 InstructionResult.Status 判断：
    │       ├── OK → 时间片内继续执行
    │       ├── BLOCKED_xxx → 移入阻塞队列
    │       └── HALT → 调用 completeProcess()
    │
    └── CpuCore.saveContext(pcb)          ← 保存寄存器状态
```

---

## I/O 设备管理架构

```
IoManager
    │
    ├── 独占设备: Map<String, ExclusiveDevice>
    │       ├── "PRINTER" → ExclusiveDevice（状态 + FIFO 等待队列）
    │       └── "USB_DISK" → ExclusiveDevice
    │
    ├── 共享设备: List<Integer> activeAudioPids
    │       └── 可同时播放音频的进程 PID 列表
    │
    └── 磁盘调度: List<DiskRequest> + currentDiskAlgorithm
            ├── FCFS — 先来先服务
            ├── SSTF — 最短寻道时间
            ├── SCAN — 电梯算法
            └── CSCAN — 循环扫描
```
