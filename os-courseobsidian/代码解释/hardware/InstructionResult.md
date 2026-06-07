# InstructionResult.java — 指令执行结果

**包路径：** `com.processos.hardware.InstructionResult`

---

## 职责

`CpuCore.executeStep()` 的**返回值类型**。告诉调用方（`ProcessManager`）当前指令执行后的状态，以便决定下一步操作——继续执行、阻塞进程、还是终止进程。

---

## 状态枚举

```java
public enum Status {
    OK,               // 正常执行 → 继续取下一条指令
    BLOCKED_IO,       // I/O 阻塞 → 进程需要等待 I/O 完成
    BLOCKED_IPC,      // IPC 阻塞 → RECV 时消息缓冲区为空，等待别的进程发消息
    BLOCKED_PRINTER,  // 打印机阻塞 → 打印机被占用，等待释放
    HALT,             // 进程终止 → 代码段执行完毕或遇到 HALT 指令
    SYSCALL           // 系统调用 → 需要内核介入处理（预留）
}
```

## 字段

```java
private final Status status;       // 执行状态
private final String instruction;  // 执行的指令原文（如 "MOV AX, 5"）
private final String semantic;     // 中文语义说明（如 "将立即数5加载到寄存器AX"）
```

---

## 辅助方法

### `isBlocked()`
```java
public boolean isBlocked() {
    return status == BLOCKED_IO || status == BLOCKED_IPC;
}
```
快速判断是否阻塞——虽然目前加上了，但实际 `BLOCKED_PRINTER` 没包含在内，使用时需注意。

---

## 数据流

```
CpuCore.executeStep(pcb)
    │
    └─→ InstructionResult
            │
            ├── Status.OK
            │   └─→ ProcessManager 继续执行下一条指令（时间片内）
            │
            ├── Status.BLOCKED_IPC / BLOCKED_PRINTER
            │   └─→ ProcessManager 将进程移出 CPU，放入 blockedQueue
            │       │  blockedReason = "等待消息" / "等待打印机"
            │       │  进程 PCB 保持当前状态，后续被唤醒时恢复
            │
            ├── Status.HALT
            │   └─→ ProcessManager 调用 completeProcess()
            │       释放内存 → 释放 CPU → 从队列移除 → 记录日志
            │
            └── Status.BLOCKED_IO / SYSCALL
                └─→ 预留，当前未使用
```

---

## 特殊逻辑

- **语义与指令分离**：`instruction` 是纯机器指令（如 `"MOV AX, 5"`），`semantic` 是对应的中文解释（如 `"将立即数5加载到AX"`）。前端可以用 `semantic` 显示人性化提示。
- **状态即控制流**：`ProcessManager` 根据 `InstructionResult.Status` 决定调度动作——这是 CPU 模拟的核心控制流机制。
