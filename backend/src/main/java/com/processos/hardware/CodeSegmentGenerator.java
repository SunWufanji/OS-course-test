package com.processos.hardware;

import java.util.Random;

/**
 * 代码段生成器 — 为进程生成模拟汇编指令序列
 * 混合模式：汇编指令 + 中文语义注释
 * 每条指令格式："MOV AX, 5  ; 将立即数5加载到寄存器AX"
 */
public class CodeSegmentGenerator {

    private static final Random random = new Random();

    /**
     * 指令模板库：{指令格式, 中文语义模板}
     * %d 占位符在生成时替换为随机数
     */
    private static final String[][] INSTRUCTION_TEMPLATES = {
        {"MOV AX, %d",  "将立即数 %d 加载到寄存器AX"},
        {"MOV BX, %d",  "将立即数 %d 加载到寄存器BX"},
        {"MOV CX, %d",  "将立即数 %d 加载到寄存器CX"},
        {"MOV DX, %d",  "将立即数 %d 加载到寄存器DX"},
        {"ADD AX, BX",  "AX = AX + BX，结果存入AX"},
        {"ADD BX, CX",  "BX = BX + CX，结果存入BX"},
        {"SUB AX, %d",  "AX = AX - %d"},
        {"SUB BX, %d",  "BX = BX - %d"},
        {"MUL AX, BX",  "AX = AX × BX，结果存入AX"},
        {"CMP AX, %d",  "比较AX与 %d，设置标志位"},
        {"CMP BX, %d",  "比较BX与 %d，设置标志位"},
        {"JMP %d",      "无条件跳转到指令 %d"},
        {"JNZ %d",      "若AX≠0则跳转到指令 %d"},
        {"PUSH AX",     "将AX压入栈"},
        {"POP BX",      "从栈弹出值到BX"},
        {"PRINT AX",    "输出AX的值到标准输出"},
        {"IO_READ",     "执行I/O读取操作，从磁盘读数据"},
        {"IO_WRITE",    "执行I/O写入操作，向磁盘写数据"},
        {"CALL func_%d","调用子程序func_%d"},
        {"RET",         "从子程序返回"},
        {"NOP",         "空操作，CPU空转一个周期"},
        {"HALT",        "进程终止执行"},
    };

    // SEND/RECEIVE 指令（IPC专用，概率较低）
    private static final String[][] IPC_TEMPLATES = {
        {"SEND %d, msg_data", "向进程 %d 发送消息"},
        {"RECEIVE %d",        "等待接收来自进程 %d 的消息"},
    };

    /**
     * 根据进程名和burstTime生成代码段
     * 代码长度 = burstTime × (2~4) 条指令
     * @param processName 进程名称
     * @param burstTime CPU时间片总量
     * @return 汇编指令数组（含中文注释）
     */
    public static String[] generateCodeSegment(String processName, int burstTime) {
        int instructionCount = burstTime * (2 + random.nextInt(3)); // 2x ~ 4x
        String[] code = new String[instructionCount];

        for (int i = 0; i < instructionCount; i++) {
            // 最后一条指令如果是最后1/4段，有一定概率生成HALT
            if (i == instructionCount - 1) {
                code[i] = "HALT  ; 进程 " + processName + " 执行完毕";
                continue;
            }

            // 10% 概率生成IPC指令（在非首尾位置）
            if (i > 2 && i < instructionCount - 2 && random.nextInt(10) == 0) {
                String[] tpl = IPC_TEMPLATES[random.nextInt(IPC_TEMPLATES.length)];
                int targetPid = 1 + random.nextInt(5); // 假设目标PID 1-5
                code[i] = String.format(tpl[0], targetPid) + "  ; " + String.format(tpl[1], targetPid);
                continue;
            }

            // 常规指令
            int templateIdx = random.nextInt(INSTRUCTION_TEMPLATES.length);
            String format = INSTRUCTION_TEMPLATES[templateIdx][0];
            String semantic = INSTRUCTION_TEMPLATES[templateIdx][1];

            String instruction;
            switch (format) {
                case "MOV AX, %d", "MOV BX, %d", "MOV CX, %d", "MOV DX, %d",
                     "SUB AX, %d", "SUB BX, %d",
                     "CMP AX, %d", "CMP BX, %d" -> {
                    int val = random.nextInt(100);
                    instruction = String.format(format, val) + "  ; " + String.format(semantic, val);
                }
                case "JMP %d", "JNZ %d" -> {
                    int target = random.nextInt(instructionCount);
                    instruction = String.format(format, target) + "  ; " + String.format(semantic, target);
                }
                case "CALL func_%d" -> {
                    int funcId = random.nextInt(5);
                    instruction = String.format(format, funcId) + "  ; " + String.format(semantic, funcId);
                }
                default -> instruction = format + "  ; " + semantic;
            }
            code[i] = instruction;
        }
        return code;
    }

    /**
     * 获取指令的纯指令部分（去掉注释）
     */
    public static String getPureInstruction(String rawInstruction) {
        if (rawInstruction == null) return "";
        return rawInstruction.contains(";")
                ? rawInstruction.substring(0, rawInstruction.indexOf(";")).trim()
                : rawInstruction.trim();
    }

    /**
     * 获取指令的中文语义注释
     */
    public static String getSemantic(String rawInstruction) {
        if (rawInstruction == null) return "";
        return rawInstruction.contains(";")
                ? rawInstruction.substring(rawInstruction.indexOf(";") + 1).trim()
                : "";
    }
}
