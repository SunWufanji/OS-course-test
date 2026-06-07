# SyncLabController.java — 同步互斥实验室 API

**包路径：** `com.processos.controller.SyncLabController`
**请求前缀：** `/api/sync-lab`
**自动注入：** `SyncDemoService`（同步演示业务逻辑）

---

## 职责

提供**三道经典同步互斥问题**的交互式演示 API。前端实验室页面按步骤操作（初始化 → 逐步执行），后端维护每道题的状态。

所有演示都是**手动步进**的——前端点击"生产者生产"→ 后端执行一步 → 返回新状态 → 前端刷新显示。不自动运行。

---

## 端点详解

### 1. 生产者消费者（Producer-Consumer）

#### `POST /api/sync-lab/pc/init`
初始化生产者消费者场景：创建共享缓冲区（有限容量）、信号量（empty/full/mutex）。

#### `POST /api/sync-lab/pc/start`
启动多线程生产消费。参数：`{producers: 2, consumers: 2}`。创建生产者线程和消费者线程，开始自动运行（前端观察状态变化）。

#### `POST /api/sync-lab/pc/stop`
停止生产消费线程。

#### `GET /api/sync-lab/pc/status`
获取当前状态：缓冲区内容、生产/消费计数、各线程状态。

### 2. 读者写者（Reader-Writer）

#### `POST /api/sync-lab/rw/init`
初始化读者写者场景：创建共享数据区、读写锁。

#### `POST /api/sync-lab/rw/read/{index}`
第 index 个读者开始读。如果当前有写者，读者可能需要等待（取决于读写锁策略）。

#### `POST /api/sync-lab/rw/read-finish/{index}`
第 index 个读者结束读。

#### `POST /api/sync-lab/rw/write/{index}`
第 index 个写者开始写。如果当前有读者，写者等待（写者优先或公平策略）。

#### `POST /api/sync-lab/rw/write-finish/{index}`
第 index 个写者结束写。

#### `GET /api/sync-lab/rw/status`
获取当前状态：共享数据、活跃读者/写者、等待队列。

### 3. 哲学家用餐（Dining Philosophers）

#### `POST /api/sync-lab/dp/init`
初始化 5 位哲学家：每人处于"思考"状态，筷子（互斥信号量）全部可用。

#### `POST /api/sync-lab/dp/hungry/{id}`
第 id 位哲学家进入"饥饿"状态，尝试拿筷子。

#### `POST /api/sync-lab/dp/eat/{id}`
第 id 位哲学家开始吃饭（已拿到两支筷子）。

#### `POST /api/sync-lab/dp/put/{id}`
第 id 位哲学家放下筷子，回到"思考"状态。

#### `POST /api/sync-lab/dp/deadlock`
触发**死锁**演示：让每位哲学家都拿起左边筷子，导致所有人等待右边筷子。

#### `POST /api/sync-lab/dp/strategy/{strategy}`
切换死锁预防策略。参数值：
- `"none"`：无预防（可能死锁）
- `"resource_hierarchy"`：资源顺序法（给筷子编号，必须从小到大拿）
- `"chandy_misra"`：Chandy/Misra 算法（筷子是请求消息）

#### `POST /api/sync-lab/dp/reset`
重置哲学家状态（回到全部思考）。

#### `GET /api/sync-lab/dp/status`
获取当前状态：每位哲学家的状态（思考/饥饿/吃饭）、筷子占用情况。

### 4. 通用

#### `GET /api/sync-lab/log`
获取操作日志列表（所有演示的执行记录）。

#### `DELETE /api/sync-lab/log`
清空操作日志。

---

## 调用关系

```
SyncLabController
    │
    └── SyncDemoService
            │
            ├── initProducerConsumer() / startProducerConsumer()
            ├── initReaderWriter() / readerStep() / writerStep()
            ├── initDiningPhilosophers() / philosopherGetHungry() / eat() / ...
            └── getLog() / clearLog()
```

---

## 特殊逻辑说明

- **手动步进模式**：除了生产者消费者支持自动多线程运行外，读者写者和哲学家用餐都是**手动点击操作**的，每次调用执行一步同步原语。
- **死锁演示**：`/dp/deadlock` 是特意设计来演示死锁的——让所有哲学家同时拿左边筷子，形成循环等待。配合不同的 `strategy` 参数可以看到不同预防策略的效果。
- **无状态 init**：每个场景的 `init` 端点会重置状态，多次调用是安全的。
