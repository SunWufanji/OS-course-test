# CpuCore.java — CPU 核心模拟

**包路径：** `com.processos.hardware.CpuCore`

---

## 职责

模拟 **CPU 核心的指令执行**。同一时刻只能执行一个进程（单核），支持：
- 物理寄存器（PC/AX/BX/CX/DX/IR）
- 上下文切换（保存/恢复寄存器状态）
- 模拟指令执行（MOV/ADD/SUB/MUL/CMP/JMP...）
- IPC 和打印机指令的回调（`IpcCallback` 接口）
- 指令执行结果分类（OK/BLOCKED/HALT）

---

## 物理寄存器

```java
private int cpuPC;          // 程序计数器（指向下一条指令）
private int cpuIR;          // 指令寄存器（当前执行的指令编号）
private int cpuAx;          // 通用寄存器 A（累加器）
private int cpuBx;          // 通用寄存器 B（基址）
private int cpuCx;          // 通用寄存器 C（计数）
private int cpuDx;          // 通用寄存器 D（数据）
private boolean kernelMode; // true=内核态, false=用户态
private int currentPid;     // 当前运行进程 PID（-1=空闲）
```

---

## 核心方法

### 上下文切换

#### `restoreContext(PCB pcb)`
**恢复现场**：进程被调度到 CPU 上运行时调用。把 PCB 中保存的寄存器值（上次暂停时的值）写回 CPU 物理寄存器。

```java
cpuPC = pcb.getProgramCounter();  // 从上次执行位置继续
cpuAx = pcb.getSavedAx();         // 恢复各寄存器
kernelMode = false;               // 切换到用户态
```

#### `saveContext(PCB pcb)`
**保存现场**：进程被切换出 CPU 时调用。把 CPU 当前寄存器值保存到 PCB 中。

```java
pcb.setProgramCounter(cpuPC);     // 记下执行到哪了
pcb.setSavedAx(cpuAx);            // 保存各寄存器值
kernelMode = true;                // 切回内核态
```

### 指令执行

#### `executeStep(PCB pcb)` → `InstructionResult`
执行当前 PC 指向的一条指令：

1. 检查代码段是否结束（`pc >= code.length`）→ 返回 `HALT`
2. 读取指令文本，分离纯指令部分和 `;` 后的中文注释
3. PC 指向下一条
4. 调用 `simulateInstruction()` 模拟执行
5. 更新 IR 寄存器
6. 返回 `InstructionResult`

### 指令模拟

#### `simulateInstruction(instruction, semantic, pcb)`
一条大的 `if-else` 链，按指令前缀分发：

| 指令 | 模拟操作 | 返回状态 |
|------|---------|---------|
| `MOV AX, N` | `cpuAx = N` | OK |
| `ADD AX, BX` | `cpuAx += cpuBx` | OK |
| `SUB AX, N` | `cpuAx -= N` | OK |
| `MUL AX, BX` | `cpuAx *= cpuBx` | OK |
| `CMP` | 仅记录（不设置标志位） | OK |
| `JMP`/`JNZ` | 简化模拟，不实际跳转 | OK |
| `PUSH`/`POP` | 简化模拟 | OK |
| `PRINT` | 模拟输出 | OK |
| `IO_READ`/`IO_WRITE` | 模拟 I/O | OK |
| **`P_PRINTER`** | 回调 → 申请打印机 | OK 或 **BLOCKED_PRINTER** |
| **`V_PRINTER`** | 回调 → 释放打印机 | OK |
| **`SEND target`** | 回调 → 发消息 | OK |
| **`RECV`** | 检查 messageBuffer | OK 或 **BLOCKED_IPC** |
| `HALT` | 终止 | **HALT** |
| 其他 | 视为 NOP | OK |

---

## IpcCallback 接口

```java
public interface IpcCallback {
    boolean sendMessage(int fromPid, String targetAppType, String message);
    boolean requestPrinter(int pid, String processName);
    void releasePrinter(int pid);
}
```

由 `ProcessManager` 在初始化时通过 `setIpcCallback()` 注入。这样 `CpuCore` 在执行 SEND/P_PRINTER/V_PRINTER 指令时能回调到进程管理层，实现：
- SEND → 找到目标进程 → 放入消息缓冲区 → 唤醒等待者
- P_PRINTER → 申请打印机 → 被占则阻塞
- V_PRINTER → 释放打印机 → 唤醒等待者

---

## 寄存器快照

#### `getRegisterSnapshot()` → `Map`
```json
{
  "pc": 0, "ax": 100, "bx": 200, "cx": 0, "dx": 0,
  "ir": 0, "kernelMode": false, "currentPid": 1
}
```
由 `SystemController` 通过 `GET /api/system/registers` 暴露给前端，用于代码段执行可视化（当前高亮行 + 寄存器值显示）。

---

## 特殊逻辑

- **PC 在指令之前同步**：`executeStep` 中先 `cpuPC = pc + 1`，再调用 `simulateInstruction`。防止 `saveContext` 时覆盖 PCB 的 PC（因为 `saveContext` 用 `pcb.setProgramCounter(cpuPC)`）。
- **跳转指令简化**：JMP/JNZ 不实际跳转（真实操作系统需要考虑），避免死循环。
- **指令格式**：支持 `"MOV AX, 5  ; 将立即数5加载到AX"` 这种格式——`;` 前是纯指令，`;` 后是中文语义注释。
