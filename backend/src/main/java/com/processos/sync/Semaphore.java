package com.processos.sync;

/**
 * 信号量
 */
public class Semaphore {
    private int value;
    private String name;

    public Semaphore(String name, int initialValue) {
        this.name = name;
        this.value = initialValue;
    }

    public synchronized void P() {
        value--;
        if (value < 0) {
            try {
                wait();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }

    public synchronized void V() {
        value++;
        if (value <= 0) {
            notify();
        }
    }

    public synchronized int getValue() {
        return value;
    }

    public String getName() {
        return name;
    }
}
