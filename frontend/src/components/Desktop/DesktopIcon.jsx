import React from 'react'

/**
 * 桌面图标组件
 */
function DesktopIcon({ app, onDoubleClick }) {
  return (
    <div
      className="desktop-icon"
      onDoubleClick={() => onDoubleClick(app.name || app.id)}
    >
      <div className="desktop-icon-img">{app.icon}</div>
      <div className="desktop-icon-label">{app.name}</div>
    </div>
  )
}

export default DesktopIcon
