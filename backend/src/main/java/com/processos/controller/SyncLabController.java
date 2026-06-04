package com.processos.controller;

import com.processos.service.SyncDemoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 同步互斥实验室 API
 */
@RestController
@RequestMapping("/api/sync-lab")
@CrossOrigin(origins = "*")
public class SyncLabController {

    @Autowired
    private SyncDemoService syncDemoService;

    // ==================== 生产者消费者 ====================

    @PostMapping("/pc/init")
    public Map<String, Object> initProducerConsumer() {
        syncDemoService.initProducerConsumer();
        return syncDemoService.getProducerConsumerStatus();
    }

    /**
     * 启动多线程生产者消费者
     */
    @PostMapping("/pc/start")
    public Map<String, Object> startProducerConsumer(@RequestBody Map<String, Integer> request) {
        int producers = request.getOrDefault("producers", 2);
        int consumers = request.getOrDefault("consumers", 2);
        syncDemoService.startProducerConsumer(producers, consumers);
        return syncDemoService.getProducerConsumerStatus();
    }

    @PostMapping("/pc/stop")
    public Map<String, Object> stopProducerConsumer() {
        syncDemoService.stopProducerConsumer();
        return syncDemoService.getProducerConsumerStatus();
    }

    @GetMapping("/pc/status")
    public Map<String, Object> getPCStatus() {
        return syncDemoService.getProducerConsumerStatus();
    }

    // ==================== 读者写者 ====================

    @PostMapping("/rw/init")
    public Map<String, Object> initReaderWriter() {
        syncDemoService.initReaderWriter();
        return syncDemoService.getReaderWriterStatus();
    }

    @PostMapping("/rw/read/{index}")
    public Map<String, Object> read(@PathVariable int index) {
        return syncDemoService.readerStep(index);
    }

    @PostMapping("/rw/read-finish/{index}")
    public Map<String, Object> readFinish(@PathVariable int index) {
        return syncDemoService.readerFinish(index);
    }

    @PostMapping("/rw/write/{index}")
    public Map<String, Object> write(@PathVariable int index) {
        return syncDemoService.writerStep(index);
    }

    @PostMapping("/rw/write-finish/{index}")
    public Map<String, Object> writeFinish(@PathVariable int index) {
        return syncDemoService.writerFinish(index);
    }

    @GetMapping("/rw/status")
    public Map<String, Object> getRWStatus() {
        return syncDemoService.getReaderWriterStatus();
    }

    // ==================== 哲学家进餐 ====================

    @PostMapping("/dp/init")
    public Map<String, Object> initDining() {
        syncDemoService.initDiningPhilosophers();
        return syncDemoService.getDiningStatus();
    }

    @PostMapping("/dp/hungry/{id}")
    public Map<String, Object> getHungry(@PathVariable int id) {
        return syncDemoService.philosopherGetHungry(id);
    }

    @PostMapping("/dp/eat/{id}")
    public Map<String, Object> eat(@PathVariable int id) {
        return syncDemoService.philosopherEat(id);
    }

    @PostMapping("/dp/put/{id}")
    public Map<String, Object> putChopsticks(@PathVariable int id) {
        return syncDemoService.philosopherPutChopsticks(id);
    }

    @PostMapping("/dp/deadlock")
    public Map<String, Object> triggerDeadlock() {
        return syncDemoService.triggerDeadlock();
    }

    @PostMapping("/dp/strategy/{strategy}")
    public Map<String, Object> setStrategy(@PathVariable String strategy) {
        syncDemoService.setDeadlockStrategy(strategy);
        return syncDemoService.getDiningStatus();
    }

    @PostMapping("/dp/reset")
    public Map<String, Object> resetDining() {
        syncDemoService.initDiningPhilosophers();
        return syncDemoService.getDiningStatus();
    }

    @GetMapping("/dp/status")
    public Map<String, Object> getDPStatus() {
        return syncDemoService.getDiningStatus();
    }

    // ==================== 通用 ====================

    @GetMapping("/log")
    public List<String> getLog() {
        return syncDemoService.getLog();
    }

    @DeleteMapping("/log")
    public void clearLog() {
        syncDemoService.clearLog();
    }
}
