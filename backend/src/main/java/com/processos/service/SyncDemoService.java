package com.processos.service;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * 同步互斥演示服务 — 生产者消费者 / 读者写者 / 哲学家进餐
 */
@Service
public class SyncDemoService {

    private final List<String> syncLog = new CopyOnWriteArrayList<>();
    private boolean isRunning = false;

    // ==================== 生产者消费者 ====================
    private int pcBufferSize = 8;
    private boolean[] pcBuffer;       // 缓冲区槽位
    private int pcEmpty;              // 空槽位数
    private int pcFull;               // 满槽位数
    private int pcProducerCount = 0;
    private int pcConsumerCount = 0;
    private String pcProducerState = "IDLE";  // IDLE / RUNNING / BLOCKED
    private String pcConsumerState = "IDLE";

    // ==================== 读者写者 ====================
    private int rwReadCount = 0;       // 当前读者数
    private boolean rwWriting = false; // 是否有写者在写
    private List<String> rwReaderStates = new ArrayList<>(Arrays.asList("IDLE", "IDLE", "IDLE"));
    private List<String> rwWriterStates = new ArrayList<>(Arrays.asList("IDLE", "IDLE"));

    // ==================== 哲学家进餐 ====================
    private String[] philosopherStates = {"THINKING", "THINKING", "THINKING", "THINKING", "THINKING"};
    private boolean[] chopsticks = {false, false, false, false, false}; // true=被占用
    private boolean hasDeadlock = false;
    private String deadlockStrategy = "NONE"; // NONE / LIMIT_4 / ODD_EVEN / MUTEX
    private String philosopherLog = "";

    public SyncDemoService() {}

    // ==================== 生产者消费者 API ====================

    public void initProducerConsumer() {
        pcBuffer = new boolean[pcBufferSize];
        pcEmpty = pcBufferSize;
        pcFull = 0;
        pcProducerCount = 0;
        pcConsumerCount = 0;
        pcProducerState = "IDLE";
        pcConsumerState = "IDLE";
        syncLog.clear();
        addLog("[初始化] 缓冲区大小=" + pcBufferSize + ", empty=" + pcEmpty + ", full=" + pcFull);
    }

    /**
     * 单步执行：生产者生产一个产品
     */
    public synchronized Map<String, Object> producerStep() {
        Map<String, Object> result = new HashMap<>();
        if (pcEmpty <= 0) {
            pcProducerState = "BLOCKED";
            addLog("[生产者] P(empty) 阻塞！缓冲区已满 (empty=0)");
            result.put("event", "BLOCKED");
            result.put("message", "缓冲区已满，生产者阻塞");
        } else {
            pcEmpty--;
            pcFull++;
            pcProducerCount++;
            // 找到第一个空槽位填入
            for (int i = 0; i < pcBuffer.length; i++) {
                if (!pcBuffer[i]) {
                    pcBuffer[i] = true;
                    break;
                }
            }
            pcProducerState = "RUNNING";
            addLog("[生产者] P(empty): empty=" + pcEmpty + ", full=" + pcFull + ", 生产产品 #" + pcProducerCount);
            result.put("event", "PRODUCED");
            result.put("message", "生产产品 #" + pcProducerCount);
        }
        result.put("buffer", pcBuffer.clone());
        result.put("empty", pcEmpty);
        result.put("full", pcFull);
        result.put("producerState", pcProducerState);
        result.put("producerCount", pcProducerCount);
        result.put("consumerCount", pcConsumerCount);
        return result;
    }

    /**
     * 单步执行：消费者消费一个产品
     */
    public synchronized Map<String, Object> consumerStep() {
        Map<String, Object> result = new HashMap<>();
        if (pcFull <= 0) {
            pcConsumerState = "BLOCKED";
            addLog("[消费者] P(full) 阻塞！缓冲区为空 (full=0)");
            result.put("event", "BLOCKED");
            result.put("message", "缓冲区为空，消费者阻塞");
        } else {
            pcFull++;
            pcEmpty++;
            pcConsumerCount++;
            // 找到第一个满槽位清空
            for (int i = 0; i < pcBuffer.length; i++) {
                if (pcBuffer[i]) {
                    pcBuffer[i] = false;
                    break;
                }
            }
            pcConsumerState = "RUNNING";
            addLog("[消费者] P(full): empty=" + pcEmpty + ", full=" + pcFull + ", 消费产品 #" + pcConsumerCount);
            result.put("event", "CONSUMED");
            result.put("message", "消费产品 #" + pcConsumerCount);
        }
        result.put("buffer", pcBuffer.clone());
        result.put("empty", pcEmpty);
        result.put("full", pcFull);
        result.put("producerState", pcProducerState);
        result.put("consumerState", pcConsumerState);
        result.put("producerCount", pcProducerCount);
        result.put("consumerCount", pcConsumerCount);
        return result;
    }

    /**
     * 唤醒阻塞的生产者
     */
    public synchronized void wakeProducer() {
        if ("BLOCKED".equals(pcProducerState)) {
            pcProducerState = "IDLE";
            addLog("[系统] 生产者被唤醒 (V(empty))");
        }
    }

    /**
     * 唤醒阻塞的消费者
     */
    public synchronized void wakeConsumer() {
        if ("BLOCKED".equals(pcConsumerState)) {
            pcConsumerState = "IDLE";
            addLog("[系统] 消费者被唤醒 (V(full))");
        }
    }

    public Map<String, Object> getProducerConsumerStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("buffer", pcBuffer != null ? pcBuffer.clone() : new boolean[pcBufferSize]);
        status.put("bufferSize", pcBufferSize);
        status.put("empty", pcEmpty);
        status.put("full", pcFull);
        status.put("producerState", pcProducerState);
        status.put("consumerState", pcConsumerState);
        status.put("producerCount", pcProducerCount);
        status.put("consumerCount", pcConsumerCount);
        status.put("log", new ArrayList<>(syncLog));
        status.put("isRunning", isRunning);
        return status;
    }

    // ==================== 读者写者 API ====================

    public void initReaderWriter() {
        rwReadCount = 0;
        rwWriting = false;
        rwReaderStates = new ArrayList<>(Arrays.asList("IDLE", "IDLE", "IDLE"));
        rwWriterStates = new ArrayList<>(Arrays.asList("IDLE", "IDLE"));
        syncLog.clear();
        addLog("[初始化] 读者写者问题演示");
    }

    /**
     * 读者尝试读取
     */
    public synchronized Map<String, Object> readerStep(int readerIndex) {
        Map<String, Object> result = new HashMap<>();
        if (rwWriting) {
            rwReaderStates.set(readerIndex, "BLOCKED");
            addLog("[读者" + (readerIndex + 1) + "] 尝试读取，但写者正在写入，阻塞！");
            result.put("event", "BLOCKED");
        } else {
            rwReadCount++;
            rwReaderStates.set(readerIndex, "READING");
            addLog("[读者" + (readerIndex + 1) + "] 开始读取 (readcount=" + rwReadCount + ")");
            result.put("event", "READING");
        }
        result.putAll(getReaderWriterStatus());
        return result;
    }

    /**
     * 读者完成读取
     */
    public synchronized Map<String, Object> readerFinish(int readerIndex) {
        rwReadCount = Math.max(0, rwReadCount - 1);
        rwReaderStates.set(readerIndex, "IDLE");
        addLog("[读者" + (readerIndex + 1) + "] 完成读取 (readcount=" + rwReadCount + ")");
        Map<String, Object> result = new HashMap<>();
        result.put("event", "FINISHED");
        result.putAll(getReaderWriterStatus());
        return result;
    }

    /**
     * 写者尝试写入
     */
    public synchronized Map<String, Object> writerStep(int writerIndex) {
        Map<String, Object> result = new HashMap<>();
        if (rwWriting || rwReadCount > 0) {
            rwWriterStates.set(writerIndex, "BLOCKED");
            addLog("[写者" + (writerIndex + 1) + "] 尝试写入，但资源被占用，阻塞！");
            result.put("event", "BLOCKED");
        } else {
            rwWriting = true;
            rwWriterStates.set(writerIndex, "WRITING");
            addLog("[写者" + (writerIndex + 1) + "] 开始写入");
            result.put("event", "WRITING");
        }
        result.putAll(getReaderWriterStatus());
        return result;
    }

    /**
     * 写者完成写入
     */
    public synchronized Map<String, Object> writerFinish(int writerIndex) {
        rwWriting = false;
        rwWriterStates.set(writerIndex, "IDLE");
        addLog("[写者" + (writerIndex + 1) + "] 完成写入");
        Map<String, Object> result = new HashMap<>();
        result.put("event", "FINISHED");
        result.putAll(getReaderWriterStatus());
        return result;
    }

    public Map<String, Object> getReaderWriterStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("readCount", rwReadCount);
        status.put("isWriting", rwWriting);
        status.put("readerStates", rwReaderStates);
        status.put("writerStates", rwWriterStates);
        status.put("log", new ArrayList<>(syncLog));
        return status;
    }

    // ==================== 哲学家进餐 API ====================

    public void initDiningPhilosophers() {
        philosopherStates = new String[]{"THINKING", "THINKING", "THINKING", "THINKING", "THINKING"};
        chopsticks = new boolean[]{false, false, false, false, false};
        hasDeadlock = false;
        deadlockStrategy = "NONE";
        syncLog.clear();
        addLog("[初始化] 哲学家进餐问题演示 (5位哲学家, 5根筷子)");
    }

    /**
     * 哲学家变饿
     */
    public synchronized Map<String, Object> philosopherGetHungry(int id) {
        if (!"THINKING".equals(philosopherStates[id])) {
            Map<String, Object> result = new HashMap<>();
            result.put("event", "INVALID");
            result.put("message", "哲学家" + id + "当前状态不是思考中");
            result.putAll(getDiningStatus());
            return result;
        }
        philosopherStates[id] = "HUNGRY";
        addLog("[哲学家" + id + "] 变饿了，尝试拿筷子...");
        Map<String, Object> result = new HashMap<>();
        result.put("event", "HUNGRY");
        result.putAll(getDiningStatus());
        return result;
    }

    /**
     * 哲学家尝试拿筷子并进餐
     */
    public synchronized Map<String, Object> philosopherEat(int id) {
        Map<String, Object> result = new HashMap<>();
        if (!"HUNGRY".equals(philosopherStates[id])) {
            result.put("event", "INVALID");
            result.put("message", "哲学家" + id + "不是饥饿状态");
            result.putAll(getDiningStatus());
            return result;
        }

        int left = id;
        int right = (id + 1) % 5;

        // 死锁策略检查
        if ("LIMIT_4".equals(deadlockStrategy)) {
            int eatingCount = 0;
            for (String s : philosopherStates) {
                if ("EATING".equals(s)) eatingCount++;
            }
            if (eatingCount >= 4) {
                philosopherStates[id] = "BLOCKED";
                addLog("[哲学家" + id + "] 策略限制：最多4人同时进餐，阻塞！");
                result.put("event", "BLOCKED");
                result.putAll(getDiningStatus());
                return result;
            }
        } else if ("ODD_EVEN".equals(deadlockStrategy)) {
            // 奇数先拿左，偶数先拿右
            if (id % 2 == 0) {
                left = (id + 1) % 5;
                right = id;
            }
        }

        if (!chopsticks[left] && !chopsticks[right]) {
            // 拿到两根筷子，开始进餐
            chopsticks[left] = true;
            chopsticks[right] = true;
            philosopherStates[id] = "EATING";
            addLog("[哲学家" + id + "] 拿到筷子" + left + "和筷子" + right + "，开始进餐");
            result.put("event", "EATING");
        } else {
            // 拿不到筷子，阻塞
            philosopherStates[id] = "BLOCKED";
            String waitingFor = !chopsticks[left] ? "左手筷子" + left : "右手筷子" + right;
            addLog("[哲学家" + id + "] 等待 " + waitingFor + "，阻塞！");
            result.put("event", "BLOCKED");
            result.put("message", "等待 " + waitingFor);

            // 检测死锁
            checkDeadlock();
        }
        result.putAll(getDiningStatus());
        return result;
    }

    /**
     * 哲学家吃完放筷子
     */
    public synchronized Map<String, Object> philosopherPutChopsticks(int id) {
        Map<String, Object> result = new HashMap<>();
        if (!"EATING".equals(philosopherStates[id])) {
            result.put("event", "INVALID");
            result.putAll(getDiningStatus());
            return result;
        }

        int left = id;
        int right = (id + 1) % 5;
        chopsticks[left] = false;
        chopsticks[right] = false;
        philosopherStates[id] = "THINKING";
        addLog("[哲学家" + id + "] 放下筷子" + left + "和筷子" + right + "，开始思考");

        // 尝试唤醒相邻的阻塞哲学家
        for (int i = 0; i < 5; i++) {
            if ("BLOCKED".equals(philosopherStates[i])) {
                int nextLeft = i;
                int nextRight = (i + 1) % 5;
                if (!chopsticks[nextLeft] && !chopsticks[nextRight]) {
                    // 可以尝试重新进餐
                    addLog("[系统] 哲学家" + i + " 的筷子可用，可以尝试进餐");
                }
            }
        }

        hasDeadlock = false;
        result.put("event", "THINKING");
        result.putAll(getDiningStatus());
        return result;
    }

    /**
     * 触发死锁（所有人同时拿左手筷子）
     */
    public synchronized Map<String, Object> triggerDeadlock() {
        addLog("[死锁触发] 所有哲学家同时拿起左手筷子！");
        for (int i = 0; i < 5; i++) {
            philosopherStates[i] = "BLOCKED";
            chopsticks[i] = true; // 每个人拿左手筷子
        }
        hasDeadlock = true;
        addLog("[死锁检测] 检测到死锁！循环等待条件成立：P0→筷子0→P1→筷子1→...→P4→筷子4→P0");
        Map<String, Object> result = new HashMap<>();
        result.put("event", "DEADLOCK");
        result.putAll(getDiningStatus());
        return result;
    }

    /**
     * 设置死锁避免策略
     */
    public void setDeadlockStrategy(String strategy) {
        this.deadlockStrategy = strategy;
        addLog("[策略切换] 死锁避免策略: " + strategy);
    }

    /**
     * 检测死锁
     */
    private void checkDeadlock() {
        boolean allBlocked = true;
        for (String s : philosopherStates) {
            if (!"BLOCKED".equals(s)) {
                allBlocked = false;
                break;
            }
        }
        if (allBlocked) {
            hasDeadlock = true;
            addLog("[死锁检测] 所有哲学家都阻塞！检测到死锁！");
        }
    }

    public Map<String, Object> getDiningStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("philosopherStates", philosopherStates.clone());
        status.put("chopsticks", chopsticks.clone());
        status.put("hasDeadlock", hasDeadlock);
        status.put("strategy", deadlockStrategy);
        status.put("log", new ArrayList<>(syncLog));
        return status;
    }

    // ==================== 通用方法 ====================

    public void addLog(String message) {
        long timestamp = System.currentTimeMillis();
        syncLog.add("[" + timestamp + "] " + message);
        // 保留最近100条
        while (syncLog.size() > 100) {
            syncLog.remove(0);
        }
    }

    public List<String> getLog() {
        return new ArrayList<>(syncLog);
    }

    public void clearLog() {
        syncLog.clear();
    }

    public void setRunning(boolean running) {
        this.isRunning = running;
    }
}
