package com.processos.sync;

/**
 * 互斥锁
 */
public class Mutex {
    private boolean locked;
    private String name;

    public Mutex(String name) {
        this.name = name;
        this.locked = false;
    }

    public synchronized void lock() {
        while (locked) {
            try {
                wait();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        locked = true;
    }

    public synchronized void unlock() {
        locked = false;
        notify();
    }

    public synchronized boolean isLocked() {
        return locked;
    }

    public String getName() {
        return name;
    }
}
