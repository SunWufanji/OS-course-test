package com.processos;

import com.processos.hardware.HardwarePool;
import com.processos.process.ProcessManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/**
 * 进程管理系统 - Spring Boot主类
 */
@SpringBootApplication
@EnableScheduling
public class ProcessOsApplication {

    @Autowired
    private HardwarePool hardwarePool;

    @Autowired
    private ProcessManager processManager;

    public static void main(String[] args) {
        SpringApplication.run(ProcessOsApplication.class, args);
    }

    /**
     * 定时任务：每秒更新硬件资源状态（模拟抖动）
     */
    @Scheduled(fixedRate = 1000)
    public void updateHardwareStatus() {
        hardwarePool.updateCpuUsage();
        hardwarePool.updateIoUsage(processManager.getProcessCount());
        processManager.updateResourceUsage();
    }
}
