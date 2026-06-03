import React, { useState, useEffect } from 'react'

// 迷你圆环组件
function MiniRing({ value, label, color, size = 48 }) {
  const radius = (size - 6) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ - ((value || 0) / 100) * circ
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 3px ${color}40)` }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position: 'relative', top: -size + 2, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '9px', fontWeight: 700, color, textShadow: `0 0 4px ${color}50` }}>{(value || 0).toFixed(0)}%</span>
      </div>
      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', marginTop: -2, letterSpacing: '1px' }}>{label}</div>
    </div>
  )
}

// 系统工具（在桌面图标区域显示）
const SYSTEM_APPS = [
  { name: '任务管理器', icon: '⚙️' },
  { name: '系统日志', icon: '📋' },
  { name: '内核算法实验室', icon: '🧪' },
]

function Desktop({ apps, onLaunchApp, onOpenTaskManager, onOpenKernelLab, onOpenSystemLog, systemStatus }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const cpuUsage = systemStatus?.totalCpuUsage || 0
  const memUsed = systemStatus?.usedMemory || 0
  const memTotal = systemStatus?.totalMemory || 16384
  const memPercent = (memUsed / memTotal) * 100
  const diskRead = systemStatus?.diskReadSpeed || 0
  const diskWrite = systemStatus?.diskWriteSpeed || 0
  const diskAvg = Math.min((diskRead + diskWrite) / 2 * 5, 100)

  const hours = time.getHours().toString().padStart(2, '0')
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const dateStr = `${time.getMonth() + 1}月${time.getDate()}日 ${weekdays[time.getDay()]}`

  const handleDoubleClick = (name) => {
    if (name === '任务管理器') onOpenTaskManager()
    else if (name === '内核算法实验室') onOpenKernelLab()
    else if (name === '系统日志') onOpenSystemLog()
    else onLaunchApp(name)
  }

  const allApps = [...SYSTEM_APPS, ...apps]

  return (
    <div className="desktop-mac">
      {/* 左侧图标网格 — 纵向排列 */}
      <div className="mac-icons-grid">
        {allApps.map(app => (
          <div key={app.name} className="mac-desktop-icon" onDoubleClick={() => handleDoubleClick(app.name)}>
            <div className="mac-icon-img">{app.icon}</div>
            <div className="mac-icon-label">{app.name}</div>
          </div>
        ))}
      </div>

      {/* 右侧小部件区域 */}
      <div className="mac-widgets">
        {/* 大时钟 */}
        <div className="mac-clock-widget">
          <div className="mac-clock-time">{hours}:{minutes}</div>
          <div className="mac-clock-date">{dateStr}</div>
        </div>

        {/* 硬件监控 */}
        <div className="mac-hw-widget">
          <MiniRing value={cpuUsage} label="CPU" color="#00f0ff" />
          <MiniRing value={memPercent} label="MEM" color="#ff2d7b" />
          <MiniRing value={diskAvg} label="DISK" color="#00ff88" />
        </div>
      </div>
    </div>
  )
}

export default Desktop
