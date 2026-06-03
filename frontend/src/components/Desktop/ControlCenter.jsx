import React, { useState, useEffect } from 'react'

function MiniRing({ value, label, color, size = 56 }) {
  const radius = (size - 6) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ - ((value || 0) / 100) * circ
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 4px ${color}40)` }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position: 'relative', top: -size + 2, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color, textShadow: `0 0 6px ${color}50` }}>{(value || 0).toFixed(0)}%</span>
      </div>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: -2, letterSpacing: '1px' }}>{label}</div>
    </div>
  )
}

function ControlCenter({ isOpen, onClose, systemStatus, onOpenTaskManager }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!isOpen) return null

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
  const dateStr = `${time.getFullYear()}年${time.getMonth() + 1}月${time.getDate()}日 ${weekdays[time.getDay()]}`

  return (
    <>
      <div className="cc-overlay" onClick={onClose} />
      <div className="cc-panel">
        {/* 时钟 */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '48px', fontWeight: 200, color: 'rgba(255,255,255,0.85)', lineHeight: 1, fontVariantNumeric: 'tabular-nums', textShadow: '0 0 20px rgba(255,255,255,0.05)' }}>
            {hours}:{minutes}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '6px' }}>{dateStr}</div>
        </div>

        {/* 硬件监控 */}
        <div className="cc-section">
          <div className="cc-section-title">硬件监控</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '16px', cursor: 'pointer' }}
            onClick={() => { onOpenTaskManager(); onClose(); }}>
            <MiniRing value={cpuUsage} label="CPU" color="#00f0ff" />
            <MiniRing value={memPercent} label="MEM" color="#ff2d7b" />
            <MiniRing value={diskAvg} label="DISK" color="#00ff88" />
          </div>
        </div>

        {/* 详细信息 */}
        <div className="cc-section">
          <div className="cc-section-title">详细信息</div>
          {[
            { label: 'CPU 使用率', value: `${cpuUsage.toFixed(1)}%`, color: '#00f0ff' },
            { label: '内存使用', value: `${memUsed}MB / ${memTotal}MB`, color: '#ff2d7b' },
            { label: '磁盘读取', value: `${diskRead.toFixed(1)} MB/s`, color: '#00ff88' },
            { label: '磁盘写入', value: `${diskWrite.toFixed(1)} MB/s`, color: '#ffd700' },
            { label: '活跃进程', value: systemStatus?.cpuCores ? `${systemStatus.cpuCores} 核心` : '-', color: '#8b5cf6' },
          ].map(item => (
            <div key={item.label} className="cc-info-row">
              <span className="cc-info-label">{item.label}</span>
              <span className="cc-info-value" style={{ color: item.color }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default ControlCenter
