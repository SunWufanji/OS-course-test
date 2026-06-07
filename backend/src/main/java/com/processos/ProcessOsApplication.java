package com.processos;

import com.processos.hardware.HardwarePool;
import com.processos.process.ProcessManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 进程管理系统 - Spring Boot主类
 * tick由前端轮询 /api/system/run 驱动，无后台定时任务
 */
@SpringBootApplication
public class ProcessOsApplication {

    @Autowired
    private HardwarePool hardwarePool;

    @Autowired
    private ProcessManager processManager;

    public static void main(String[] args) {
        SpringApplication.run(ProcessOsApplication.class, args);
    }
}
