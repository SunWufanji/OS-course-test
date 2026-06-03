import React from 'react'
import DesktopIcon from './DesktopIcon'

/**
 * 桌面组件 - 仿 Windows 桌面
 */
function Desktop({ apps, onLaunchApp, onOpenTaskManager, onOpenKernelLab, onOpenSystemLog }) {
  // 系统应用
  const systemApps = [
    { name: '任务管理器', icon: '⚙️' },
    { name: '系统日志', icon: '📋' },
    { name: '内核算法实验室', icon: '🧪' },
  ]

  return (
    <div className="desktop">
      {/* 桌面图标网格 */}
      <div className="desktop-icons">
        {/* 系统应用 */}
        {systemApps.map(app => (
          <DesktopIcon
            key={app.name}
            app={app}
            onDoubleClick={(name) => {
              if (name === '任务管理器') onOpenTaskManager()
              else if (name === '内核算法实验室') onOpenKernelLab()
              else if (name === '系统日志') onOpenSystemLog()
              else onLaunchApp(name)
            }}
          />
        ))}

        {/* 分隔线 */}
        <div className="desktop-divider" />

        {/* 用户应用 */}
        {apps.map(app => (
          <DesktopIcon
            key={app.id}
            app={app}
            onDoubleClick={onLaunchApp}
          />
        ))}
      </div>

      {/* 右键菜单（简化版） */}
      <div className="desktop-watermark">
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.15)', fontWeight: 600 }}>
          ProcessOS Simulator
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.08)' }}>
          双击图标启动应用
        </div>
      </div>
    </div>
  )
}

export default Desktop
