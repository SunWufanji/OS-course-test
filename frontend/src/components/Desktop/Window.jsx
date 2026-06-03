import React, { useState, useRef, useEffect } from 'react'

/**
 * 窗口组件 - 仿 Windows 窗口
 */
function Window({
  id, title, icon, children,
  x = 100, y = 50, width = 800, height = 600,
  maximized = false, isActive = false,
  onClose, onMinimize, onMaximize, onActivate
}) {
  const [pos, setPos] = useState({ x, y })
  const [size, setSize] = useState({ width, height })
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!maximized) {
      setPos({ x, y })
      setSize({ width, height })
    }
  }, [x, y, width, height, maximized])

  const handleMouseDown = (e) => {
    if (maximized) return
    onActivate()
    setIsDragging(true)
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    }
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return
      setPos({
        x: Math.max(0, e.clientX - dragOffset.current.x),
        y: Math.max(0, e.clientY - dragOffset.current.y)
      })
    }
    const handleMouseUp = () => setIsDragging(false)

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const windowStyle = maximized
    ? { left: 0, top: 0, width: '100%', height: 'calc(100% - 48px)', borderRadius: 0 }
    : { left: pos.x, top: pos.y, width: size.width, height: size.height }

  return (
    <div
      className={`window ${isActive ? 'active' : ''}`}
      style={windowStyle}
      onMouseDown={onActivate}
    >
      {/* 标题栏 */}
      <div
        className="window-titlebar"
        onMouseDown={handleMouseDown}
        onDoubleClick={onMaximize}
      >
        <div className="window-title">
          <span className="window-icon">{icon}</span>
          <span>{title}</span>
        </div>
        <div className="window-controls">
          <button className="window-btn minimize" onClick={onMinimize}>─</button>
          <button className="window-btn maximize" onClick={onMaximize}>
            {maximized ? '❐' : '☐'}
          </button>
          <button className="window-btn close" onClick={onClose}>✕</button>
        </div>
      </div>

      {/* 窗口内容 */}
      <div className="window-content">
        {children}
      </div>
    </div>
  )
}

export default Window
