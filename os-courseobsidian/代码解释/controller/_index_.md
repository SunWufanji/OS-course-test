# Controller 层 — 总览

**包路径：** `com.processos.controller`
**共 6 个文件**

---

## 职责

Controller 是 **Spring Boot MVC 的 REST API 入口层**。每个 Controller 是一个 `@RestController`，每个方法对应一个 HTTP 端点（Endpoint）。前端（React）通过 axios 调用这些端点来读写后端数据。

**核心原则：** Controller 只负责接收请求、转发给 Service/Manager、返回 JSON。不包含业务逻辑。

---

## 文件一览

| 文件 | 请求前缀 | 职责 |
|------|---------|------|
| [SystemController](SystemController.md) | `/api` | **沙盒主控** — 启动/结束/挂起/恢复进程，暂停/单步，系统状态 |
| [ProcessController](ProcessController.md) | `/api` | **算法实验室** — tick/算法切换/场景/历史/持久化 |
| [IoController](IoController.md) | `/api/io` | **I/O 设备管理** — 打印机/U盘/音频/磁盘调度 |
| [LabController](LabController.md) | `/api/lab` | **算法模拟器** — 一次跑完整模拟返回甘特图 |
| [SyncLabController](SyncLabController.md) | `/api/sync-lab` | **同步互斥实验室** — 生产者消费者/读者写者/哲学家 |
| [SystemLogController](SystemLogController.md) | `/api/events` | **系统日志** — 分页查询/筛选/实时刷新/统计 |

---

## 架构关系

```
React 前端
    │
    ├── 桌面沙盒 ────────── SystemController
    ├── 算法实验室 ──────── ProcessController + LabController
    ├── I/O 设备 ────────── IoController
    ├── 同步实验室 ──────── SyncLabController
    └── 系统日志 ────────── SystemLogController
                              │
                     ┌───────┴───────┐
                  Service/Manager   JPA Repository
                   (业务逻辑)        (数据库)
```

---

## 通用模式

每个 Controller 遵循相同的代码结构：

```java
@RestController                 // 声明 REST API
@RequestMapping("/api/xxx")     // URL 前缀
@CrossOrigin(origins = "*")     // 跨域支持
public class XxxController {

    @Autowired                  // 注入依赖
    private XxxService xxxService;

    @PostMapping("/action")
    public Map<String, Object> action(@RequestBody Map<String, Object> req) {
        // 1. 解析请求参数
        int pid = (int) req.get("pid");
        // 2. 调用业务层
        boolean ok = xxxService.doSomething(pid);
        // 3. 封装 JSON 返回
        Map<String, Object> result = new HashMap<>();
        result.put("success", ok);
        return result;
    }
}
```

---

## 关键字段命名约定

- `success` (boolean) — 操作是否成功
- `message` (String) — 操作结果描述
- `pid` (int) — 进程 ID
- `alreadyRunning` (boolean) — 单实例应用是否已在运行
- `waitingMemory` (boolean) — 是否因内存不足进入阻塞等待
