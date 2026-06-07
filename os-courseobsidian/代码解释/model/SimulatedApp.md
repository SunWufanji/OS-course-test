# SimulatedApp.java — 桌面模拟应用定义

**包路径：** `com.processos.model.SimulatedApp`

---

## 职责

定义桌面上所有**可启动的模拟应用**。这是一个 `enum`，每个常量描述一种应用的资源需求，包括 CPU、内存、磁盘、网络、优先级和指令序列。

`SystemController` 通过 `GET /api/system/apps` 返回这个枚举的内容给前端 Launcher 展示。

---

## 所有应用定义

### 游戏类（单实例，高优先级）
```java
CSGO("CS:GO", "🎮", 25, 4096, 100, 200, true, 1, 30)
PUBG("绝地求生", "🎯", 30, 6144, 150, 300, true, 1, 35)
MINECRAFT("我的世界", "⛏️", 15, 14000, 50, 100, true, 2, 34)
```
- `true` = 单实例（只能开一个）
- `MINECRAFT` 内存需求 14000MB，接近 16GB 上限——用于演示**内存满阻塞排队**功能

### 浏览器（中等优先级）
```java
CHROME("Chrome", "🌐", 15, 2048, 50, 50, false, 3, 9)
FIREFOX("Firefox", "🦊", 12, 1536, 40, 40, false, 3, 23)
```

### 开发工具（中等优先级）
```java
VSCODE("VSCode", "💻", 10, 1024, 30, 20, false, 3, 20)
TERMINAL("终端", "⬛", 3, 128, 10, 0, false, 3, 10)
```

### 办公（低优先级）
```java
NOTEPAD("记事本", "📝", 1, 512, 1, 0, false, 4, 15)
WORD("Word", "📄", 5, 512, 20, 10, false, 4, 10)
EXCEL("Excel", "📊", 4, 384, 15, 5, false, 4, 10)
```

### 娱乐（中高优先级）
```java
MUSIC("音乐播放器", "🎵", 2, 128, 5, 0, false, 2, 5)
VIDEO("视频播放器", "🎬", 8, 512, 20, 0, false, 2, 5)
```

### 系统（低优先级背景任务）
```java
DOWNLOAD("下载工具", "⬇️", 5, 256, 500, 1000, false, 5, 5)
ANTIVIRUS("杀毒软件", "🛡️", 10, 768, 30, 50, false, 4, 7)
UPDATE("系统更新", "🔄", 8, 384, 200, 500, false, 5, 5)
```

### IPC 演示（单实例）
```java
IPC_SENDER("IPC-发送方", "📤", 8, 256, 0, 0, true, 2, 12)
IPC_RECEIVER("IPC-接收方", "📥", 6, 256, 0, 0, true, 2, 12)
```
这两个成对使用：发送方 SEND → 接收方 RECV → 接收方 SEND 回复 → 发送方 RECV 收到。

### 打印机互斥演示（单实例）
```java
PRINT_FIRST("打印-先行者", "🖨️", 6, 256, 10, 0, true, 3, 16)
PRINT_SECOND("打印-等待者", "⏳", 6, 256, 10, 0, true, 3, 14)
```
先行者先抢打印机，占用期间等待者请求会被阻塞，先行者释放后才被唤醒。

---

## 字段

```java
private final String name;              // 中文名（如"我的世界"）
private final String icon;              // 图标 emoji（如 ⛏️）
private final int cpuBaseUsage;         // CPU 基础占用率
private final int memoryRequired;       // 内存需求 (MB)
private final int diskRead;             // 磁盘读取速度
private final int networkSpeed;         // 网络速度
private final boolean singleInstance;   // 是否单实例
private final int priority;             // 优先级 1-5（1最高, 5最低）
private final int instructionCount;     // 指令数（代码段长度）
```

---

## 核心方法

### `findByName(name)` → SimulatedApp
根据名称查找应用，支持中文名和枚举名：
```java
SimulatedApp.findByName("我的世界") → MINECRAFT
SimulatedApp.findByName("MINECRAFT") → MINECRAFT
```

### `getCodeSegment()` → String[]
返回该应用的**虚拟汇编代码段**。有**特殊行为**的应用覆盖此方法：

| 应用 | 特殊指令序列 | 演示功能 |
|------|------------|---------|
| `IPC_SENDER` | SEND → RECV（阻塞）→ ... → HALT | 进程间通信 |
| `IPC_RECEIVER` | RECV → ... → SEND（唤醒发送方）→ HALT | IPC 响应 |
| `PRINT_FIRST` | P_PRINTER → IO_WRITE ×3 → V_PRINTER → HALT | 打印机互斥 |
| `PRINT_SECOND` | P_PRINTER（被阻塞）→ ... → V_PRINTER → HALT | 等待打印机 |

其他普通应用（CSGO、Chrome 等）没有覆写，默认生成 `"STEP 1/N" ... "HALT"` 的简单序列。

---

## 调用关系

```
SystemController.getAvailableApps()
    → SimulatedApp.values() → 返回所有应用信息给前端

SystemController.launchApp()
    → SimulatedApp.findByName(name)
    → app.getCodeSegment() → 设置到 PCB
    → app.isSingleInstance() → 检查是否已运行
    → app.getMemoryRequired() → 分配内存
```

---

## 特殊逻辑

- **单实例检测**：`singleInstance=true` 的应用（游戏、IPC 演示、打印机演示）只能同时运行一个，第二次启动返回已存在的 PID。
- **内存满演示**：`MINECRAFT` 设置 14000MB 需求，配合系统的 16384MB 总量和 1024MB 预留，很容易撑满内存触发等待。
- **指令计数与实际行为关联**：`instructionCount` 控制代码段长度，对于特殊应用（IPC/打印机）实际代码段由硬编码覆盖，普通应用则生成 N 条 `STEP` 指令。
