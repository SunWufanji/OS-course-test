import React, { useState, useRef, useEffect } from 'react'

/**
 * 窗口组件 — macOS 红绿灯风格
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
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return
      setPos({ x: Math.max(0, e.clientX - dragOffset.current.x), y: Math.max(0, e.clientY - dragOffset.current.y) })
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
    ? { left: 0, top: 28, width: '100%', height: 'calc(100% - 84px)', borderRadius: 0 }
    : { left: pos.x, top: pos.y, width: size.width, height: size.height }

  return (
    <div className={`mac-window ${isActive ? 'active' : ''}`} style={windowStyle} onMouseDown={onActivate}>
      {/* 标题栏 — 红绿灯在左上角 */}
      <div className="mac-window-titlebar" onMouseDown={handleMouseDown} onDoubleClick={onMaximize}>
        <div className="mac-traffic-lights">
          <button className="mac-tl-btn close" onClick={(e) => { e.stopPropagation(); onClose() }} />
          <button className="mac-tl-btn minimize" onClick={(e) => { e.stopPropagation(); onMinimize() }} />
          <button className="mac-tl-btn maximize" onClick={(e) => { e.stopPropagation(); onMaximize() }} />
        </div>
        <div className="mac-window-title">
          <span>{icon}</span>
          <span>{title}</span>
        </div>
        <div style={{ width: 56 }} /> {/* 平衡红绿灯宽度 */}
      </div>
      <div className="mac-window-content">{children}</div>
    </div>
  )
}

export default Window
