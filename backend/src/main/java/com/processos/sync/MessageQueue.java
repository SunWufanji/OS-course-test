package com.processos.sync;

import java.util.LinkedList;
import java.util.Queue;

/**
 * 消息队列
 */
public class MessageQueue {
    private Queue<String> queue;
    private String name;
    private int maxSize;

    public MessageQueue(String name, int maxSize) {
        this.name = name;
        this.maxSize = maxSize;
        this.queue = new LinkedList<>();
    }

    public synchronized void send(String message) {
        while (queue.size() >= maxSize) {
            try {
                wait();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        queue.offer(message);
        notify();
    }

    public synchronized String receive() {
        while (queue.isEmpty()) {
            try {
                wait();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        String message = queue.poll();
        notify();
        return message;
    }

    public synchronized int size() {
        return queue.size();
    }

    public String getName() {
        return name;
    }
}
