# ProcessOS — 操作系统进程管理模拟器

> 仿 macOS 风格的 WebOS 操作系统模拟器，涵盖进程调度、内存管理、同步互斥等操作系统核心概念

## 项目简介

ProcessOS 是一个完整的操作系统进程管理模拟器，采用 React 前端 + Spring Boot 后端的现代化架构。项目以仿 macOS 桌面为界面，用户可以像使用真实操作系统一样创建进程、管理资源、运行调度算法，直观感受操作系统的工作原理。

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **前端** | React + Vite + Axios | React 18 / Vite 5 |
| **后端** | Java + Spring Boot + JPA | Java 17 / Spring Boot 3.5 |
| **数据库** | MySQL + Hibernate | MySQL 8.0 |
| **构建工具** | Maven + npm | Maven 3.9 |

## 功能特性

### 🖥️ macOS 桌面系统
- 仿 macOS 极简桌面，高清壁纸
- 底部 Dock 栏，悬停放大动效
- 顶部菜单栏，点击弹出系统控制中心
- 红绿灯窗口控制（左上角关闭/最小化/最大化）
- 窗口拖拽、全屏、Dock 自动隐藏
- 应用启动器（搜索 + 分类）

### ⚙️ 任务管理器
- 进程列表（可排序、搜索、分页）
- 赛博朋克 HUD 风格性能监控
- 圆形仪表盘（CPU/内存）
- 波形图（30秒历史趋势）
- 核心柱状图（Equalizer）
- 内存乐高方块可视化

### 🧪 内核算法实验室
- 7 种调度算法：FCFS、SJF、SRTN、RR、优先级、抢占式优先级、MFQ
- 甘特图动画（扫描线效果）
- 进程树（父子进程折叠显示）
- 同步互斥演示（生产者消费者、哲学家就餐、读者写者）
- 实验场景（轻载/中载/重载/CPU密集/IO密集）
- 数据库持久化（历史记录 + 场景配置）

### 📋 系统日志
- 仿 Windows Event Viewer
- 4 级日志（INFO/SUCCESS/WARNING/ERROR）
- 按级别/来源筛选
- 关键词搜索
- 分页加载
- 实时刷新
- CSV 导出

### 💻 硬件资源模拟
- 多核 CPU（8核，支持核心绑定）
- 内存管理（16GB，首次适应算法）
- IO 设备（磁盘读写、网络传输）
- 15 种预设应用（CS:GO、Chrome、VSCode 等）
- 资源抖动模拟（每秒随机波动）

### 🔄 进程管理
- 创建/删除/挂起/恢复进程
- 单实例检测（游戏类应用）
- 自动 fork 子进程
- 进程树展示
- 结束时连带终止子进程

## 项目结构

```
OS-course-test/
├── backend/                              # Spring Boot 后端
│   ├── pom.xml
│   └── src/main/java/com/processos/
│       ├── ProcessOsApplication.java     # 主类 + 定时任务
│       ├── model/                        # 数据模型
│       │   ├── ProcessControlBlock.java  # PCB（支持沙盒模式）
│       │   ├── ProcessState.java         # 进程状态枚举
│       │   ├── SimulatedApp.java         # 15种模拟应用
│       │   ├── SystemEvent.java          # 系统事件日志
│       │   ├── ExecutionLog.java         # 执行轨迹（MySQL）
│       │   ├── PerformanceMetrics.java   # 性能指标（MySQL）
│       │   └── ScenarioConfig.java       # 实验场景（MySQL）
│       ├── hardware/                     # 硬件资源管理
│       │   ├── HardwarePool.java         # CPU/内存/IO 资源池
│       │   └── MemoryBlock.java          # 内存块（首次适应算法）
│       ├── process/                      # 进程管理
│       │   └── ProcessManager.java       # 沙盒进程管理器
│       ├── scheduler/                    # 调度算法
│       │   ├── Scheduler.java            # 调度器接口
│       │   ├── FCFSScheduler.java        # 先来先服务
│       │   ├── SJFScheduler.java         # 短作业优先
│       │   ├── SRTNScheduler.java        # 最短剩余时间优先
│       │   ├── RoundRobinScheduler.java  # 时间片轮转
│       │   ├── PriorityScheduler.java    # 非抢占优先级
│       │   ├── PreemptivePriorityScheduler.java  # 抢占式优先级
│       │   └── MFQScheduler.java         # 多级反馈队列
│       ├── sync/                         # 同步机制
│       │   ├── Semaphore.java            # 信号量
│       │   ├── Mutex.java                # 互斥锁
│       │   └── MessageQueue.java         # 消息队列
│       ├── service/                      # 业务逻辑
│       │   ├── ProcessService.java       # 核心调度服务
│       │   ├── SystemEventService.java   # 系统事件日志服务
│       │   └── SyncDemoService.java      # 同步互斥演示
│       ├── controller/                   # REST API
│       │   ├── ProcessController.java    # 调度算法 API
│       │   ├── SystemController.java     # 沙盒系统 API
│       │   ├── SystemLogController.java  # 系统日志 API
│       │   └── LabController.java        # 实验室模拟 API
│       └── repository/                   # 数据访问
│           ├── ExecutionLogRepository.java
│           ├── PerformanceMetricsRepository.java
│           └── ScenarioConfigRepository.java
│
├── frontend/                             # React 前端
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx                       # 桌面系统入口
│       ├── index.css                     # 全局样式（毛玻璃 + macOS）
│       └── components/
│           ├── Desktop/                  # 桌面系统组件
│           │   ├── Desktop.jsx           # 桌面（壁纸）
│           │   ├── TaskBar.jsx           # 菜单栏 + Dock 栏
│           │   ├── Window.jsx            # 窗口（红绿灯）
│           │   ├── DesktopIcon.jsx       # 桌面图标
│           │   ├── DesktopWidget.jsx     # 桌面小部件
│           │   ├── ControlCenter.jsx     # 控制中心
│           │   └── AppLauncher.jsx       # 应用启动器
│           ├── TaskManager/              # 任务管理器
│           │   └── TaskManager.jsx       # 进程列表 + HUD 性能监控
│           ├── SchedulerLab/             # 内核算法实验室
│           │   ├── SchedulerLab.jsx      # 旧版全部功能
│           │   └── GanttPanel.jsx        # 底部甘特图浮动面板
│           ├── KernelLab/               # 实验室组件（独立版）
│           └── SystemLog/               # 系统事件查看器
│               └── SystemLogViewer.jsx
│
├── os-courseobsidian/                    # 课设文档（Obsidian）
│   ├── 01-项目概览.md
│   ├── 02-文件结构.md
│   ├── 03-功能清单.md
│   ├── 04-快速开始.md
│   ├── 05-技术架构.md
│   ├── 06-界面说明.md
│   └── 07-验收与答辩.md
│
└── README.md
```

## 快速开始

### 环境要求

| 工具 | 版本 |
|------|------|
| JDK | 17+ |
| Maven | 3.6+ |
| Node.js | 18+ |
| MySQL | 8.0 |

### 1. 数据库初始化

```bash
mysql -u root -p < backend/src/main/resources/schema.sql
```

默认账号：root / 123456

### 2. 启动后端

```bash
cd backend
mvn spring-boot:run
```

后端运行在 http://localhost:9090

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端运行在 http://localhost:3000

### 4. 访问系统

打开浏览器访问 http://localhost:3000

## API 接口

### 系统管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/system/status | 系统状态（CPU/内存/IO） |
| GET | /api/system/apps | 可用应用列表 |
| POST | /api/system/reset | 重置沙盒 |

### 进程管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/process/sandbox | 沙盒进程列表 |
| POST | /api/process/launch | 启动应用 |
| POST | /api/process/{pid}/terminate | 结束进程 |
| POST | /api/process/{pid}/suspend | 挂起进程 |
| POST | /api/process/{pid}/resume | 恢复进程 |
| GET | /api/process/tree | 进程树 |

### 调度算法
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/processes | 获取调度进程 |
| POST | /api/processes | 创建调度进程 |
| POST | /api/tick | 推进时间 |
| POST | /api/scheduler | 切换算法 |
| POST | /api/demo | 加载演示 |
| POST | /api/lab/simulate | 运行调度模拟 |

### 系统日志
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/events | 查询日志（分页/筛选/搜索） |
| GET | /api/events/latest | 最新日志 |
| GET | /api/events/stats | 日志统计 |
| DELETE | /api/events | 清空日志 |

## 系统架构

```
┌─────────────────────────────────────────────────┐
│           前端 (React + Vite)                     │
│  ┌─────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Desktop │ │TaskManager│ │  SchedulerLab    │  │
│  │ (macOS) │ │ (HUD)    │ │  (算法实验室)     │  │
│  └─────────┘ └──────────┘ └──────────────────┘  │
└───────────────────┬─────────────────────────────┘
                    │ REST API
┌───────────────────┴─────────────────────────────┐
│           后端 (Spring Boot)                      │
│  ┌────────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Controller │ │ Service  │ │  Repository   │  │
│  └─────┬──────┘ └────┬─────┘ └──────┬────────┘  │
│        │             │              │            │
│  ┌─────┴──────┐ ┌────┴─────┐ ┌─────┴─────────┐ │
│  │ Scheduler  │ │ Hardware │ │    MySQL      │ │
│  │ (7种算法)  │ │  Pool   │ │  (持久化)     │ │
│  └────────────┘ └──────────┘ └───────────────┘ │
└─────────────────────────────────────────────────┘
```

## 双模架构

### 沙盒模式（Live System）
用户在桌面双击图标启动应用 → 后端创建进程 → 实时模拟 CPU/内存/IO 资源占用 → 前端任务管理器展示

### 实验室模式（Lab Mode）
用户在实验室配置进程参数和算法 → 后端一次性计算完整甘特图 → 前端动画播放 → 适合演示调度算法

## 验收表

| 项目 | 内容 |
|------|------|
| 项目名称 | ProcessOS — 操作系统进程管理模拟器 |
| 语言/工具 | Java 17 + React 18 + Spring Boot 3.5 + MySQL 8.0 |
| 主要数据结构 | PCB、就绪队列、阻塞队列、内存块、进程树 |
| 调度算法 | FCFS、SJF、SRTN、RR、优先级、抢占式优先级、MFQ |
| 同步机制 | 信号量、互斥锁、消息队列 |
| 展示方式 | 仿 macOS 桌面 + 赛博朋克 HUD + 甘特图动画 |
| 实现方式 | 完全重写 |

## 作者

操作系统课程设计 2026
