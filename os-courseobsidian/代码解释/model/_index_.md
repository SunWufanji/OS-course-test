# Model 层 — 总览

**包路径：** `com.processos.model`
**共 8 个文件**

---

## 职责

定义项目中所有的**数据模型**，包括：
- **运行时数据结构**：PCB、ProcessState、SimulatedApp、IpcMessage（纯内存，不持久化）
- **JPA 实体**：ExecutionLog、PerformanceMetrics、ScenarioConfig、SystemEvent（映射 MySQL 表）

---

## 文件一览

| 文件                                            | 类型      | 用途                                                | 是否 JPA |
| --------------------------------------------- | ------- | ------------------------------------------------- | ------ |
| [ProcessControlBlock](ProcessControlBlock.md) | class   | ⭐ **PCB — 最核心的数据结构**，记录进程所有信息                     | ❌      |
| [SimulatedApp](SimulatedApp.md)               | enum    | 桌面可启动应用的资源定义（含特殊指令序列）                             | ❌      |
| [ProcessState](ProcessState.md)               | enum    | 进程 5 种状态：CREATED/READY/RUNNING/BLOCKED/TERMINATED | ❌      |
| [IpcMessage（没用到）](IpcMessage（没用到）.md)                   | class   | IPC 消息数据结构（发送方/接收方/内容/时间戳）                        | ❌      |
| [ExecutionLog](ExecutionLog.md)               | @Entity | 每个进程的执行轨迹（时间点、周转时间等）                              | ✅      |
| [PerformanceMetrics](PerformanceMetrics.md)   | @Entity | 每次模拟的聚合统计（平均周转、吞吐量、CPU利用率）                        | ✅      |
| [ScenarioConfig](ScenarioConfig.md)           | @Entity | 预设实验场景（轻载/中载/重载等，JSON 配置）                         | ✅      |
| [SystemEvent](SystemEvent.md)                 | @Entity | 系统事件日志（4级日志，类似 Windows Event Viewer）              | ✅      |

---

## 两类模型的分工

### 运行时模型（纯内存）

```
ProcessControlBlock ←── SimulatedApp（应用定义）
    │                      │
    │                      └── getCodeSegment() → 指令序列
    │                      └── getMemoryRequired() → 内存需求
    │
    ├── ProcessState（当前状态）
    ├── savedAx/Bx/Cx/Dx（CPU上下文）
    ├── programCounter（指令位置）
    ├── codeSegment（整个代码段）
    ├── messageBuffer（IPC消息）
    ├── blockedReason（阻塞原因）
    └── occupiedDevice（占用设备）
```

### 持久化模型（MySQL JPA）

```
                每条模拟运行
                    │
          ┌─────────┴─────────┐
          │                   │
    ExecutionLog × N    PerformanceMetrics × 1
    （每个进程一条）     （本次运行一条）
          │                   │
          └─────────┬─────────┘
                    │
              ScenarioConfig
              （预设场景，CRUD）
                    │
              SystemEvent
              （持续写入的事件日志）
```

---

## 关键关系图

```
SimulatedApp  ←── 枚举所有可启动应用
    │
    │  launchApp() 时根据定义创建
    ▼
ProcessControlBlock (PCB)  ←── 模拟器的核心数据结构
    │
    ├── ProcessState         — 状态枚举
    ├── IpcMessage           — IPC 消息结构（预留）
    │
    │  模拟结束后持久化到 MySQL：
    ├── ExecutionLog         — 每个进程的执行轨迹
    └── PerformanceMetrics   — 本次运行的聚合指标

ScenarioConfig  — 在算法实验室中加载预设场景
SystemEvent     — 系统各处写入的日志，供前端实时查看
```

---

## 模型间依赖

```
ProcessControlBlock 依赖: ProcessState, SimulatedApp(getCodeSegment)
ExecutionLog        依赖: ProcessControlBlock（从中读取时间点）
PerformanceMetrics  依赖: ProcessControlBlock（从中计算统计值）
ScenarioConfig      独立: JSON 字符串配置
SystemEvent         独立: 各处直接写入
IpcMessage          独立: 预留的数据结构
```
