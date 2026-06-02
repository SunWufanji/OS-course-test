package com.processos.model;

/**
 * 进程状态枚举
 */
public enum ProcessState {
    CREATED("新建"),
    READY("就绪"),
    RUNNING("运行"),
    BLOCKED("阻塞"),
    TERMINATED("结束");

    private final String chineseName;

    ProcessState(String chineseName) {
        this.chineseName = chineseName;
    }

    public String getChineseName() {
        return chineseName;
    }
}
