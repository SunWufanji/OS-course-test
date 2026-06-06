package com.processos.model;

/**
 * 模拟应用 - 定义每种桌面应用的资源需求
 */
public enum SimulatedApp {

    // 游戏类（单实例）— 优先级高，指令多（复杂程序）
    CSGO("CS:GO", "🎮", 25, 4096, 100, 200, true, 1, 30),
    PUBG("绝地求生", "🎯", 30, 6144, 150, 300, true, 1, 35),
    MINECRAFT("我的世界", "⛏️", 15, 2048, 50, 100, true, 2, 34),

    // 浏览器 — 优先级中等
    CHROME("Chrome", "🌐", 15, 2048, 50, 50, false, 3, 9),
    FIREFOX("Firefox", "🦊", 12, 1536, 40, 40, false, 3, 23),

    // 开发工具 — 优先级中等
    VSCODE("VSCode", "💻", 10, 1024, 30, 20, false, 3, 20),
    TERMINAL("终端", "⬛", 3, 128, 10, 0, false, 3, 10),

    // 办公 — 优先级低（用户可等待）
    NOTEPAD("记事本", "📝", 1, 512, 1, 0, false, 4, 15),
    WORD("Word", "📄", 5, 512, 20, 10, false, 4, 10),
    EXCEL("Excel", "📊", 4, 384, 15, 5, false, 4, 10),

    // 娱乐 — 优先级中高（实时性要求）
    MUSIC("音乐播放器", "🎵", 2, 128, 5, 0, false, 2, 5),
    VIDEO("视频播放器", "🎬", 8, 512, 20, 0, false, 2, 5),

    // 系统 — 优先级低（后台任务）
    DOWNLOAD("下载工具", "⬇️", 5, 256, 500, 1000, false, 5,5),
    ANTIVIRUS("杀毒软件", "🛡️", 10, 768, 30, 50, false, 4, 7),
    UPDATE("系统更新", "🔄", 8, 384, 200, 500, false, 5, 5),

    // ===== IPC 演示 =====
    // 进程A：发送请求后等待B回复（RECV阻塞）
    IPC_SENDER("IPC-发送方", "📤", 8, 256, 0, 0, true, 2, 12),
    // 进程B：收到A的请求后执行并回复（SEND唤醒A）
    IPC_RECEIVER("IPC-接收方", "📥", 6, 256, 0, 0, true, 2, 12),

    // ===== 打印机互斥演示 =====
    // 进程C：先抢占打印机，挂起也不释放，全部完成后才释放
    PRINT_FIRST("打印-先行者", "🖨️", 6, 256, 10, 0, true, 3, 16),
    // 进程D：请求打印机被阻塞，等C完全结束后才唤醒
    PRINT_SECOND("打印-等待者", "⏳", 6, 256, 10, 0, true, 3, 14);

    private final String name;
    private final String icon;
    private final int cpuBaseUsage;
    private final int memoryRequired;
    private final int diskRead;
    private final int networkSpeed;
    private final boolean singleInstance;
    private final int priority;        // 优先级（1最高，5最低）
    private final int instructionCount; // 指令数（程序大小）

    SimulatedApp(String name, String icon, int cpuBaseUsage,
                 int memoryRequired, int diskRead, int networkSpeed, boolean singleInstance, int priority, int instructionCount) {
        this.name = name;
        this.icon = icon;
        this.cpuBaseUsage = cpuBaseUsage;
        this.memoryRequired = memoryRequired;
        this.diskRead = diskRead;
        this.networkSpeed = networkSpeed;
        this.singleInstance = singleInstance;
        this.priority = priority;
        this.instructionCount = instructionCount;
    }

    // Getters
    public String getName() { return name; }
    public String getIcon() { return icon; }
    public int getCpuBaseUsage() { return cpuBaseUsage; }
    public int getMemoryRequired() { return memoryRequired; }
    public int getDiskRead() { return diskRead; }
    public int getDiskWrite() { return diskRead / 2; }
    public int getNetworkSpeed() { return networkSpeed; }
    public boolean isSingleInstance() { return singleInstance; }
    public int getPriority() { return priority; }
    public int getInstructionCount() { return instructionCount; }

    /**
     * 根据名称查找应用
     */
    public static SimulatedApp findByName(String name) {
        for (SimulatedApp app : values()) {
            if (app.name.equalsIgnoreCase(name) || app.name().equalsIgnoreCase(name)) {
                return app;
            }
        }
        return null;
    }

    /**
     * 获取应用的虚拟代码段 — 每个应用有特定的指令序列
     * 指令类型：MOV/ADD/SUB/SEND/RECEIVE/P_PRINTER/V_PRINTER/DISK_READ/INT 21H
     */
    public String[] getCodeSegment() {
        switch (this) {
            case IPC_SENDER -> {
                // A：准备请求 → RECV阻塞等B回复 → 收到回复后继续处理 → 结束
                return new String[]{
                    "MOV AX, 1        ;初始化请求参数",
                    "MOV BX, 100      ;设置请求数据",
                    "ADD AX, BX       ;计算请求内容",
                    "SEND IPC_RECEIVER ;向接收方发送请求消息",
                    "RECV             ;等待接收方回复（阻塞）",
                    "MOV CX, AX       ;保存回复到CX",
                    "ADD CX, 1        ;处理回复数据",
                    "MOV DX, CX       ;结果写入DX",
                    "PUSH DX          ;保存最终结果",
                    "MOV AX, 0        ;清零",
                    "POP BX           ;恢复结果",
                    "HALT             ;完成"
                };
            }
            case IPC_RECEIVER -> {
                // B：准备 → 接收A的请求 → 处理 → SEND回复唤醒A → 继续自己的工作 → 结束
                return new String[]{
                    "MOV AX, 0        ;初始化",
                    "MOV BX, 200      ;准备响应数据",
                    "ADD BX, 50       ;计算响应值",
                    "RECV             ;接收来自发送方的消息",
                    "MOV CX, BX       ;读取请求内容",
                    "ADD CX, AX       ;处理请求",
                    "SEND IPC_SENDER  ;回复发送方（唤醒A）",
                    "MOV DX, CX       ;继续自己的工作",
                    "ADD DX, 1        ;后续计算",
                    "PUSH DX          ;保存结果",
                    "POP AX           ;恢复",
                    "HALT             ;完成"
                };
            }
            case PRINT_FIRST -> {
                // C：申请打印机 → 打印任务 → 释放打印机 → 结束
                return new String[]{
                    "MOV AX, 1        ;初始化打印任务",
                    "MOV BX, 512      ;设置打印缓冲区",
                    "P_PRINTER        ;申请打印机（独占）",
                    "ADD AX, BX       ;准备打印数据",
                    "MOV CX, AX       ;写入打印缓冲",
                    "IO_WRITE         ;发送到打印机",
                    "ADD CX, 1        ;打印页码+1",
                    "IO_WRITE         ;继续打印",
                    "ADD CX, 1        ;打印页码+1",
                    "IO_WRITE         ;继续打印",
                    "MOV DX, CX       ;记录打印完成页数",
                    "ADD DX, 10       ;统计",
                    "MOV AX, DX       ;保存统计",
                    "V_PRINTER        ;释放打印机",
                    "MOV BX, 0        ;清零",
                    "HALT             ;完成"
                };
            }
            case PRINT_SECOND -> {
                // D：尝试申请打印机（被C占用则阻塞） → 获得后打印 → 结束
                return new String[]{
                    "MOV AX, 2        ;初始化打印任务",
                    "MOV BX, 256      ;设置打印缓冲区",
                    "P_PRINTER        ;申请打印机（若被占用则阻塞）",
                    "ADD AX, BX       ;准备打印数据",
                    "MOV CX, AX       ;写入打印缓冲",
                    "IO_WRITE         ;发送到打印机",
                    "ADD CX, 1        ;打印页码+1",
                    "IO_WRITE         ;继续打印",
                    "MOV DX, CX       ;记录完成页数",
                    "ADD DX, 5        ;统计",
                    "V_PRINTER        ;释放打印机",
                    "MOV AX, 0        ;清零",
                    "MOV BX, 0        ;清零",
                    "HALT             ;完成"
                };
            }
            default -> {
                String[] code = new String[instructionCount];
                for (int i = 0; i < instructionCount - 1; i++) {
                    code[i] = "STEP " + (i + 1) + "/" + instructionCount;
                }
                code[instructionCount - 1] = "HALT";
                return code;
            }
        }
    }
}
