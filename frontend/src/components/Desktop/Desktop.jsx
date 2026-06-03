import React from 'react'
import DesktopIcon from './DesktopIcon'
import DesktopWidget from './DesktopWidget'

function Desktop({ apps, onLaunchApp, onOpenTaskManager, onOpenKernelLab, onOpenSystemLog, systemStatus }) {
  const systemApps = [
    { name: '任务管理器', icon: '⚙️' },
    { name: '系统日志', icon: '📋' },
    { name: '内核算法实验室', icon: '🧪' },
  ]

  const handleDoubleClick = (name) => {
    if (name === '任务管理器') onOpenTaskManager()
    else if (name === '内核算法实验室') onOpenKernelLab()
    else if (name === '系统日志') onOpenSystemLog()
    else onLaunchApp(name)
  }

  return (
    <div className="desktop">
      {/* 左侧图标区域 — 纵向网格 */}
      <div className="desktop-icons-col">
        {/* 系统应用 */}
        <div className="desktop-icons-section">
          <div className="desktop-section-label">系统工具</div>
          {systemApps.map(app => (
            <DesktopIcon key={app.name} app={app} onDoubleClick={handleDoubleClick} />
          ))}
        </div>

        <div className="desktop-section-divider" />

        {/* 用户应用 */}
        <div className="desktop-icons-section">
          <div className="desktop-section-label">应用</div>
          {apps.map(app => (
            <DesktopIcon key={app.id} app={app} onDoubleClick={handleDoubleClick} />
          ))}
        </div>
      </div>

      {/* 右侧小部件 */}
      <DesktopWidget systemStatus={systemStatus} />

      {/* 水印 */}
      <div className="desktop-watermark">
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.12)', fontWeight: 600 }}>ProcessOS Simulator</div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.06)' }}>双击图标启动应用</div>
      </div>
    </div>
  )
}

export default Desktop
