# ProcessOS — 操作系统进程管理模拟器

> 仿 macOS 风格的 WebOS，完整模拟进程调度、内存管理、IPC 通信、设备互斥等操作系统核心机制

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端 | React + Vite + Axios | React 18 / Vite 5 |
| 后端 | Java + Spring Boot + JPA | Java 17 / Spring Boot 3.5 |
| 数据库 | MySQL + Hibernate | MySQL 8.0 |
| 构建 | Maven + npm | Maven 3.9 |

## 功能概览

### 桌面系统
- 仿 macOS 极简桌面，多张高清壁纸
- 底部 Dock 栏（悬停放大）+ 顶部菜单栏
- 红绿灯窗口控制、拖拽、最大化
- 应用启动器（搜索 + 分类）
- 控制中心

### 进程调度（沙盒模式）
- MLFQ 三级反馈队列（Q0/Q1/Q2，时间片 8/10/16）
- 老化机制（低队列等待超阈值自动升级）
- 高优先级进程到达时抢占 CPU
- 暂停 / 单步执行 / 自动单步模式
- 19 种预设应用，各自有真实代码段和资源需求

### IPC 消息传递演示
- `IPC-发送方` 执行到 `SEND` 发出请求，`RECV` 等回复 → 进入 BLOCKED 队列
- `IPC-接收方` 执行 `RECV` 接收，`SEND` 回复 → 自动唤醒发送方回 Q1 继续运行
- 中断日志实时记录消息投递和唤醒过程

### 打印机互斥演示
- `打印-先行者` 执行 `P_PRINTER` 独占打印机，挂起也不释放
- `打印-等待者` 执行 `P_PRINTER` 申请失败 → BLOCKED（"等待打印机"）
- 先行者 `V_PRINTER` 或完全终止后，等待者自动从 BLOCKED 唤醒回 Q1
- 体现"程序（静态）vs 进程（动态）"与设备互斥核心概念

### 交互式终端
- 桌面启动器点击"终端"打开命令行窗口（不占进程槽）
- 支持命令：`ps` / `ls apps` / `launch` / `kill` / `suspend` / `resume` / `pause` / `step` / `autopause` / `status` / `clear`
- 方向键历史回溯，颜色区分命令/成功/错误/信息

### 任务管理器
- 进程列表（PID / 状态 / 内存 / 设备占用）
- 赛博朋克 HUD 性能监控（CPU/内存仪表盘、波形图、内存乐高方块）
- 内核面板：MLFQ 队列状态、中断日志、调度分数

### 内核算法实验室
- 7 种调度算法：FCFS、SJF、SRTN、RR、优先级、抢占式优先级、MFQ
- 甘特图动画（扫描线效果）
- 同步互斥演示（生产者消费者、哲学家就餐、读者写者）
- 实验场景（轻载/中载/重载/CPU密集/IO密集）
- 历史记录持久化到 MySQL

### 系统日志
- 4 级日志（INFO/SUCCESS/WARNING/ERROR）
- 按级别/来源筛选、关键词搜索、CSV 导出

## 快速开始

### 环境要求

| 工具 | 版本 |
|------|------|
| JDK | 17+ |
| Maven | 3.6+ |
| Node.js | 18+ |
| MySQL | 8.0 |

### 启动

```bash
# 1. 初始化数据库
mysql -u root -p < backend/src/main/resources/schema.sql

# 2. 启动后端（http://localhost:9090）
cd backend
mvn spring-boot:run

# 3. 启动前端（http://localhost:3000）
cd frontend
npm install
npm run dev
```

默认数据库账号：root / 123456

## 架构

```
┌─────────────────────────────────────────────────────┐
│                  前端 React + Vite                    │
│  Desktop  │  TaskManager  │  SchedulerLab  │  Terminal│
└─────────────────────┬───────────────────────────────┘
                      │  REST /api/*
┌─────────────────────┴───────────────────────────────┐
│                 后端 Spring Boot                      │
│                                                      │
│  ProcessManager (MLFQ)                               │
│    ├─ CpuCore  — 执行指令 (MOV/ADD/SEND/RECV/        │
│    │             P_PRINTER/V_PRINTER/HALT)           │
│    ├─ IpcCallback — 消息投递 + 设备申请/释放 + 唤醒  │
│    └─ HardwarePool — CPU核心 / 内存 / IO设备         │
│                                                      │
│  IoManager — ExclusiveDevice (打印机/USB独占队列)    │
│  SystemEventService — 日志                          │
│  MySQL — 执行记录 / 性能指标 / 场景配置              │
└─────────────────────────────────────────────────────┘
```

## 双模架构

**沙盒模式（Live System）**：用户在桌面启动应用 → 后端创建 PCB，分配内存和 CPU 核心 → MLFQ 实时调度 → 前端 300ms 轮询展示状态变化

**实验室模式（Lab Mode）**：配置进程参数和算法 → 后端一次性计算完整甘特图 → 前端动画回放 → 适合对比不同调度算法

## API

### 系统
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/system/status | 硬件状态 |
| GET | /api/system/apps | 可用应用列表 |
| GET | /api/system/scheduler | 队列状态 |
| POST | /api/system/pause | 切换暂停 |
| POST | /api/system/step | 单步执行 |
| POST | /api/system/auto-pause | 切换单步模式 |
| POST | /api/system/run | 推进一个 tick |
| POST | /api/system/reset | 重置沙盒 |

### 进程
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/process/sandbox | 进程列表 |
| POST | /api/process/launch | 启动应用 |
| POST | /api/process/{pid}/terminate | 结束进程 |
| POST | /api/process/{pid}/suspend | 挂起 |
| POST | /api/process/{pid}/resume | 恢复 |
| GET | /api/process/tree | 进程树 |

### 实验室
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/tick | 推进时间（旧版） |
| POST | /api/scheduler | 切换算法 |
| POST | /api/lab/simulate | 运行模拟 |
| GET | /api/events | 系统日志（分页） |

## 演示进程说明

| 应用 | 场景 | 关键指令 | 演示要点 |
|------|------|----------|----------|
| IPC-发送方 | IPC 消息传递 | SEND / RECV | 等待回复期间进入 BLOCKED |
| IPC-接收方 | IPC 消息传递 | RECV / SEND | 回复后唤醒发送方 |
| 打印-先行者 | 设备互斥 | P_PRINTER / V_PRINTER | 独占打印机，挂起不释放 |
| 打印-等待者 | 设备互斥 | P_PRINTER | 被阻塞，等先行者终止后唤醒 |

## 验收信息

| 项目 | 内容 |
|------|------|
| 项目名称 | ProcessOS — 操作系统进程管理模拟器 |
| 语言/框架 | Java 17 + React 18 + Spring Boot 3.5 + MySQL 8.0 |
| 核心数据结构 | PCB、MLFQ三级队列、阻塞队列、内存块、进程树 |
| 调度算法 | FCFS、SJF、SRTN、RR、优先级、抢占式优先级、MFQ |
| 同步/通信机制 | 信号量、互斥锁、消息队列、IPC消息传递、设备互斥 |
| 展示方式 | 仿 macOS 桌面 + 赛博朋克 HUD + 甘特图动画 + 交互终端 |

操作系统课程设计 2026
