package com.processos.service;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 同步互斥演示服务 — 多线程版本
 * 严格遵循 PV 操作语义
 */
@Service
public class SyncDemoService {

    private final List<String> syncLog = new CopyOnWriteArrayList<>();

    // ==================== 生产者消费者（多线程） ====================
    private int pcBufferSize = 8;
    private boolean[] pcBuffer;
    private final AtomicInteger pcEmpty = new AtomicInteger(8);  // 空槽位数
    private final AtomicInteger pcFull = new AtomicInteger(0);    // 满槽位数
    private final AtomicInteger pcMutex = new AtomicInteger(1);   // 互斥锁
    private final AtomicInteger pcProducerCount = new AtomicInteger(0);
    private final AtomicInteger pcConsumerCount = new AtomicInteger(0);
    private final Map<Integer, String> pcProducerStates = new ConcurrentHashMap<>();
    private final Map<Integer, String> pcConsumerStates = new ConcurrentHashMap<>();
    private final AtomicBoolean pcRunning = new AtomicBoolean(false);
    private final List<Thread> pcThreads = new CopyOnWriteArrayList<>();

    // ==================== 读者写者 ====================
    private final AtomicInteger rwReadCount = new AtomicInteger(0);
    private final AtomicInteger rwWrt = new AtomicInteger(1);  // 读写互斥锁
    private final AtomicBoolean rwWriting = new AtomicBoolean(false);
    private final String[] rwReaderStates = {"IDLE", "IDLE", "IDLE"};
    private final String[] rwWriterStates = {"IDLE", "IDLE"};

    // ==================== 哲学家进餐 ====================
    private String[] philosopherStates = {"THINKING", "THINKING", "THINKING", "THINKING", "THINKING"};
    private boolean[] chopsticks = {false, false, false, false, false};
    private boolean hasDeadlock = false;
    private String deadlockStrategy = "NONE";

    // ==================== 生产者消费者（多线程版） ====================

    /**
     * 初始化生产者消费者（多线程版）
     */
    public void initProducerConsumer() {
        stopProducerConsumer(); // 先停止之前的线程
        pcBuffer = new boolean[pcBufferSize];
        pcEmpty.set(pcBufferSize);
        pcFull.set(0);
        pcMutex.set(1);
        pcProducerCount.set(0);
        pcConsumerCount.set(0);
        pcProducerStates.clear();
        pcConsumerStates.clear();
        syncLog.clear();
        addLog("[初始化] 缓冲区大小=" + pcBufferSize + ", mutex=1, empty=" + pcBufferSize + ", full=0");
    }

    /**
     * 启动多线程生产者消费者
     */
    public void startProducerConsumer(int numProducers, int numConsumers) {
        stopProducerConsumer();
        pcRunning.set(true);
        syncLog.clear();
        addLog("[启动] " + numProducers + "个生产者, " + numConsumers + "个消费者");

        // 启动生产者线程
        for (int i = 0; i < numProducers; i++) {
            final int id = i;
            pcProducerStates.put(id, "IDLE");
            Thread t = new Thread(() -> producerLoop(id), "Producer-" + id);
            t.setDaemon(true);
            pcThreads.add(t);
            t.start();
        }

        // 启动消费者线程
        for (int i = 0; i < numConsumers; i++) {
            final int id = i;
            pcConsumerStates.put(id, "IDLE");
            Thread t = new Thread(() -> consumerLoop(id), "Consumer-" + id);
            t.setDaemon(true);
            pcThreads.add(t);
            t.start();
        }
    }

    /**
     * 生产者循环（严格 PV 操作）
     */
    private void producerLoop(int id) {
        while (pcRunning.get()) {
            try {
                Thread.sleep(500 + new Random().nextInt(500)); // 模拟生产时间

                // P(empty) — 等待空闲缓冲区
                pcProducerStates.put(id, "WAITING_EMPTY");
                while (pcEmpty.get() <= 0 && pcRunning.get()) {
                    addLog("[生产者" + id + "] P(empty) 阻塞！empty=0");
                    synchronized (pcEmpty) { pcEmpty.wait(100); }
                }
                if (!pcRunning.get()) break;
                pcEmpty.decrementAndGet();

                // P(mutex) — 进入临界区
                while (pcMutex.get() <= 0 && pcRunning.get()) {
                    synchronized (pcMutex) { pcMutex.wait(100); }
                }
                pcMutex.decrementAndGet();

                // === 临界区：放入缓冲区 ===
                pcProducerStates.put(id, "PRODUCING");
                for (int i = 0; i < pcBuffer.length; i++) {
                    if (!pcBuffer[i]) {
                        pcBuffer[i] = true;
                        break;
                    }
                }
                pcFull.incrementAndGet();
                int count = pcProducerCount.incrementAndGet();
                addLog("[生产者" + id + "] P(empty) P(mutex) → 放入产品 #" + count + " (empty=" + pcEmpty.get() + ", full=" + pcFull.get() + ")");

                // V(mutex) — 离开临界区
                pcMutex.incrementAndGet();
                synchronized (pcMutex) { pcMutex.notify(); }

                // V(full) — 通知消费者（只通知，不再 increment）
                synchronized (pcFull) { pcFull.notifyAll(); }

                pcProducerStates.put(id, "IDLE");

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }

    /**
     * 消费者循环（严格 PV 操作）
     */
    private void consumerLoop(int id) {
        while (pcRunning.get()) {
            try {
                Thread.sleep(800 + new Random().nextInt(800)); // 模拟消费时间

                // P(full) — 等待有产品
                pcConsumerStates.put(id, "WAITING_FULL");
                while (pcFull.get() <= 0 && pcRunning.get()) {
                    synchronized (pcFull) { pcFull.wait(100); }
                }
                if (!pcRunning.get()) break;
                pcFull.decrementAndGet();

                // P(mutex) — 进入临界区
                while (pcMutex.get() <= 0 && pcRunning.get()) {
                    synchronized (pcMutex) { pcMutex.wait(100); }
                }
                pcMutex.decrementAndGet();

                // === 临界区：从缓冲区取出 ===
                pcConsumerStates.put(id, "CONSUMING");
                for (int i = 0; i < pcBuffer.length; i++) {
                    if (pcBuffer[i]) {
                        pcBuffer[i] = false;
                        break;
                    }
                }
                pcEmpty.incrementAndGet();
                int count = pcConsumerCount.incrementAndGet();
                addLog("[消费者" + id + "] P(full) P(mutex) → 取出产品 #" + count + " (empty=" + pcEmpty.get() + ", full=" + pcFull.get() + ")");

                // V(mutex) — 离开临界区
                pcMutex.incrementAndGet();
                synchronized (pcMutex) { pcMutex.notifyAll(); }

                // V(empty) — 通知生产者（只通知，不再 increment）
                synchronized (pcEmpty) { pcEmpty.notifyAll(); }

                pcConsumerStates.put(id, "IDLE");

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }

    /**
     * 停止生产者消费者
     */
    public void stopProducerConsumer() {
        pcRunning.set(false);
        // 唤醒所有等待的线程
        synchronized (pcEmpty) { pcEmpty.notifyAll(); }
        synchronized (pcFull) { pcFull.notifyAll(); }
        synchronized (pcMutex) { pcMutex.notifyAll(); }
        for (Thread t : pcThreads) {
            t.interrupt();
            try { t.join(100); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }
        pcThreads.clear();
    }

    /**
     * 获取生产者消费者状态
     */
    public Map<String, Object> getProducerConsumerStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("buffer", pcBuffer != null ? pcBuffer.clone() : new boolean[pcBufferSize]);
        status.put("bufferSize", pcBufferSize);
        status.put("empty", pcEmpty.get());
        status.put("full", pcFull.get());
        status.put("mutex", pcMutex.get());
        status.put("producerCount", pcProducerCount.get());
        status.put("consumerCount", pcConsumerCount.get());
        status.put("producerStates", new HashMap<>(pcProducerStates));
        status.put("consumerStates", new HashMap<>(pcConsumerStates));
        status.put("isRunning", pcRunning.get());
        status.put("log", new ArrayList<>(syncLog));
        return status;
    }

    // ==================== 读者写者 ====================

    public void initReaderWriter() {
        rwReadCount.set(0);
        rwWrt.set(1);
        rwWriting.set(false);
        Arrays.fill(rwReaderStates, "IDLE");
        Arrays.fill(rwWriterStates, "IDLE");
        syncLog.clear();
        addLog("[初始化] 读者写者问题演示");
    }

    public synchronized Map<String, Object> readerStep(int index) {
        Map<String, Object> result = new HashMap<>();
        if (rwWriting.get()) {
            rwReaderStates[index] = "BLOCKED";
            addLog("[读者" + (index + 1) + "] 尝试读取，但写者正在写入，阻塞！");
            result.put("event", "BLOCKED");
        } else {
            rwReadCount.incrementAndGet();
            rwReaderStates[index] = "READING";
            addLog("[读者" + (index + 1) + "] 开始读取 (readcount=" + rwReadCount.get() + ")");
            result.put("event", "READING");
        }
        result.putAll(getReaderWriterStatus());
        return result;
    }

    public synchronized Map<String, Object> readerFinish(int index) {
        rwReadCount.decrementAndGet();
        rwReaderStates[index] = "IDLE";
        addLog("[读者" + (index + 1) + "] 完成读取 (readcount=" + rwReadCount.get() + ")");
        Map<String, Object> result = new HashMap<>();
        result.put("event", "FINISHED");
        result.putAll(getReaderWriterStatus());
        return result;
    }

    public synchronized Map<String, Object> writerStep(int index) {
        Map<String, Object> result = new HashMap<>();
        if (rwWriting.get() || rwReadCount.get() > 0) {
            rwWriterStates[index] = "BLOCKED";
            addLog("[写者" + (index + 1) + "] 尝试写入，但资源被占用，阻塞！");
            result.put("event", "BLOCKED");
        } else {
            rwWriting.set(true);
            rwWriterStates[index] = "WRITING";
            addLog("[写者" + (index + 1) + "] 开始写入");
            result.put("event", "WRITING");
        }
        result.putAll(getReaderWriterStatus());
        return result;
    }

    public synchronized Map<String, Object> writerFinish(int index) {
        rwWriting.set(false);
        rwWriterStates[index] = "IDLE";
        addLog("[写者" + (index + 1) + "] 完成写入");
        Map<String, Object> result = new HashMap<>();
        result.put("event", "FINISHED");
        result.putAll(getReaderWriterStatus());
        return result;
    }

    public Map<String, Object> getReaderWriterStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("readCount", rwReadCount.get());
        status.put("wrt", rwWrt.get());
        status.put("isWriting", rwWriting.get());
        status.put("readerStates", rwReaderStates.clone());
        status.put("writerStates", rwWriterStates.clone());
        status.put("log", new ArrayList<>(syncLog));
        return status;
    }

    // ==================== 哲学家进餐 ====================

    public void initDiningPhilosophers() {
        Arrays.fill(philosopherStates, "THINKING");
        Arrays.fill(chopsticks, false);
        hasDeadlock = false;
        deadlockStrategy = "NONE";
        syncLog.clear();
        addLog("[初始化] 哲学家进餐问题 (5位哲学家, 5根筷子)");
    }

    public synchronized Map<String, Object> philosopherGetHungry(int id) {
        Map<String, Object> result = new HashMap<>();
        if (!"THINKING".equals(philosopherStates[id])) {
            result.put("event", "INVALID");
            result.putAll(getDiningStatus());
            return result;
        }
        philosopherStates[id] = "HUNGRY";
        addLog("[哲学家" + id + "] 变饿了");
        result.put("event", "HUNGRY");
        result.putAll(getDiningStatus());
        return result;
    }

    public synchronized Map<String, Object> philosopherEat(int id) {
        Map<String, Object> result = new HashMap<>();
        if (!"HUNGRY".equals(philosopherStates[id])) {
            result.put("event", "INVALID");
            result.putAll(getDiningStatus());
            return result;
        }

        int left = id;
        int right = (id + 1) % 5;

        // 策略处理
        if ("ODD_EVEN".equals(deadlockStrategy) && id % 2 == 0) {
            left = (id + 1) % 5;
            right = id;
        }
        if ("LIMIT_4".equals(deadlockStrategy)) {
            long eatingCount = Arrays.stream(philosopherStates).filter("EATING"::equals).count();
            if (eatingCount >= 4) {
                philosopherStates[id] = "BLOCKED";
                addLog("[哲学家" + id + "] 策略限制：最多4人同时进餐，阻塞！");
                result.put("event", "BLOCKED");
                result.putAll(getDiningStatus());
                return result;
            }
        }

        if (!chopsticks[left] && !chopsticks[right]) {
            chopsticks[left] = true;
            chopsticks[right] = true;
            philosopherStates[id] = "EATING";
            addLog("[哲学家" + id + "] 拿到筷子" + left + "和筷子" + right + "，开始进餐");
            result.put("event", "EATING");
        } else {
            philosopherStates[id] = "BLOCKED";
            String waitingFor = !chopsticks[left] ? "左手筷子" + left : "右手筷子" + right;
            addLog("[哲学家" + id + "] 等待 " + waitingFor + "，阻塞！");
            result.put("event", "BLOCKED");
            checkDeadlock();
        }
        result.putAll(getDiningStatus());
        return result;
    }

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
        hasDeadlock = false;
        result.put("event", "THINKING");
        result.putAll(getDiningStatus());
        return result;
    }

    public synchronized Map<String, Object> triggerDeadlock() {
        addLog("[死锁触发] 所有哲学家同时拿起左手筷子！");
        for (int i = 0; i < 5; i++) {
            philosopherStates[i] = "BLOCKED";
            chopsticks[i] = true;
        }
        hasDeadlock = true;
        addLog("[死锁检测] 循环等待条件成立：P0→筷子0→P1→筷子1→...→P4→筷子4→P0");
        Map<String, Object> result = new HashMap<>();
        result.put("event", "DEADLOCK");
        result.putAll(getDiningStatus());
        return result;
    }

    public void setDeadlockStrategy(String strategy) {
        this.deadlockStrategy = strategy;
        addLog("[策略切换] " + strategy);
    }

    private void checkDeadlock() {
        boolean allBlocked = Arrays.stream(philosopherStates).allMatch("BLOCKED"::equals);
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

    // ==================== 通用 ====================

    public void addLog(String message) {
        long ts = System.currentTimeMillis();
        syncLog.add("[" + ts + "] " + message);
        while (syncLog.size() > 100) syncLog.remove(0);
    }

    public List<String> getLog() { return new ArrayList<>(syncLog); }
    public void clearLog() { syncLog.clear(); }
}
