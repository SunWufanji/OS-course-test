package com.processos.model;

/**
 * 模拟应用 - 定义每种桌面应用的资源需求
 */
public enum SimulatedApp {

    // 游戏类（单实例）
    CSGO("CS:GO", "🎮", 25, 4096, 100, 200, true),
    PUBG("绝地求生", "🎯", 30, 6144, 150, 300, true),
    MINECRAFT("我的世界", "⛏️", 15, 2048, 50, 100, true),

    // 浏览器和工具
    CHROME("Chrome", "🌐", 15, 2048, 50, 50),
    FIREFOX("Firefox", "🦊", 12, 1536, 40, 40),

    // 开发工具
    VSCODE("VSCode", "💻", 10, 1024, 30, 20),
    TERMINAL("终端", "⬛", 3, 128, 10, 0),

    // 办公
    NOTEPAD("记事本", "📝", 1, 64, 1, 0),
    WORD("Word", "📄", 5, 512, 20, 10),
    EXCEL("Excel", "📊", 4, 384, 15, 5),

    // 娱乐
    MUSIC("音乐播放器", "🎵", 2, 128, 5, 0),
    VIDEO("视频播放器", "🎬", 8, 512, 20, 0),

    // 系统
    DOWNLOAD("下载工具", "⬇️", 5, 256, 500, 1000),
    ANTIVIRUS("杀毒软件", "🛡️", 10, 768, 30, 50),
    UPDATE("系统更新", "🔄", 8, 384, 200, 500);

    private final String name;        // 应用名称
    private final String icon;        // 显示图标
    private final int cpuBaseUsage;   // CPU 基础占用率 (%)
    private final int memoryRequired; // 内存需求 (MB)
    private final int diskRead;       // 磁盘读取 (MB/s)
    private final int networkSpeed;   // 网络速度 (KB/s)
    private final boolean singleInstance; // 是否单实例（不允许重复启动）

    SimulatedApp(String name, String icon, int cpuBaseUsage,
                 int memoryRequired, int diskRead, int networkSpeed, boolean singleInstance) {
        this.name = name;
        this.icon = icon;
        this.cpuBaseUsage = cpuBaseUsage;
        this.memoryRequired = memoryRequired;
        this.diskRead = diskRead;
        this.networkSpeed = networkSpeed;
        this.singleInstance = singleInstance;
    }

    // 兼容旧的构造（默认非单实例）
    SimulatedApp(String name, String icon, int cpuBaseUsage,
                 int memoryRequired, int diskRead, int networkSpeed) {
        this(name, icon, cpuBaseUsage, memoryRequired, diskRead, networkSpeed, false);
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
}
