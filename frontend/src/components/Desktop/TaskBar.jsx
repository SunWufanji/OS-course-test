import React, { useState, useEffect } from 'react'

// 所有 Dock 栏应用配置
const DOCK_APPS = [
  { name: '任务管理器', icon: '⚙️', action: 'taskManager' },
  { name: '系统日志', icon: '📋', action: 'systemLog' },
  { name: '内核算法实验室', icon: '🧪', action: 'kernelLab' },
  { name: 'CS:GO', icon: '/picture/csgo.png', app: 'CS:GO', isImage: true },
  { name: '绝地求生', icon: '🎯', app: '绝地求生' },
  { name: '我的世界', icon: '⛏️', app: '我的世界' },
  { name: 'Chrome', icon: '🌐', app: 'Chrome' },
  { name: 'Firefox', icon: '🦊', app: 'Firefox' },
  { name: 'VSCode', icon: '💻', app: 'VSCode' },
  { name: '终端', icon: '⬛', app: '终端' },
  { name: '记事本', icon: '📝', app: '记事本' },
  { name: 'Word', icon: '📄', app: 'Word' },
  { name: 'Excel', icon: '📊', app: 'Excel' },
  { name: '下载工具', icon: '⬇️', app: '下载工具' },
  { name: '杀毒软件', icon: '🛡️', app: '杀毒软件' },
  { name: '系统更新', icon: '🔄', app: '系统更新' },
]

function TaskBar({ windows, activeWindowId, systemStatus, onActivateWindow, onOpenTaskManager, onOpenKernelLab, onOpenSystemLog, onLaunchApp, onReset, onToggleControlCenter, onToggleLauncher }) {
  const [time, setTime] = useState(new Date())
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleDockClick = (item) => {
    if (item.action === 'taskManager') onOpenTaskManager()
    else if (item.action === 'systemLog') onOpenSystemLog()
    else if (item.action === 'kernelLab') onOpenKernelLab()
    else if (item.app) onLaunchApp(item.app)
  }

  const isRunning = (appName) => windows.some(w => w.title?.includes(appName) || w.icon === DOCK_APPS.find(d => d.app === appName)?.icon)

  return (
    <>
      {/* 顶部菜单栏 */}
      <div className="mac-menubar">
        <div className="menubar-left">
          <div className="menubar-logo" onClick={() => setShowMenu(!showMenu)}>🍎</div>
          <span className="menubar-brand">ProcessOS</span>
        </div>
        <div className="menubar-right" onClick={onToggleControlCenter}>
          <span className="menubar-time">
            {time.toLocaleDateString('zh-CN', { weekday: 'short', month: 'short', day: 'numeric' })}
            {' '}
            {time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* 开始菜单 */}
      {showMenu && (
        <>
          <div className="mac-menu-overlay" onClick={() => setShowMenu(false)} />
          <div className="mac-start-menu">
            <div className="mac-menu-header">ProcessOS Simulator</div>
            <div className="mac-menu-item" onClick={() => { onOpenTaskManager(); setShowMenu(false) }}>
              <span>⚙️</span><span>任务管理器</span>
            </div>
            <div className="mac-menu-item" onClick={() => { onOpenSystemLog(); setShowMenu(false) }}>
              <span>📋</span><span>系统日志</span>
            </div>
            <div className="mac-menu-item" onClick={() => { onOpenKernelLab(); setShowMenu(false) }}>
              <span>🧪</span><span>算法实验室</span>
            </div>
            <div className="mac-menu-divider" />
            <div className="mac-menu-item" onClick={() => { onReset(); setShowMenu(false) }}>
              <span>🔄</span><span>重置系统</span>
            </div>
          </div>
        </>
      )}

      {/* 底部 Dock 栏 */}
      <div className="mac-dock">
        {DOCK_APPS.map(item => {
          const running = isRunning(item.app || item.name)
          return (
            <div
              key={item.name}
              className="dock-icon"
              title={item.name}
              onClick={() => handleDockClick(item)}
            >
              {item.isImage ? (
                <img src={item.icon} alt={item.name} className="dock-icon-img" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
              ) : (
                <div className="dock-icon-img">{item.icon}</div>
              )}
              {running && <div className="dock-dot" />}
            </div>
          )
        })}
        {/* 启动器按钮 */}
        <div className="dock-icon" title="全部应用" onClick={onToggleLauncher}>
          <div className="dock-icon-img">⊞</div>
        </div>
      </div>
    </>
  )
}

export default TaskBar
