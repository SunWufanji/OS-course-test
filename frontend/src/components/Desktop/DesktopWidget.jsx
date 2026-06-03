import React, { useState, useEffect } from 'react'

// 迷你圆环组件
function MiniRing({ value, label, color, size = 52 }) {
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
        <span style={{ fontSize: '10px', fontWeight: 700, color, textShadow: `0 0 6px ${color}60` }}>
          {(value || 0).toFixed(0)}%
        </span>
      </div>
      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', marginTop: -2, letterSpacing: '1px' }}>{label}</div>
    </div>
  )
}

function DesktopWidget({ systemStatus }) {
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

  return (
    <div style={{
      position: 'absolute', right: '48px', top: '50%', transform: 'translateY(-50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px',
      userSelect: 'none', pointerEvents: 'none'
    }}>
      {/* 大时钟 */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '72px', fontWeight: 200, color: 'rgba(255,255,255,0.85)',
          letterSpacing: '4px', lineHeight: 1,
          textShadow: '0 0 30px rgba(255,255,255,0.1)',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {hours}:{minutes}
        </div>
        <div style={{
          fontSize: '13px', color: 'rgba(255,255,255,0.35)',
          marginTop: '8px', letterSpacing: '2px'
        }}>
          {dateStr}
        </div>
      </div>

      {/* 资源监控环 */}
      <div style={{
        display: 'flex', gap: '20px',
        background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(12px)',
        borderRadius: '12px', padding: '16px 20px',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <MiniRing value={cpuUsage} label="CPU" color="#00f0ff" />
        <MiniRing value={memPercent} label="MEM" color="#ff2d7b" />
        <MiniRing value={diskAvg} label="DISK" color="#00ff88" />
      </div>
    </div>
  )
}

export default DesktopWidget
