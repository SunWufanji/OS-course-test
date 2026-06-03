-- 进程调度模拟器数据库

CREATE DATABASE IF NOT EXISTS process_os;
USE process_os;

-- 1. 进程执行轨迹表
CREATE TABLE execution_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL COMMENT '模拟会话ID',
    pid INT NOT NULL COMMENT '进程ID',
    process_name VARCHAR(20) NOT NULL COMMENT '进程名',
    algorithm VARCHAR(20) NOT NULL COMMENT '调度算法',
    created_time INT COMMENT '创建时间点',
    ready_time INT COMMENT '进入就绪队列时间',
    start_time INT COMMENT '开始执行时间',
    end_time INT COMMENT '完成时间',
    blocked_time INT COMMENT '阻塞时间',
    burst_time INT COMMENT '执行时间',
    waiting_time INT COMMENT '等待时间',
    turnaround_time INT COMMENT '周转时间',
    completion_time INT COMMENT '完成时间点',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id),
    INDEX idx_algorithm (algorithm)
);

-- 2. 实验配置方案表
CREATE TABLE scenario_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    scenario_name VARCHAR(100) NOT NULL COMMENT '场景名称',
    description TEXT COMMENT '场景描述',
    process_count INT NOT NULL DEFAULT 5 COMMENT '进程数量',
    load_type ENUM('light', 'medium', 'heavy') DEFAULT 'medium' COMMENT '负载类型',
    config_json JSON NOT NULL COMMENT '进程配置JSON',
    is_default BOOLEAN DEFAULT FALSE COMMENT '是否默认场景',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. 调度结果评估表
CREATE TABLE performance_metrics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL COMMENT '模拟会话ID',
    algorithm VARCHAR(20) NOT NULL COMMENT '调度算法',
    scenario_id BIGINT COMMENT '场景ID',
    avg_turnaround DECIMAL(10,2) COMMENT '平均周转时间',
    avg_waiting DECIMAL(10,2) COMMENT '平均等待时间',
    avg_weighted_turnaround DECIMAL(10,2) COMMENT '平均带权周转时间',
    throughput DECIMAL(10,4) COMMENT '吞吐量',
    cpu_utilization DECIMAL(5,2) COMMENT 'CPU利用率',
    total_time INT COMMENT '总执行时间',
    completed_count INT COMMENT '完成进程数',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id),
    INDEX idx_algorithm (algorithm),
    FOREIGN KEY (scenario_id) REFERENCES scenario_config(id)
);

-- 4. 系统事件日志表（仿 Windows Event Viewer）
CREATE TABLE IF NOT EXISTS system_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    level VARCHAR(20) NOT NULL COMMENT '日志级别: INFO/SUCCESS/WARNING/ERROR',
    source VARCHAR(30) NOT NULL COMMENT '事件来源: PROCESS_MGR/MEMORY_MGR/LAB/SYNC/SYSTEM',
    message TEXT NOT NULL COMMENT '事件消息',
    pid INT COMMENT '关联进程PID',
    process_name VARCHAR(50) COMMENT '关联进程名',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_level (level),
    INDEX idx_source (source),
    INDEX idx_created (created_at)
);

-- 插入默认实验场景
INSERT INTO scenario_config (scenario_name, description, process_count, load_type, config_json, is_default) VALUES
('轻载场景', '少量短作业，适合测试基本调度功能', 3, 'light',
 '[{"name":"P1","burst":3,"priority":2,"arrival":0},{"name":"P2","burst":2,"priority":1,"arrival":1},{"name":"P3","burst":4,"priority":3,"arrival":2}]', TRUE),

('中载场景', '中等数量作业，标准测试场景', 5, 'medium',
 '[{"name":"P1","burst":6,"priority":3,"arrival":0},{"name":"P2","burst":4,"priority":1,"arrival":1},{"name":"P3","burst":2,"priority":4,"arrival":2},{"name":"P4","burst":3,"priority":2,"arrival":3},{"name":"P5","burst":5,"priority":5,"arrival":4}]', FALSE),

('重载场景', '大量作业，测试算法在高负载下的表现', 8, 'heavy',
 '[{"name":"P1","burst":8,"priority":2,"arrival":0},{"name":"P2","burst":5,"priority":1,"arrival":1},{"name":"P3","burst":3,"priority":4,"arrival":2},{"name":"P4","burst":6,"priority":3,"arrival":3},{"name":"P5","burst":4,"priority":5,"arrival":4},{"name":"P6","burst":7,"priority":2,"arrival":5},{"name":"P7","burst":2,"priority":1,"arrival":6},{"name":"P8","burst":5,"priority":3,"arrival":7}]', FALSE),

('CPU密集型', '长作业为主，测试SJF算法优势', 5, 'heavy',
 '[{"name":"Job1","burst":15,"priority":3,"arrival":0},{"name":"Job2","burst":12,"priority":2,"arrival":1},{"name":"Job3","burst":10,"priority":4,"arrival":2},{"name":"Job4","burst":8,"priority":1,"arrival":3},{"name":"Job5","burst":6,"priority":5,"arrival":4}]', FALSE),

('IO密集型', '短作业为主，测试RR算法优势', 6, 'light',
 '[{"name":"IO1","burst":2,"priority":1,"arrival":0},{"name":"IO2","burst":1,"priority":2,"arrival":0},{"name":"IO3","burst":3,"priority":1,"arrival":1},{"name":"IO4","burst":2,"priority":3,"arrival":2},{"name":"IO5","burst":1,"priority":2,"arrival":3},{"name":"IO6","burst":2,"priority":1,"arrival":4}]', FALSE);
