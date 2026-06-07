# ProcessState.java — 进程状态枚举

**包路径：** `com.processos.model.ProcessState`

---

## 职责

定义进程的**5 种基本状态**，是 PCB 中 `state` 字段的类型。

---

## 枚举值

| 常量 | 中文名 | 说明 |
|------|--------|------|
| `CREATED` | 新建 | 进程刚被创建，尚未进入就绪队列 |
| `READY` | 就绪 | 已在就绪队列中，等待 CPU 调度 |
| `RUNNING` | 运行 | 正在 CPU 上执行 |
| `BLOCKED` | 阻塞 | 因等待资源（内存、打印机、IPC 消息等）而暂停 |
| `TERMINATED` | 结束 | 进程执行完毕或被终止 |

---

## 状态转换图

```
CREATED ──→ READY ──→ RUNNING ──→ TERMINATED
              ↑          │
              │          ↓
              │   （时间片用完→就绪 / 被抢占）
              │
              │    BLOCKED
              │       ↑
              └───────┘
          （资源就绪→唤醒）
```

---

## 字段

```java
private final String chineseName;
```

每个枚举值带一个中文名称，用于前端显示。如 `RUNNING.getChineseName()` → `"运行"`。

---

## 特殊逻辑

- **简化状态模型**：没有 SUSPENDED/BLOCKED_SUSPENDED 状态。挂起进程直接用 `BLOCKED` + `blockedReason="挂起"` 实现。
- **chineseName**：在 `ProcessController` 和前端渲染时使用，避免在前端硬编码中文状态名。
