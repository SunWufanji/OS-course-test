package com.processos.model;

/**
 * IPC消息数据结构，没用到的数据结构
 */
public class IpcMessage {
    private int senderPid;
    private int receiverPid;
    private String content;
    private int timestamp;

    public IpcMessage() {}

    public IpcMessage(int senderPid, int receiverPid, String content, int timestamp) {
        this.senderPid = senderPid;
        this.receiverPid = receiverPid;
        this.content = content;
        this.timestamp = timestamp;
    }

    public int getSenderPid() { return senderPid; }
    public void setSenderPid(int senderPid) { this.senderPid = senderPid; }

    public int getReceiverPid() { return receiverPid; }
    public void setReceiverPid(int receiverPid) { this.receiverPid = receiverPid; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public int getTimestamp() { return timestamp; }
    public void setTimestamp(int timestamp) { this.timestamp = timestamp; }
}
