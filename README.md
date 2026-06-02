# ProcessOS — 进程调度可视化模拟器

> 操作系统课程设计 - React + Spring Boot 前后端分离架构

## 项目简介

本系统模拟操作系统的进程管理功能，实现了进程的创建、调度、同步和通信。采用React前端 + Spring Boot后端的现代化架构。

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 18 + Vite + Axios |
| **后端** | Java 17 + Spring Boot 3.2 |
| **通信** | RESTful API + JSON |

## 功能特性

### 进程管理
- ✅ 进程创建（名称、执行时间、优先级、到达时间）
- ✅ 进程删除
- ✅ 进程挂起
- ✅ 进程恢复
- ✅ 进程状态转换（新建→就绪→运行→阻塞→结束）

### 调度算法
- ✅ FCFS（先来先服务）
- ✅ SJF（短作业优先）
- ✅ RR（时间片轮转）
- ✅ Priority（优先级调度）

### 可视化
- ✅ 进程状态流转图（动态高亮）
- ✅ CPU调度甘特图（实时更新）
- ✅ 进程监控表格（11列详细信息）
- ✅ 调度统计（平均周转、等待、CPU利用率）

### 同步机制
- ✅ 信号量（Semaphore）
- ✅ 互斥锁（Mutex）
- ✅ 消息队列（MessageQueue）

## 项目结构

```
OS-course-test/
├── backend/                          # Spring Boot后端
│   ├── pom.xml                       # Maven配置
│   └── src/main/java/com/processos/
│       ├── ProcessOsApplication.java # 主类
│       ├── model/                    # 数据模型
│       │   ├── ProcessControlBlock.java
│       │   └── ProcessState.java
│       ├── scheduler/                # 调度算法
│       │   ├── Scheduler.java
│       │   ├── FCFSScheduler.java
│       │   ├── SJFScheduler.java
│       │   ├── RoundRobinScheduler.java
│       │   └── PriorityScheduler.java
│       ├── sync/                     # 同步机制
│       │   ├── Semaphore.java
│       │   ├── Mutex.java
│       │   └── MessageQueue.java
│       ├── service/                  # 业务逻辑
│       │   └── ProcessService.java
│       └── controller/               # REST API
│           └── ProcessController.java
│
├── frontend/                         # React前端
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       └── index.css
│
└── README.md
```

## 快速开始

### 1. 启动后端

```bash
cd backend

# 方式1：使用Maven
mvn spring-boot:run

# 方式2：打包后运行
mvn clean package
java -jar target/process-os-1.0.0.jar
```

后端运行在 http://localhost:8080

### 2. 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端运行在 http://localhost:3000

### 3. 访问应用

打开浏览器访问 http://localhost:3000

## API接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/processes | 获取所有进程 |
| POST | /api/processes | 创建进程 |
| DELETE | /api/processes/{pid} | 删除进程 |
| POST | /api/processes/{pid}/suspend | 挂起进程 |
| POST | /api/processes/{pid}/resume | 恢复进程 |
| POST | /api/tick | 执行一步 |
| POST | /api/reset | 重置系统 |
| POST | /api/demo | 加载演示 |
| POST | /api/scheduler | 设置调度算法 |
| POST | /api/quantum | 设置时间片 |

## 使用说明

1. **创建进程**：在左侧输入进程参数，点击"创建进程"
2. **加载演示**：点击"演示"按钮快速创建5个示例进程
3. **选择算法**：点击算法按钮切换调度算法
4. **开始模拟**：点击"开始模拟"自动执行，或点击"单步"逐步执行
5. **查看结果**：观察甘特图、统计信息、状态流转图

## 验收表填写

| 项目 | 内容 |
|------|------|
| 项目名称 | 进程管理系统 |
| 语言/工具 | Java 17 + React 18 + Spring Boot 3.2 |
| 主要数据结构 | PCB、就绪队列、阻塞队列、消息队列 |
| 算法 | FCFS、SJF、RR、优先级调度 |
| 展示方式 | 可视化图形界面 |
| 实现方式 | 完全重写 |

## 作者

操作系统课程设计 2026
