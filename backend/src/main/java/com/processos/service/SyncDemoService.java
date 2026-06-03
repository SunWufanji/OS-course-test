package com.processos.service;

import com.processos.sync.Mutex;
import com.processos.sync.Semaphore;
import com.processos.sync.MessageQueue;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * 同步机制演示服务
 */
@Service
public class SyncDemoService {

    private Semaphore semaphore;
    private Mutex mutex;
    private MessageQueue messageQueue;
    private List<String> syncLog;
    private boolean isRunning;

    // 生产者消费者
    private int buffer = 0;
    private int bufferSize = 5;
    private int producerCount = 0;
    private int consumerCount = 0;

    public SyncDemoService() {
        this.syncLog = new CopyOnWriteArrayList<>();
        this.isRunning = false;
    }

    /**
     * 初始化信号量
     */
    public void initSemaphore(int value) {
        semaphore = new Semaphore("demo_semaphore", value);
        addLog("初始化信号量: value=" + value);
    }

    /**
     * 初始化互斥锁
     */
    public void initMutex() {
        mutex = new Mutex("demo_mutex");
        addLog("初始化互斥锁");
    }

    /**
     * 初始化消息队列
     */
    public void initMessageQueue(int maxSize) {
        messageQueue = new MessageQueue("demo_queue", maxSize);
        addLog("初始化消息队列: maxSize=" + maxSize);
    }

    /**
     * P操作（等待）
     */
    public synchronized void pOperation() {
        if (semaphore == null) {
            addLog("错误: 信号量未初始化");
            return;
        }
        addLog("P操作: 信号量值=" + semaphore.getValue());
        semaphore.P();
        addLog("P操作完成: 信号量值=" + semaphore.getValue());
    }

    /**
     * V操作（释放）
     */
    public synchronized void vOperation() {
        if (semaphore == null) {
            addLog("错误: 信号量未初始化");
            return;
        }
        addLog("V操作: 信号量值=" + semaphore.getValue());
        semaphore.V();
        addLog("V操作完成: 信号量值=" + semaphore.getValue());
    }

    /**
     * 加锁
     */
    public void lockMutex() {
        if (mutex == null) {
            addLog("错误: 互斥锁未初始化");
            return;
        }
        addLog("请求加锁...");
        mutex.lock();
        addLog("加锁成功");
    }

    /**
     * 解锁
     */
    public void unlockMutex() {
        if (mutex == null) {
            addLog("错误: 互斥锁未初始化");
            return;
        }
        mutex.unlock();
        addLog("解锁成功");
    }

    /**
     * 发送消息
     */
    public void sendMessage(String message) {
        if (messageQueue == null) {
            addLog("错误: 消息队列未初始化");
            return;
        }
        messageQueue.send(message);
        addLog("发送消息: " + message);
    }

    /**
     * 接收消息
     */
    public String receiveMessage() {
        if (messageQueue == null) {
            addLog("错误: 消息队列未初始化");
            return null;
        }
        String msg = messageQueue.receive();
        addLog("接收消息: " + msg);
        return msg;
    }

    /**
     * 演示生产者消费者问题
     */
    public void startProducerConsumerDemo() {
        reset();
        initSemaphore(bufferSize);  // 空缓冲区
        initMutex();
        buffer = 0;
        producerCount = 0;
        consumerCount = 0;
        isRunning = true;

        addLog("=== 生产者消费者问题演示开始 ===");
        addLog("缓冲区大小: " + bufferSize);

        // 启动生产者线程
        new Thread(() -> {
            for (int i = 0; i < 10 && isRunning; i++) {
                try {
                    Thread.sleep(500);
                    pOperation();  // 等待空缓冲区
                    lockMutex();   // 进入临界区
                    buffer++;
                    producerCount++;
                    addLog("[生产者] 生产产品, 缓冲区: " + buffer);
                    unlockMutex(); // 离开临界区
                    vOperation();  // 释放满缓冲区
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
            addLog("[生产者] 生产完毕");
        }).start();

        // 启动消费者线程
        new Thread(() -> {
            for (int i = 0; i < 10 && isRunning; i++) {
                try {
                    Thread.sleep(800);
                    addLog("[消费者] 等待产品...");
                    lockMutex();   // 进入临界区
                    if (buffer > 0) {
                        buffer--;
                        consumerCount++;
                        addLog("[消费者] 消费产品, 缓冲区: " + buffer);
                    } else {
                        addLog("[消费者] 缓冲区为空，等待...");
                    }
                    unlockMutex(); // 离开临界区
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
            addLog("[消费者] 消费完毕");
        }).start();
    }

    /**
     * 演示哲学家就餐问题
     */
    public void startDiningPhilosophersDemo() {
        reset();
        isRunning = true;
        int philosopherCount = 5;

        addLog("=== 哲学家就餐问题演示开始 ===");
        addLog("哲学家数量: " + philosopherCount);

        // 5把叉子（互斥锁）
        Mutex[] forks = new Mutex[philosopherCount];
        for (int i = 0; i < philosopherCount; i++) {
            forks[i] = new Mutex("fork_" + i);
        }

        // 5个哲学家线程
        for (int i = 0; i < philosopherCount; i++) {
            final int id = i;
            new Thread(() -> {
                for (int j = 0; j < 3 && isRunning; j++) {
                    try {
                        addLog("[哲学家" + id + "] 思考中...");
                        Thread.sleep(1000);

                        addLog("[哲学家" + id + "] 饿了，请求叉子" + id + "和叉子" + ((id + 1) % philosopherCount));
                        forks[id].lock();
                        forks[(id + 1) % philosopherCount].lock();

                        addLog("[哲学家" + id + "] 正在进餐...");
                        Thread.sleep(1500);

                        forks[(id + 1) % philosopherCount].unlock();
                        forks[id].unlock();
                        addLog("[哲学家" + id + "] 进餐完毕，放下叉子");
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                }
                addLog("[哲学家" + id + "] 完成所有进餐");
            }).start();
        }
    }

    /**
     * 演示读者写者问题
     */
    public void startReaderWriterDemo() {
        reset();
        initMutex();
        isRunning = true;

        addLog("=== 读者写者问题演示开始 ===");

        // 模拟读者
        for (int i = 0; i < 3; i++) {
            final int id = i;
            new Thread(() -> {
                for (int j = 0; j < 3 && isRunning; j++) {
                    try {
                        Thread.sleep(800);
                        addLog("[读者" + id + "] 请求读取");
                        lockMutex();
                        addLog("[读者" + id + "] 正在读取...");
                        Thread.sleep(1000);
                        unlockMutex();
                        addLog("[读者" + id + "] 读取完毕");
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                }
            }).start();
        }

        // 模拟写者
        new Thread(() -> {
            for (int i = 0; i < 3 && isRunning; i++) {
                try {
                    Thread.sleep(1200);
                    addLog("[写者] 请求写入");
                    lockMutex();
                    addLog("[写者] 正在写入...");
                    Thread.sleep(1500);
                    unlockMutex();
                    addLog("[写者] 写入完毕");
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        }).start();
    }

    /**
     * 停止演示
     */
    public void stopDemo() {
        isRunning = false;
        addLog("=== 演示已停止 ===");
    }

    /**
     * 重置
     */
    public void reset() {
        isRunning = false;
        syncLog.clear();
        semaphore = null;
        mutex = null;
        messageQueue = null;
        buffer = 0;
        producerCount = 0;
        consumerCount = 0;
        addLog("系统已重置");
    }

    private void addLog(String message) {
        syncLog.add("[" + System.currentTimeMillis() % 10000 + "] " + message);
    }

    // Getters
    public List<String> getSyncLog() { return syncLog; }
    public int getBuffer() { return buffer; }
    public int getProducerCount() { return producerCount; }
    public int getConsumerCount() { return consumerCount; }
    public boolean isRunning() { return isRunning; }
    public int getSemaphoreValue() { return semaphore != null ? semaphore.getValue() : 0; }
    public boolean isMutexLocked() { return mutex != null && mutex.isLocked(); }
    public int getQueueSize() { return messageQueue != null ? messageQueue.size() : 0; }
}
