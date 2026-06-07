# CodeSegmentGenerator.java — 代码段生成器

**包路径：** `com.processos.hardware.CodeSegmentGenerator`

---

## 职责

为进程生成**模拟汇编指令序列**（代码段）。当进程没有指定特殊指令序列时（如 CSGO、Chrome 等普通应用），由这个生成器自动产生随机的指令序列。

**注意：** 有特殊指令序列的应用（如 IPC_SENDER/RECEIVER、PRINT_FIRST/SECOND）直接在 `SimulatedApp.getCodeSegment()` 中定义，不使用这个生成器。

---

## 指令模板库

### 常规指令（22 种模板）

```java
// 数据传送
"MOV AX, %d"     → "将立即数 %d 加载到寄存器AX"
"MOV BX, %d"
// 算术运算
"ADD AX, BX"     → "AX = AX + BX，结果存入AX"
"SUB AX, %d"     → "AX = AX - %d"
"MUL AX, BX"     → "AX = AX × BX"
// 比较和跳转
"CMP AX, %d"     → "比较AX与%d，设置标志位"
"JMP %d"         → "无条件跳转到指令%d"
"JNZ %d"         → "若AX≠0则跳转到指令%d"
// 栈操作
"PUSH AX"        → "将AX压入栈"
"POP BX"         → "从栈弹出值到BX"
// I/O
"IO_READ"        → "执行I/O读取操作，从磁盘读数据"
"IO_WRITE"       → "执行I/O写入操作，向磁盘写数据"
// 进程控制
"HALT"           → "进程终止执行"
// 其他
"PRINT AX"       → "输出AX的值"
"CALL func_%d"   → "调用子程序func_%d"
"RET"            → "从子程序返回"
"NOP"            → "空操作，CPU空转一个周期"
```

### IPC 专用指令（低概率出现，5%）
```java
"SEND %d, msg_data"    → "向进程 %d 发送消息"
"RECEIVE %d"           → "等待接收来自进程 %d 的消息"
```

---

## 核心方法

### `generateCodeSegment(processName, burstTime)` → String[]
生成代码段：

1. 代码长度 = `burstTime × (2 ~ 4)` 条指令（随机）
2. 逐条生成：
   - **最后一条** → 强制为 `HALT`
   - **10% 概率**（非首尾位置）→ 生成 IPC 指令
   - **90% 概率** → 从 22 种常规指令中随机选
3. 每条指令格式：`"MOV AX, 5  ; 将立即数5加载到寄存器AX"`

### `getPureInstruction(rawInstruction)` → String
提取纯指令部分（去掉 `;` 后的注释）：
```
输入: "MOV AX, 5  ; 将立即数5加载到寄存器AX"
输出: "MOV AX, 5"
```

### `getSemantic(rawInstruction)` → String
提取中文语义注释：
```
输入: "MOV AX, 5  ; 将立即数5加载到寄存器AX"
输出: "将立即数5加载到寄存器AX"
```

---

## 调用关系

```
ProcessManager.launchApp(app)
    │
    └── 创建 PCB
            │
            └── pcb.setCodeSegment(
                    app.getCodeSegment()          ← 特殊应用（IPC/打印机）
                        ??                        ┐
                    CodeSegmentGenerator          ├ 普通应用随机生成
                        .generateCodeSegment()    ┘
                )
```

---

## 特殊逻辑

- **指令模板的 switch 增强**（Java 14+）：代码中使用 `case "MOV AX, %d", "MOV BX, %d", ...` 的多模式匹配语法。
- **随机参数**：MOV/SUB/CMP 的立即数参数在 0-99 之间随机，JMP/JNZ 的目标指令号在 0-instructionCount 之间随机。
- **HALT 保证**：代码段最后一条始终是 HALT，确保进程总能正常终止。
- **IPC 指令低概率出现**：约 5%-10% 生成 SEND/RECEIVE，模拟进程间通信的场景，但又不让普通进程过于复杂。
