package com.processos.hardware;

/**
 * 指令执行结果
 * CpuCore.executeStep() 的返回值，告知调用方指令执行后的状态
 */
public class InstructionResult {

    public enum Status {
        OK,              // 正常执行，继续下一条
        BLOCKED_IO,      // 阻塞在I/O操作
        BLOCKED_IPC,     // 阻塞在IPC操作（RECEIVE无消息）
        BLOCKED_PRINTER, // 阻塞在打印机等待
        HALT,            // 进程结束（执行到代码段末尾或HALT指令）
        SYSCALL          // 系统调用（需要内核介入）
    }

    private final Status status;
    private final String instruction;   // 执行的指令文本
    private final String semantic;      // 中文语义描述

    public InstructionResult(Status status, String instruction, String semantic) {
        this.status = status;
        this.instruction = instruction;
        this.semantic = semantic;
    }

    public Status getStatus() { return status; }
    public String getInstruction() { return instruction; }
    public String getSemantic() { return semantic; }

    public boolean isBlocked() {
        return status == Status.BLOCKED_IO || status == Status.BLOCKED_IPC;
    }
}
