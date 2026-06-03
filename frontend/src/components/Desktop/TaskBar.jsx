import React, { useState, useEffect } from 'react'

function TaskBar({ windows, activeWindowId, systemStatus, runningProcesses, onActivateWindow, onOpenTaskManager, onReset }) {
  const [time, setTime] = useState(new Date())
  const [showStartMenu, setShowStartMenu] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const cpuUsage = systemStatus?.totalCpuUsage?.toFixed(0) || 0
  const memUsed = systemStatus?.usedMemory || 0
  const memTotal = systemStatus?.totalMemory || 16384
  const memPercent = ((memUsed / memTotal) * 100).toFixed(0)

  return (
    <div className="dock-bar">
      {/* 开始按钮 */}
      <button className="dock-start" onClick={() => setShowStartMenu(!showStartMenu)}>
        <span style={{ fontSize: '16px' }}>🍎</span>
      </button>

      {/* 开始菜单 */}
      {showStartMenu && (
        <div className="dock-start-menu">
          <div className="dock-menu-header">
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#ededef' }}>ProcessOS</span>
          </div>
          <div className="dock-menu-items">
            <div className="dock-menu-item" onClick={() => { onOpenTaskManager(); setShowStartMenu(false) }}>
              <span>⚙️</span><span>任务管理器</span>
            </div>
            <div className="dock-menu-divider" />
            <div className="dock-menu-item" onClick={() => { onReset(); setShowStartMenu(false) }}>
              <span>🔄</span><span>重置系统</span>
            </div>
          </div>
        </div>
      )}

      {/* 运行中的应用 — Dock 居中 */}
      <div className="dock-apps">
        {windows.map(win => (
          <div
            key={win.id}
            className={`dock-app ${activeWindowId === win.id && !win.minimized ? 'active' : ''}`}
            onClick={() => onActivateWindow(win.id)}
            title={win.title}
          >
            <div className="dock-app-icon">{win.icon}</div>
            {/* 运行指示灯 */}
            <div className="dock-indicator" />
          </div>
        ))}
      </div>

      {/* 系统托盘 */}
      <div className="dock-tray">
        <div className="dock-tray-item">
          <span className="dock-tray-label">CPU</span>
          <div className="dock-tray-bar">
            <div className="dock-tray-fill cpu" style={{ width: `${cpuUsage}%` }} />
          </div>
          <span className="dock-tray-value">{cpuUsage}%</span>
        </div>
        <div className="dock-tray-item">
          <span className="dock-tray-label">MEM</span>
          <div className="dock-tray-bar">
            <div className="dock-tray-fill mem" style={{ width: `${memPercent}%` }} />
          </div>
          <span className="dock-tray-value">{memPercent}%</span>
        </div>
        <div className="dock-tray-divider" />
        <div className="dock-tray-clock">
          {time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

export default TaskBar
