import React, { useState, useEffect, useRef } from 'react'

// 圆形仪表盘组件
function CircularGauge({ value, size = 80, label, color = '#06b6d4' }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={radius}
          fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
      <div style={{
        position: 'relative', top: -size + 4, height: size,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#ededef' }}>{value?.toFixed(0) || 0}%</div>
      </div>
      <div style={{ fontSize: '11px', color: '#888', marginTop: -4 }}>{label}</div>
    </div>
  )
}

// 小型波形图组件
function MiniWave({ data, color = '#6366f1', width = 120, height = 32 }) {
  if (!data || data.length < 2) return <div style={{ width, height }} />
  const max = Math.max(...data, 1)
  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * width},${height - (v / max) * height}`
  ).join(' ')

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#grad-${color.replace('#', '')})`}
      />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  )
}

/**
 * 任务管理器 - 仿 Windows 任务管理器
 */
function TaskManager({ processes, systemStatus, onTerminate, onSuspend, onResume }) {
  const [tab, setTab] = useState('processes')
  const [sortBy, setSortBy] = useState('pid')
  const [sortDir, setSortDir] = useState('asc')

  // CPU 历史数据（保留最近 30 个点）
  const cpuHistoryRef = useRef(Array(30).fill(0))
  const memHistoryRef = useRef(Array(30).fill(0))
  const [cpuHistory, setCpuHistory] = useState(Array(30).fill(0))
  const [memHistory, setMemHistory] = useState(Array(30).fill(0))

  const cpuUsage = systemStatus?.totalCpuUsage?.toFixed(1) || 0
  const memUsed = systemStatus?.usedMemory || 0
  const memTotal = systemStatus?.totalMemory || 16384
  const memPercent = ((memUsed / memTotal) * 100).toFixed(1)
  const diskRead = systemStatus?.diskReadSpeed?.toFixed(1) || 0
  const diskWrite = systemStatus?.diskWriteSpeed?.toFixed(1) || 0
  const netSpeed = systemStatus?.networkSpeed?.toFixed(0) || 0

  // 更新历史数据
  useEffect(() => {
    cpuHistoryRef.current = [...cpuHistoryRef.current.slice(1), parseFloat(cpuUsage)]
    memHistoryRef.current = [...memHistoryRef.current.slice(1), parseFloat(memPercent)]
    setCpuHistory([...cpuHistoryRef.current])
    setMemHistory([...memHistoryRef.current])
  }, [cpuUsage, memPercent])

  // 排序
  const sortedProcesses = [...processes].sort((a, b) => {
    let va = a[sortBy], vb = b[sortBy]
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb?.toLowerCase() || '' }
    if (va == null) va = 0; if (vb == null) vb = 0
    return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
  })
  const handleSort = (field) => {
    if (sortBy === field) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('asc') }
  }
  const SortIcon = ({ field }) => sortBy !== field ? <span style={{ opacity: 0.3 }}>↕</span> : <span>{sortDir === 'asc' ? '↑' : '↓'}</span>

  // 内存方块（64 个小方块，每个代表 256MB）
  const MEM_BLOCKS = 64
  const blockSize = memTotal / MEM_BLOCKS
  const memAllocations = systemStatus?.memoryAllocations || []
  const getMemBlockColor = (blockIndex) => {
    const blockStart = blockIndex * blockSize
    const blockEnd = blockStart + blockSize
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4']
    for (let i = 0; i < memAllocations.length; i++) {
      const alloc = memAllocations[i]
      // 简化：根据 PID 分配颜色
      const pid = alloc.pid
      return colors[(pid - 100) % colors.length]
    }
    return null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1a1a2e', color: '#ededef' }}>
      {/* 标签页 */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
        {[{ id: 'processes', label: '进程', icon: '📋' }, { id: 'performance', label: '性能', icon: '📊' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 20px', background: tab === t.id ? 'rgba(255,255,255,0.05)' : 'transparent',
            border: 'none', borderBottom: tab === t.id ? '2px solid #8b5cf6' : '2px solid transparent',
            color: tab === t.id ? '#ededef' : '#888', cursor: 'pointer', fontSize: '13px',
            fontWeight: tab === t.id ? 600 : 400, transition: 'all 0.2s'
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* 进程列表 */}
      {tab === 'processes' && (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.3)', position: 'sticky', top: 0 }}>
                {[
                  { key: 'icon', label: '', width: 40 }, { key: 'name', label: '名称', width: 150 },
                  { key: 'pid', label: 'PID', width: 60 }, { key: 'state', label: '状态', width: 70 },
                  { key: 'cpuUsage', label: 'CPU', width: 70 }, { key: 'currentMemoryUsage', label: '内存', width: 80 },
                  { key: 'diskRead', label: '磁盘读', width: 70 }, { key: 'networkSpeed', label: '网络', width: 70 },
                  { key: 'actions', label: '操作', width: 120 },
                ].map(col => (
                  <th key={col.key} onClick={() => col.key !== 'icon' && col.key !== 'actions' && handleSort(col.key)}
                    style={{ padding: '8px 10px', textAlign: 'left', color: '#888', fontWeight: 500, width: col.width,
                      cursor: col.key !== 'icon' && col.key !== 'actions' ? 'pointer' : 'default', userSelect: 'none' }}>
                    {col.label} <SortIcon field={col.key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedProcesses.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#555' }}>
                  暂无运行中的进程<br /><span style={{ fontSize: '11px' }}>双击桌面图标启动应用</span>
                </td></tr>
              ) : sortedProcesses.map(p => (
                <tr key={p.pid} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>{p.icon || '📱'}</td>
                  <td style={{ padding: '8px 12px', color: '#ededef', fontWeight: 500 }}>{p.name}</td>
                  <td style={{ padding: '8px 12px', color: '#888' }}>{p.pid}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
                      background: p.state === 'RUNNING' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                      color: p.state === 'RUNNING' ? '#22c55e' : '#f59e0b' }}>
                      {p.state === 'RUNNING' ? '运行' : '挂起'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', color: '#06b6d4' }}>{p.cpuUsage?.toFixed(1) || 0}%</td>
                  <td style={{ padding: '8px 12px', color: '#f43f5e' }}>{p.currentMemoryUsage || 0}MB</td>
                  <td style={{ padding: '8px 12px', color: '#888' }}>{p.diskRead || 0}MB/s</td>
                  <td style={{ padding: '8px 12px', color: '#888' }}>{p.networkSpeed || 0}KB/s</td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {p.state === 'RUNNING' ? (
                        <button onClick={() => onSuspend(p.pid)} style={{ padding: '3px 8px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>挂起</button>
                      ) : (
                        <button onClick={() => onResume(p.pid)} style={{ padding: '3px 8px', background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>恢复</button>
                      )}
                      <button onClick={() => { if (confirm(`确定结束 ${p.name}?`)) onTerminate(p.pid) }}
                        style={{ padding: '3px 8px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>结束</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 性能监控 */}
      {tab === 'performance' && systemStatus && (
        <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
          {/* CPU 区域 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '12px' }}>
              {/* 总 CPU 圆形仪表盘 */}
              <CircularGauge value={parseFloat(cpuUsage)} size={90} label="CPU" color="#06b6d4" />
              {/* CPU 波形图 */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#888' }}>使用率趋势（30秒）</span>
                  <span style={{ fontSize: '11px', color: '#06b6d4' }}>{systemStatus.cpuCores} 核</span>
                </div>
                <MiniWave data={cpuHistory} color="#06b6d4" width={400} height={40} />
              </div>
            </div>

            {/* 各核心仪表盘 */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(systemStatus.cpuCores, 8)}, 1fr)`, gap: '12px' }}>
              {(systemStatus.coreUsage || []).slice(0, 8).map((usage, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px',
                  border: `1px solid rgba(255,255,255,0.05)`, textAlign: 'center'
                }}>
                  <CircularGauge value={usage} size={64} label={`核心${i}`}
                    color={usage > 80 ? '#ef4444' : usage > 50 ? '#f59e0b' : '#22c55e'} />
                </div>
              ))}
            </div>
          </div>

          {/* 内存区域 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '12px' }}>
              {/* 内存圆形仪表盘 */}
              <CircularGauge value={parseFloat(memPercent)} size={90} label="内存" color="#f43f5e" />
              {/* 内存波形图 */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#888' }}>内存使用趋势</span>
                  <span style={{ fontSize: '11px', color: '#f43f5e' }}>{memUsed}MB / {memTotal}MB</span>
                </div>
                <MiniWave data={memHistory} color="#f43f5e" width={400} height={40} />
              </div>
            </div>

            {/* 内存乐高方块 */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>内存分配可视化</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: '2px' }}>
                {Array.from({ length: MEM_BLOCKS }, (_, i) => {
                  const blockStart = i * blockSize
                  const alloc = memAllocations.find(a => {
                    const allocStart = 0 // 简化：系统预留从0开始
                    return blockStart >= 0 && blockStart < a.size
                  })
                  const isUsed = i < Math.ceil((memUsed / memTotal) * MEM_BLOCKS)
                  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4']
                  const color = isUsed ? colors[i % colors.length] : 'rgba(255,255,255,0.04)'
                  return (
                    <div key={i} style={{
                      aspectRatio: '1', borderRadius: '2px', background: color,
                      transition: 'all 0.3s', opacity: isUsed ? 0.85 : 0.3,
                      boxShadow: isUsed ? `0 0 4px ${color}40` : 'none'
                    }} title={isUsed ? `已占用 ${blockSize}MB` : `空闲 ${blockSize}MB`} />
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                {memAllocations.slice(0, 6).map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#888' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308'][i % 6] }} />
                    {a.processName} ({a.size}MB)
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 磁盘和网络 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#ededef', fontWeight: 600, fontSize: '13px', marginBottom: '10px' }}>💾 磁盘</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#888', fontSize: '12px' }}>读取</span>
                <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: 600 }}>{diskRead} MB/s</span>
              </div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ height: '100%', width: `${Math.min(diskRead * 5, 100)}%`, background: '#22c55e', borderRadius: '2px', transition: 'width 0.5s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888', fontSize: '12px' }}>写入</span>
                <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 600 }}>{diskWrite} MB/s</span>
              </div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(diskWrite * 5, 100)}%`, background: '#f59e0b', borderRadius: '2px', transition: 'width 0.5s' }} />
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#ededef', fontWeight: 600, fontSize: '13px', marginBottom: '10px' }}>🌐 网络</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888', fontSize: '12px' }}>速度</span>
                <span style={{ color: '#8b5cf6', fontSize: '12px', fontWeight: 600 }}>{netSpeed} KB/s</span>
              </div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden', marginTop: '8px' }}>
                <div style={{ height: '100%', width: `${Math.min(netSpeed / 10, 100)}%`, background: '#8b5cf6', borderRadius: '2px', transition: 'width 0.5s' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 底部状态栏 */}
      <div style={{ padding: '6px 12px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888', background: 'rgba(0,0,0,0.2)' }}>
        <span>进程数: {processes.length}</span>
        <span>运行中: {processes.filter(p => p.state === 'RUNNING').length}</span>
        <span>已挂起: {processes.filter(p => p.state === 'BLOCKED').length}</span>
      </div>
    </div>
  )
}

export default TaskManager
