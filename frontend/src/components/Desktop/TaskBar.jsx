import React, { useState, useEffect } from 'react'

/**
 * 任务栏组件 - 仿 Windows 任务栏
 */
function TaskBar({ windows, activeWindowId, systemStatus, runningProcesses, onActivateWindow, onOpenTaskManager, onReset }) {
  const [time, setTime] = useState(new Date())
  const [showStartMenu, setShowStartMenu] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const cpuUsage = systemStatus?.totalCpuUsage?.toFixed(0) || 0
  const memUsed = systemStatus?.usedMemory || 0
  const memTotal = systemStatus?.totalMemory || 1024
  const memPercent = ((memUsed / memTotal) * 100).toFixed(0)

  return (
    <div className="taskbar">
      {/* 开始按钮 */}
      <button
        className="taskbar-start"
        onClick={() => setShowStartMenu(!showStartMenu)}
      >
        <span style={{ fontSize: '16px' }}>⊞</span>
      </button>

      {/* 开始菜单 */}
      {showStartMenu && (
        <div className="start-menu">
          <div className="start-menu-header">
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#ededef' }}>ProcessOS</span>
          </div>
          <div className="start-menu-items">
            <div className="start-menu-item" onClick={() => { onOpenTaskManager(); setShowStartMenu(false) }}>
              <span>⚙️</span>
              <span>任务管理器</span>
            </div>
            <div className="start-menu-divider" />
            <div className="start-menu-item" onClick={() => { onReset(); setShowStartMenu(false) }}>
              <span>🔄</span>
              <span>重置系统</span>
            </div>
          </div>
        </div>
      )}

      {/* 运行中的应用 — 居中显示 */}
      <div className="taskbar-apps">
        {windows.map(win => (
          <button
            key={win.id}
            className={`taskbar-app ${activeWindowId === win.id && !win.minimized ? 'active' : ''}`}
            onClick={() => onActivateWindow(win.id)}
            title={win.title}
          >
            <span style={{ fontSize: '16px' }}>{win.icon}</span>
            {/* 运行中指示灯 */}
            <div style={{
              width: '4px', height: '4px', borderRadius: '50%',
              background: activeWindowId === win.id && !win.minimized ? '#00f0ff' : 'rgba(255,255,255,0.3)',
              boxShadow: activeWindowId === win.id && !win.minimized ? '0 0 6px #00f0ff' : 'none',
              animation: 'breathe 2s ease-in-out infinite'
            }} />
          </button>
        ))}
      </div>

      {/* 系统托盘 */}
      <div className="taskbar-tray">
        <div className="tray-item" title="CPU 使用率">
          <span className="tray-label">CPU</span>
          <div className="tray-bar">
            <div className="tray-bar-fill cpu" style={{ width: `${cpuUsage}%` }} />
          </div>
          <span className="tray-value">{cpuUsage}%</span>
        </div>
        <div className="tray-item" title="内存使用率">
          <span className="tray-label">MEM</span>
          <div className="tray-bar">
            <div className="tray-bar-fill mem" style={{ width: `${memPercent}%` }} />
          </div>
          <span className="tray-value">{memPercent}%</span>
        </div>
        <div className="tray-divider" />
        <div className="tray-clock">
          {time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

export default TaskBar
