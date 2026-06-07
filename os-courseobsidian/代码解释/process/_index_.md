# Process 层 — 总览

**包路径：** `com.processos.process`
**共 1 个文件**

---

## 职责

沙盒模式的**进程调度核心**。这个包只有一个类——`ProcessManager`，但它承担了整个操作系统的调度模拟：

- MLFQ 三级队列调度
- 进程生命周期管理（创建/调度/执行/阻塞/终止）
- CPU 上下文切换（委托 CpuCore）
- 内存分配释放（委托 HardwarePool）
- I/O 设备管理（委托 IoManager）
- IPC 通信回调
- 老化机制
- 高优先级抢占
- 内存满阻塞排队

---

## 文件

| 文件 | 类型 | 行数 | 职责 |
|------|------|------|------|
| [ProcessManager](ProcessManager.md) | @Component | **~660** | ⭐ 进程管理器 + MLFQ 调度器 |

---

## ProcessManager 定位

```
React 前端
    │
    │  HTTP API (SystemController)
    ▼
ProcessManager  ←── 沙盒调度核心
    │
    ├── CpuCore        — 指令执行
    ├── HardwarePool   — CPU核心 + 内存
    ├── IoManager      — 打印机/USB/磁盘
    └── SystemEventService — 日志
```

---

## 数据流总览

```
launchApp(app)             创建 PCB → 分配内存 → 入队列
    │
tick()  (每 500ms 调用)
    │
    ├── checkAging()        老化升级（每 tick 检查）
    ├── scheduleNext()      选最高优先级队列的队首
    ├── executeStep()       执行一条指令
    │   ├── OK              → 继续（下个 tick）
    │   ├── HALT            → completeProcess()
    │   ├── BLOCKED_IPC     → blockProcess()
    │   ├── BLOCKED_PRINTER → blockProcess()
    │   └── TIMEOUT         → 降级 + scheduleNext()
    │
killProcess(pid)           释放全部资源
suspendProcess(pid)        手动阻塞
resumeProcess(pid)         恢复到 Q2
```
