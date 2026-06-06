package com.processos.hardware;

import com.processos.model.ProcessControlBlock;

import java.util.HashMap;
import java.util.Map;

/**
 * CPU 核心模拟 — 单核特权模型
 * 同一时刻只能执行一个进程
 * 支持上下文切换、指令执行、寄存器操作
 */
public class CpuCore {

    // 物理寄存器
    private int cpuPC;              // 程序计数器
    private int cpuIR;              // 指令寄存器（当前指令编号）
    private int cpuAx;              // 通用寄存器 A
    private int cpuBx;              // 通用寄存器 B
    private int cpuCx;              // 通用寄存器 C
    private int cpuDx;              // 通用寄存器 D
    private boolean kernelMode;    // true=内核态, false=用户态

    // 当前运行的进程 PID（-1=空闲）
    private int currentPid = -1;

    /**
     * 加载进程上下文到 CPU（恢复现场）
     */
    public void restoreContext(ProcessControlBlock pcb) {
        this.cpuPC = pcb.getProgramCounter();
        this.cpuAx = pcb.getSavedAx();
        this.cpuBx = pcb.getSavedBx();
        this.cpuCx = pcb.getSavedCx();
        this.cpuDx = pcb.getSavedDx();
        this.currentPid = pcb.getPid();
        this.kernelMode = false; // 切换到用户态执行进程代码
    }

    /**
     * 保存 CPU 上下文到进程（保存现场）
     */
    public void saveContext(ProcessControlBlock pcb) {
        pcb.setProgramCounter(this.cpuPC);
        pcb.setSavedAx(this.cpuAx);
        pcb.setSavedBx(this.cpuBx);
        pcb.setSavedCx(this.cpuCx);
        pcb.setSavedDx(this.cpuDx);
        this.kernelMode = true; // 进入内核态处理中断/调度
    }

    /** IPC/设备回调接口，由 ProcessManager 实现注入 */
    public interface IpcCallback {
        /** SEND 指令：向目标 appType 的进程发消息，若唤醒了对方返回 true */
        boolean sendMessage(int fromPid, String targetAppType, String message);
        /** P_PRINTER 指令：申请打印机，返回 false 表示需要阻塞 */
        boolean requestPrinter(int pid, String processName);
        /** V_PRINTER 指令：释放打印机 */
        void releasePrinter(int pid);
    }

    private IpcCallback ipcCallback;

    public void setIpcCallback(IpcCallback cb) { this.ipcCallback = cb; }

    /**
     * 执行一条指令
     * @return 指令执行结果，包含状态、指令文本和语义描述
     */
    public InstructionResult executeStep(ProcessControlBlock pcb) {
        int pc = pcb.getProgramCounter();
        String[] code = pcb.getCodeSegment();

        // 代码段为空或已执行完毕 → HALT
        if (code == null || pc >= code.length) {
            return new InstructionResult(InstructionResult.Status.HALT, "EXIT", "进程代码执行完毕");
        }

        String rawInstruction = code[pc];
        // 提取纯指令部分（去掉注释）
        String pureInstruction = rawInstruction.contains(";")
                ? rawInstruction.substring(0, rawInstruction.indexOf(";")).trim()
                : rawInstruction.trim();
        String semantic = rawInstruction.contains(";")
                ? rawInstruction.substring(rawInstruction.indexOf(";") + 1).trim()
                : "";

        // 更新PC（指向下一条指令）
        pcb.setProgramCounter(pc + 1);
        this.cpuPC = pc + 1; // 同步CPU寄存器，防止saveContext时覆盖PCB
        pcb.setCurrentCodeLine(rawInstruction);

        // 模拟指令执行
        InstructionResult result = simulateInstruction(pureInstruction, semantic, pcb);

        // 更新IR
        this.cpuIR = pc;

        return result;
    }

    /**
     * 模拟指令执行（更新寄存器和状态）
     */
    private InstructionResult simulateInstruction(String instruction, String semantic, ProcessControlBlock pcb) {
        String upper = instruction.toUpperCase();

        if (upper.startsWith("MOV")) {
            // MOV AX, n 或 MOV BX, n
            try {
                String args = instruction.substring(3).trim();
                String[] parts = args.split(",");
                String reg = parts[0].trim().toUpperCase();
                int val = Integer.parseInt(parts[1].trim());
                switch (reg) {
                    case "AX" -> cpuAx = val;
                    case "BX" -> cpuBx = val;
                    case "CX" -> cpuCx = val;
                    case "DX" -> cpuDx = val;
                }
            } catch (Exception ignored) {}
            return new InstructionResult(InstructionResult.Status.OK, instruction, semantic);

        } else if (upper.startsWith("ADD")) {
            // ADD AX, BX → AX = AX + BX
            try {
                String args = instruction.substring(3).trim();
                String[] parts = args.split(",");
                String dest = parts[0].trim().toUpperCase();
                String src = parts[1].trim().toUpperCase();
                int srcVal = getRegValue(src);
                switch (dest) {
                    case "AX" -> cpuAx += srcVal;
                    case "BX" -> cpuBx += srcVal;
                    case "CX" -> cpuCx += srcVal;
                    case "DX" -> cpuDx += srcVal;
                }
            } catch (Exception ignored) {}
            return new InstructionResult(InstructionResult.Status.OK, instruction, semantic);

        } else if (upper.startsWith("SUB")) {
            // SUB AX, n → AX = AX - n
            try {
                String args = instruction.substring(3).trim();
                String[] parts = args.split(",");
                String dest = parts[0].trim().toUpperCase();
                int val = Integer.parseInt(parts[1].trim());
                switch (dest) {
                    case "AX" -> cpuAx -= val;
                    case "BX" -> cpuBx -= val;
                    case "CX" -> cpuCx -= val;
                    case "DX" -> cpuDx -= val;
                }
            } catch (Exception ignored) {}
            return new InstructionResult(InstructionResult.Status.OK, instruction, semantic);

        } else if (upper.startsWith("MUL")) {
            // MUL AX, BX → AX = AX * BX
            try {
                String args = instruction.substring(3).trim();
                String[] parts = args.split(",");
                String dest = parts[0].trim().toUpperCase();
                String src = parts[1].trim().toUpperCase();
                int srcVal = getRegValue(src);
                switch (dest) {
                    case "AX" -> cpuAx *= srcVal;
                    case "BX" -> cpuBx *= srcVal;
                    case "CX" -> cpuCx *= srcVal;
                    case "DX" -> cpuDx *= srcVal;
                }
            } catch (Exception ignored) {}
            return new InstructionResult(InstructionResult.Status.OK, instruction, semantic);

        } else if (upper.startsWith("CMP")) {
            // CMP AX, n → 比较（仅设置标志位，这里简化为不改变寄存器）
            return new InstructionResult(InstructionResult.Status.OK, instruction, semantic);

        } else if (upper.startsWith("JMP") || upper.startsWith("JNZ")) {
            // 跳转指令 — 在简化模型中不实际跳转（避免死循环），仅记录
            return new InstructionResult(InstructionResult.Status.OK, instruction, semantic);

        } else if (upper.startsWith("PUSH")) {
            // PUSH AX → 简化模拟（不实现真实栈）
            return new InstructionResult(InstructionResult.Status.OK, instruction, semantic);

        } else if (upper.startsWith("POP")) {
            // POP BX → 简化模拟
            return new InstructionResult(InstructionResult.Status.OK, instruction, semantic);

        } else if (upper.startsWith("PRINT")) {
            // PRINT AX → 输出寄存器值
            return new InstructionResult(InstructionResult.Status.OK, instruction, semantic);

        } else if (upper.startsWith("IO_READ")) {
            // I/O读取操作
            return new InstructionResult(InstructionResult.Status.OK, instruction, semantic);

        } else if (upper.startsWith("IO_WRITE")) {
            // I/O写入操作
            return new InstructionResult(InstructionResult.Status.OK, instruction, semantic);

        } else if (upper.startsWith("P_PRINTER")) {
            if (ipcCallback != null) {
                boolean got = ipcCallback.requestPrinter(pcb.getPid(), pcb.getName());
                if (!got) {
                    return new InstructionResult(InstructionResult.Status.BLOCKED_PRINTER, instruction, "等待打印机（被占用）");
                }
            }
            return new InstructionResult(InstructionResult.Status.OK, instruction, "已获得打印机");

        } else if (upper.startsWith("V_PRINTER")) {
            if (ipcCallback != null) ipcCallback.releasePrinter(pcb.getPid());
            return new InstructionResult(InstructionResult.Status.OK, instruction, "释放打印机");

        } else if (upper.startsWith("CALL")) {
            // CALL func_n → 简化模拟（不实现真实调用栈）
            return new InstructionResult(InstructionResult.Status.OK, instruction, semantic);

        } else if (upper.equals("RET")) {
            // RET → 简化模拟
            return new InstructionResult(InstructionResult.Status.OK, instruction, semantic);

        } else if (upper.startsWith("SEND")) {
            // SEND <targetAppType> — 向目标进程发消息
            String target = instruction.length() > 4 ? instruction.substring(4).trim() : "";
            if (ipcCallback != null && !target.isEmpty()) {
                ipcCallback.sendMessage(pcb.getPid(), target, "MSG_FROM_" + pcb.getPid());
            }
            return new InstructionResult(InstructionResult.Status.OK, instruction, "发送消息给 " + target);

        } else if (upper.startsWith("RECV")) {
            // RECV — 若 messageBuffer 为空则阻塞，否则消费一条消息
            if (pcb.getMessageBuffer() == null || pcb.getMessageBuffer().isEmpty()) {
                pcb.setWaitingForMessage(true);
                return new InstructionResult(InstructionResult.Status.BLOCKED_IPC, instruction, "等待消息（缓冲区为空）");
            } else {
                String msg = pcb.getMessageBuffer().remove(0);
                pcb.setWaitingForMessage(false);
                return new InstructionResult(InstructionResult.Status.OK, instruction, "收到消息: " + msg);
            }

        } else if (upper.equals("HALT")) {
            return new InstructionResult(InstructionResult.Status.HALT, instruction, semantic);

        } else {
            // NOP 或未知指令
            return new InstructionResult(InstructionResult.Status.OK, instruction,
                    semantic.isEmpty() ? "空操作" : semantic);
        }
    }

    /**
     * 获取寄存器值
     */
    private int getRegValue(String reg) {
        return switch (reg) {
            case "AX" -> cpuAx;
            case "BX" -> cpuBx;
            case "CX" -> cpuCx;
            case "DX" -> cpuDx;
            default -> 0;
        };
    }

    /**
     * 获取CPU寄存器快照（用于前端显示）
     */
    public Map<String, Object> getRegisterSnapshot() {
        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("pc", cpuPC);
        snapshot.put("ax", cpuAx);
        snapshot.put("bx", cpuBx);
        snapshot.put("cx", cpuCx);
        snapshot.put("dx", cpuDx);
        snapshot.put("ir", cpuIR);
        snapshot.put("kernelMode", kernelMode);
        snapshot.put("currentPid", currentPid);
        return snapshot;
    }

    // Getters
    public int getCpuPC() { return cpuPC; }
    public int getCpuAx() { return cpuAx; }
    public int getCpuBx() { return cpuBx; }
    public int getCpuCx() { return cpuCx; }
    public int getCpuDx() { return cpuDx; }
    public int getCurrentPid() { return currentPid; }
    public boolean isKernelMode() { return kernelMode; }
    public boolean isIdle() { return currentPid == -1; }
}
