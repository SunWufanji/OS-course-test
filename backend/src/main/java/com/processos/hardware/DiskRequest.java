package com.processos.hardware;

/**
 * 磁盘 I/O 请求
 */
public class DiskRequest {

    private int pid;
    private int track;          // 目标磁道 (0-199)
    private String type;        // READ / WRITE
    private long arrivalTime;
    private boolean handled;

    public DiskRequest(int pid, int track, String type) {
        this.pid = pid;
        this.track = track;
        this.type = type;
        this.arrivalTime = System.currentTimeMillis();
        this.handled = false;
    }

    // Getters
    public int getPid() { return pid; }
    public int getTrack() { return track; }
    public String getType() { return type; }
    public long getArrivalTime() { return arrivalTime; }
    public boolean isHandled() { return handled; }
    public void setHandled(boolean handled) { this.handled = handled; }
}
