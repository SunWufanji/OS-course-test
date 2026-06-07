package com.processos.service;

import com.processos.model.IpcMessage;
import com.processos.model.ProcessControlBlock;

import java.util.*;

/**
 * IPC消息传递管理器
 * 管理进程间的消息发送/接收、阻塞/唤醒
 */
public class IpcManager {

    // 正在等待接收消息的进程
    private final Map<Integer, ProcessControlBlock> waitingReceivers = new HashMap<>();

    // 消息历史记录
    private final List<Map<String, Object>> messageHistory = new ArrayList<>();

    /**
     * SEND指令处理：发送消息给目标进程
     * @param message 消息对象
     * @param sender 发送方PCB
     * @param allProcesses 所有进程列表（用于查找接收方）
     * @return true=投递成功, false=发送方应阻塞（接收方缓冲满）
     */
    public boolean send(IpcMessage message, ProcessControlBlock sender, List<ProcessControlBlock> allProcesses) {
        ProcessControlBlock receiver = allProcesses.stream()
                .filter(p -> p.getPid() == message.getReceiverPid())
                .findFirst().orElse(null);

        if (receiver == null) return false;

        // 如果接收方正在等待消息，直接投递并唤醒
        if (waitingReceivers.containsKey(receiver.getPid())) {
            receiver.getMessageBuffer().add(message.getContent());
            waitingReceivers.remove(receiver.getPid());
            receiver.setWaitingForMessage(false);
            recordHistory(message);
            return true;
        }

        // 如果接收方缓冲区满，发送方阻塞
        if (receiver.getMessageBuffer().size() >= receiver.getMessageBufferSize()) {
            return false;
        }

        // 投递到接收方缓冲区
        receiver.getMessageBuffer().add(message.getContent());
        recordHistory(message);
        return true;
    }

    /**
     * RECEIVE指令处理：尝试接收一条消息
     * @param receiver 接收方PCB
     * @return true=成功接收, false=无消息，接收方应阻塞
     */
    public boolean receive(ProcessControlBlock receiver) {
        if (!receiver.getMessageBuffer().isEmpty()) {
            receiver.getMessageBuffer().remove(0); // 消费最早的消息
            return true;
        }
        // 无消息可用，注册为等待者
        waitingReceivers.put(receiver.getPid(), receiver);
        receiver.setWaitingForMessage(true);
        return false;
    }

    /**
     * 中断处理阶段调用：检查是否有等待中的接收者可以被唤醒
     * @return 应被唤醒的进程PID列表
     */
    public List<Integer> checkWokenReceivers() {
        List<Integer> woken = new ArrayList<>();
        Iterator<Map.Entry<Integer, ProcessControlBlock>> it = waitingReceivers.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<Integer, ProcessControlBlock> entry = it.next();
            if (!entry.getValue().getMessageBuffer().isEmpty()) {
                woken.add(entry.getKey());
                entry.getValue().setWaitingForMessage(false);
                it.remove();
            }
        }
        return woken;
    }

    /**
     * 获取等待接收的进程列表
     */
    public Map<Integer, ProcessControlBlock> getWaitingReceivers() {
        return Collections.unmodifiableMap(waitingReceivers);
    }

    /**
     * 获取消息历史
     */
    public List<Map<String, Object>> getMessageHistory() {
        return Collections.unmodifiableList(messageHistory);
    }

    private void recordHistory(IpcMessage message) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("senderPid", message.getSenderPid());
        entry.put("receiverPid", message.getReceiverPid());
        entry.put("content", message.getContent());
        entry.put("timestamp", message.getTimestamp());
        messageHistory.add(entry);
        if (messageHistory.size() > 100) {
            messageHistory.remove(0);
        }
    }
}
