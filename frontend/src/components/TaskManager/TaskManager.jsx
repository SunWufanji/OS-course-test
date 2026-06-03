import React, { useState, useEffect, useRef } from 'react'

// ===== 赛博朋克色板 =====
const CYBER = {
  bg: '#060e17',
  panel: 'rgba(6, 14, 23, 0.85)',
  cyan: '#00f0ff',
  cyanDim: 'rgba(0, 240, 255, 0.15)',
  cyanGlow: '0 0 15px rgba(0, 240, 255, 0.3), 0 0 30px rgba(0, 240, 255, 0.1)',
  magenta: '#ff2d7b',
  magentaDim: 'rgba(255, 45, 123, 0.15)',
  magentaGlow: '0 0 15px rgba(255, 45, 123, 0.3)',
  green: '#00ff88',
  greenDim: 'rgba(0, 255, 136, 0.15)',
  yellow: '#ffd700',
  yellowDim: 'rgba(255, 215, 0, 0.15)',
  red: '#ff3333',
  text: '#e0f0ff',
  textDim: '#4a6a80',
  border: 'rgba(0, 240, 255, 0.12)',
  panelBg: 'rgba(0, 240, 255, 0.04)',
}

// ===== 圆形仪表盘 =====
function CyberGauge({ value, size = 100, label, color = CYBER.cyan }) {
  const radius = (size - 10) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - ((value || 0) / 100) * circumference

  return (
    <div style={{ textAlign: 'center', position: 'relative' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 6px ${color}60)` }}>
        {/* 底圈 */}
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(0,240,255,0.06)" strokeWidth="6" />
        {/* 刻度线 */}
        {Array.from({ length: 36 }, (_, i) => {
          const angle = (i * 10) * Math.PI / 180
          const x1 = size/2 + (radius - 3) * Math.cos(angle)
          const y1 = size/2 + (radius - 3) * Math.sin(angle)
          const x2 = size/2 + (radius + 1) * Math.cos(angle)
          const y2 = size/2 + (radius + 1) * Math.sin(angle)
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(0,240,255,0.15)" strokeWidth="0.5" />
        })}
        {/* 进度弧 */}
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease', filter: `drop-shadow(0 0 8px ${color})` }} />
      </svg>
      {/* 中心数字 */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: size, height: size,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: size > 80 ? '22px' : '14px', fontWeight: 800, color: color,
          textShadow: `0 0 10px ${color}80` }}>{(value || 0).toFixed(0)}%</div>
      </div>
      <div style={{ fontSize: '11px', color: CYBER.textDim, marginTop: '4px', letterSpacing: '1px' }}>{label}</div>
    </div>
  )
}

// ===== Equalizer 柱状图（核心使用率） =====
function CoreEqualizer({ cores, maxHeight = 80 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: maxHeight, padding: '0 4px' }}>
      {(cores || []).slice(0, 8).map((usage, i) => {
        const h = Math.max(4, (usage / 100) * maxHeight)
        const color = usage > 80 ? CYBER.red : usage > 50 ? CYBER.yellow : CYBER.green
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '100%', height: h, background: `linear-gradient(180deg, ${color}, ${color}40)`,
              borderRadius: '2px 2px 0 0', transition: 'height 0.4s ease',
              boxShadow: `0 0 8px ${color}50, inset 0 0 4px ${color}30` }} />
            <div style={{ fontSize: '9px', color: CYBER.textDim }}>C{i}</div>
            <div style={{ fontSize: '9px', color: color, textShadow: `0 0 4px ${color}60` }}>{usage?.toFixed(0) || 0}%</div>
          </div>
        )
      })}
    </div>
  )
}

// ===== 赛博朋克波形图 =====
function CyberWave({ data, color = CYBER.cyan, width = 280, height = 48 }) {
  if (!data || data.length < 2) return <div style={{ width, height }} />
  const max = Math.max(...data, 1)
  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * width},${height - (v / max) * (height - 4) - 2}`
  ).join(' ')

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`cyber-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id={`glow-${color.replace('#', '')}`}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <polygon points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#cyber-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2"
        filter={`url(#glow-${color.replace('#', '')})`} />
    </svg>
  )
}

// ===== HUD 面板容器 =====
function HudPanel({ title, children, style = {} }) {
  return (
    <div style={{
      background: CYBER.panelBg, border: `1px solid ${CYBER.border}`,
      borderRadius: '8px', padding: '14px', position: 'relative', overflow: 'hidden', ...style
    }}>
      {/* 角标装饰 */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '12px', height: '12px',
        borderTop: `2px solid ${CYBER.cyan}`, borderLeft: `2px solid ${CYBER.cyan}` }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: '12px', height: '12px',
        borderTop: `2px solid ${CYBER.cyan}`, borderRight: `2px solid ${CYBER.cyan}` }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '12px', height: '12px',
        borderBottom: `2px solid ${CYBER.cyan}`, borderLeft: `2px solid ${CYBER.cyan}` }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px',
        borderBottom: `2px solid ${CYBER.cyan}`, borderRight: `2px solid ${CYBER.cyan}` }} />
      {title && <div style={{ fontSize: '10px', color: CYBER.cyan, letterSpacing: '2px', textTransform: 'uppercase',
        marginBottom: '10px', textShadow: `0 0 8px ${CYBER.cyan}60` }}>▸ {title}</div>}
      {children}
    </div>
  )
}

// ===== 数值显示 =====
function CyberValue({ value, unit = '', color = CYBER.cyan, size = '16px' }) {
  return (
    <span style={{ fontSize: size, fontWeight: 700, color, textShadow: `0 0 8px ${color}60`, fontVariantNumeric: 'tabular-nums' }}>
      {value}{unit}
    </span>
  )
}

/**
 * 任务管理器 - 赛博朋克 HUD 风格
 */
function TaskManager({ processes, systemStatus, onTerminate, onSuspend, onResume }) {
  const [tab, setTab] = useState('processes')
  const [sortBy, setSortBy] = useState('pid')
  const [sortDir, setSortDir] = useState('asc')
  const [searchText, setSearchText] = useState('')
  const [expandedTrees, setExpandedTrees] = useState(new Set())

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

  useEffect(() => {
    cpuHistoryRef.current = [...cpuHistoryRef.current.slice(1), parseFloat(cpuUsage)]
    memHistoryRef.current = [...memHistoryRef.current.slice(1), parseFloat(memPercent)]
    setCpuHistory([...cpuHistoryRef.current])
    setMemHistory([...memHistoryRef.current])
  }, [cpuUsage, memPercent])

  // 搜索 + 排序
  const filteredProcesses = processes.filter(p => {
    if (!searchText) return true
    const s = searchText.toLowerCase()
    return (p.name && p.name.toLowerCase().includes(s))
      || String(p.pid).includes(s)
      || (p.appType && p.appType.toLowerCase().includes(s))
  })
  const sortedProcesses = [...filteredProcesses].sort((a, b) => {
    let va = a[sortBy], vb = b[sortBy]
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb?.toLowerCase() || '' }
    if (va == null) va = 0; if (vb == null) vb = 0
    return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
  })

  // 构建进程树（根进程 + 子进程）
  const roots = sortedProcesses.filter(p => !p.parentPid || p.parentPid <= 0)
  const childrenMap = {}
  sortedProcesses.filter(p => p.parentPid && p.parentPid > 0).forEach(p => {
    if (!childrenMap[p.parentPid]) childrenMap[p.parentPid] = []
    childrenMap[p.parentPid].push(p)
  })

  // 同名进程同色（按 appType 分组颜色）
  const appColorMap = {}
  const appColors = [CYBER.cyan, '#8b5cf6', CYBER.magenta, CYBER.green, CYBER.yellow]
  let colorIdx = 0
  processes.forEach(p => {
    if (p.appType && !appColorMap[p.appType]) {
      appColorMap[p.appType] = appColors[colorIdx % appColors.length]
      colorIdx++
    }
  })
  const handleSort = (field) => {
    if (sortBy === field) setSortDir(p => p === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('asc') }
  }
  const SortIcon = ({ field }) => sortBy !== field
    ? <span style={{ opacity: 0.3, fontSize: '10px' }}>↕</span>
    : <span style={{ color: CYBER.cyan, textShadow: `0 0 4px ${CYBER.cyan}60` }}>{sortDir === 'asc' ? '↑' : '↓'}</span>

  const MEM_BLOCKS = 64
  const blockSize = memTotal / MEM_BLOCKS
  const memAllocations = systemStatus?.memoryAllocations || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: CYBER.bg, color: CYBER.text }}>

      {/* 标签页 */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${CYBER.border}`, background: 'rgba(0,0,0,0.3)' }}>
        {[{ id: 'processes', label: '进程', icon: '📋' }, { id: 'performance', label: '性能', icon: '📊' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 20px', background: tab === t.id ? CYBER.panelBg : 'transparent',
            border: 'none', borderBottom: tab === t.id ? `2px solid ${CYBER.cyan}` : '2px solid transparent',
            color: tab === t.id ? CYBER.cyan : CYBER.textDim, cursor: 'pointer', fontSize: '13px',
            fontWeight: tab === t.id ? 600 : 400, transition: 'all 0.2s',
            textShadow: tab === t.id ? `0 0 8px ${CYBER.cyan}60` : 'none'
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ===== 进程列表 ===== */}
      {tab === 'processes' && (
        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* 搜索栏 */}
          <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderBottom: `1px solid ${CYBER.border}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: CYBER.cyan }}>🔍</span>
            <input type="text" placeholder="搜索进程名称、PID..." value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ flex: 1, padding: '6px 10px', background: 'rgba(0,240,255,0.05)', border: `1px solid ${CYBER.border}`,
                borderRadius: '4px', color: CYBER.text, fontSize: '12px', outline: 'none' }} />
            {searchText && <button onClick={() => setSearchText('')}
              style={{ background: 'none', border: 'none', color: CYBER.textDim, cursor: 'pointer', fontSize: '14px' }}>✕</button>}
            <span style={{ fontSize: '11px', color: CYBER.textDim }}>{filteredProcesses.length} 项</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(0,240,255,0.03)', position: 'sticky', top: 0 }}>
                {[
                  { key: 'icon', label: '', width: 40 }, { key: 'name', label: '名称', width: 150 },
                  { key: 'pid', label: 'PID', width: 60 }, { key: 'state', label: '状态', width: 70 },
                  { key: 'cpuUsage', label: 'CPU', width: 70 }, { key: 'currentMemoryUsage', label: '内存', width: 80 },
                  { key: 'diskRead', label: '磁盘读', width: 70 }, { key: 'networkSpeed', label: '网络', width: 70 },
                  { key: 'actions', label: '操作', width: 120 },
                ].map(col => (
                  <th key={col.key} onClick={() => col.key !== 'icon' && col.key !== 'actions' && handleSort(col.key)}
                    style={{ padding: '8px 10px', textAlign: 'left', color: sortBy === col.key ? CYBER.cyan : CYBER.textDim,
                      fontWeight: 500, width: col.width,
                      cursor: col.key !== 'icon' && col.key !== 'actions' ? 'pointer' : 'default', userSelect: 'none',
                      borderBottom: sortBy === col.key ? `2px solid ${CYBER.cyan}` : `1px solid ${CYBER.border}`,
                      textShadow: sortBy === col.key ? `0 0 4px ${CYBER.cyan}60` : 'none' }}>
                    {col.label} <SortIcon field={col.key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roots.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: CYBER.textDim }}>
                  暂无运行中的进程<br /><span style={{ fontSize: '11px' }}>双击桌面图标启动应用</span>
                </td></tr>
              ) : roots.map(root => {
                const kids = childrenMap[root.pid] || []
                const isExpanded = expandedTrees.has(root.pid)
                const hasChildren = kids.length > 0
                const processColor = appColorMap[root.appType] || CYBER.cyan

                const renderRow = (p, depth = 0, isChild = false) => (
                  <tr key={p.pid} style={{ borderBottom: `1px solid ${CYBER.border}`, background: isChild ? 'rgba(0,240,255,0.02)' : 'transparent' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,240,255,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = isChild ? 'rgba(0,240,255,0.02)' : 'transparent'}>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      {depth > 0 && <span style={{ color: CYBER.textDim, fontSize: '11px' }}>{'│─'}</span>}
                      {!depth && (hasChildren ? (
                        <span onClick={() => { const next = new Set(expandedTrees); isExpanded ? next.delete(p.pid) : next.add(p.pid); setExpandedTrees(next) }}
                          style={{ cursor: 'pointer', color: CYBER.cyan, fontSize: '12px', userSelect: 'none' }}>{isExpanded ? '▼' : '▶'}</span>
                      ) : <span style={{ color: 'transparent', fontSize: '12px' }}>●</span>)}
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: isChild ? 400 : 500, paddingLeft: `${12 + depth * 16}px` }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: processColor, fontSize: '11px', textShadow: `0 0 4px ${processColor}60` }}>
                          {p.icon || '📱'}
                        </span>
                        {p.name}
                        {hasChildren && !isChild && <span style={{ fontSize: '10px', color: CYBER.textDim, background: 'rgba(0,240,255,0.08)', padding: '1px 5px', borderRadius: '3px' }}>{kids.length} 子进程</span>}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: CYBER.textDim }}>{p.pid}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
                        background: p.state === 'RUNNING' ? CYBER.greenDim : CYBER.yellowDim,
                        color: p.state === 'RUNNING' ? CYBER.green : CYBER.yellow,
                        textShadow: `0 0 6px ${p.state === 'RUNNING' ? CYBER.green : CYBER.yellow}60` }}>
                        {p.state === 'RUNNING' ? '●运行' : '●挂起'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}><CyberValue value={p.cpuUsage?.toFixed(1) || 0} unit="%" color={CYBER.cyan} size="12px" /></td>
                    <td style={{ padding: '8px 12px' }}><CyberValue value={p.currentMemoryUsage || 0} unit="MB" color={CYBER.magenta} size="12px" /></td>
                    <td style={{ padding: '8px 12px', color: CYBER.textDim }}>{p.diskRead || 0}MB/s</td>
                    <td style={{ padding: '8px 12px', color: CYBER.textDim }}>{p.networkSpeed || 0}KB/s</td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {p.state === 'RUNNING' ? (
                          <button onClick={() => onSuspend(p.pid)} style={{ padding: '3px 8px', background: CYBER.yellowDim, color: CYBER.yellow, border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>挂起</button>
                        ) : (
                          <button onClick={() => onResume(p.pid)} style={{ padding: '3px 8px', background: CYBER.greenDim, color: CYBER.green, border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>恢复</button>
                        )}
                        <button onClick={() => { if (confirm(`确定结束 ${p.name}?`)) onTerminate(p.pid) }}
                          style={{ padding: '3px 8px', background: 'rgba(255,51,51,0.15)', color: CYBER.red, border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>结束</button>
                      </div>
                    </td>
                  </tr>
                )

                return (
                  <React.Fragment key={root.pid}>
                    {renderRow(root)}
                    {isExpanded && kids.map(child => renderRow(child, 1, true))}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== 性能监控 HUD ===== */}
      {tab === 'performance' && systemStatus && (
        <div style={{ flex: 1, padding: '16px', overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', alignContent: 'start' }}>

          {/* ═══ 左栏：CPU ═══ */}
          <HudPanel title="CPU MONITOR">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
              <CyberGauge value={parseFloat(cpuUsage)} size={100} label={`${systemStatus.cpuCores} CORES`} color={CYBER.cyan} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '9px', color: CYBER.textDim, letterSpacing: '1px', marginBottom: '4px' }}>USAGE TREND</div>
                <CyberWave data={cpuHistory} color={CYBER.cyan} width={200} height={44} />
              </div>
            </div>
            {/* Equalizer 核心柱状图 */}
            <div style={{ fontSize: '9px', color: CYBER.textDim, letterSpacing: '1px', marginBottom: '6px' }}>CORE EQUALIZER</div>
            <CoreEqualizer cores={systemStatus.coreUsage} maxHeight={72} />
          </HudPanel>

          {/* ═══ 右栏：MEMORY ═══ */}
          <HudPanel title="MEMORY BANK">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
              <CyberGauge value={parseFloat(memPercent)} size={100} label={`${memUsed}/${memTotal}MB`} color={CYBER.magenta} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '9px', color: CYBER.textDim, letterSpacing: '1px', marginBottom: '4px' }}>USAGE TREND</div>
                <CyberWave data={memHistory} color={CYBER.magenta} width={200} height={44} />
              </div>
            </div>
            {/* 内存乐高方块 */}
            <div style={{ fontSize: '9px', color: CYBER.textDim, letterSpacing: '1px', marginBottom: '6px' }}>MEMORY ALLOCATION</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: '2px' }}>
              {Array.from({ length: MEM_BLOCKS }, (_, i) => {
                const isUsed = i < Math.ceil((memUsed / memTotal) * MEM_BLOCKS)
                const colors = [CYBER.cyan, '#8b5cf6', CYBER.magenta, CYBER.yellow, CYBER.green]
                const color = isUsed ? colors[i % colors.length] : 'rgba(0,240,255,0.04)'
                return (
                  <div key={i} style={{
                    aspectRatio: '1', borderRadius: '1px', background: color,
                    transition: 'all 0.3s', opacity: isUsed ? 0.9 : 0.3,
                    boxShadow: isUsed ? `0 0 4px ${color}60` : 'none'
                  }} />
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
              {memAllocations.slice(0, 5).map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: CYBER.textDim }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '1px', background: [CYBER.cyan, '#8b5cf6', CYBER.magenta, CYBER.yellow, CYBER.green][i], boxShadow: `0 0 4px ${[CYBER.cyan, '#8b5cf6', CYBER.magenta, CYBER.yellow, CYBER.green][i]}60` }} />
                  {a.processName} ({a.size}MB)
                </div>
              ))}
            </div>
          </HudPanel>

          {/* ═══ 左下：DISK ═══ */}
          <HudPanel title="DISK I/O">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', color: CYBER.textDim }}>READ</span>
                  <CyberValue value={diskRead} unit=" MB/s" color={CYBER.green} size="13px" />
                </div>
                <div style={{ height: '4px', background: 'rgba(0,255,136,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(diskRead * 5, 100)}%`, background: `linear-gradient(90deg, ${CYBER.green}40, ${CYBER.green})`, borderRadius: '2px', transition: 'width 0.5s', boxShadow: `0 0 6px ${CYBER.green}50` }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', color: CYBER.textDim }}>WRITE</span>
                  <CyberValue value={diskWrite} unit=" MB/s" color={CYBER.yellow} size="13px" />
                </div>
                <div style={{ height: '4px', background: 'rgba(255,215,0,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(diskWrite * 5, 100)}%`, background: `linear-gradient(90deg, ${CYBER.yellow}40, ${CYBER.yellow})`, borderRadius: '2px', transition: 'width 0.5s', boxShadow: `0 0 6px ${CYBER.yellow}50` }} />
                </div>
              </div>
            </div>
          </HudPanel>

          {/* ═══ 右下：NETWORK ═══ */}
          <HudPanel title="NETWORK">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', color: CYBER.textDim }}>SPEED</span>
              <CyberValue value={netSpeed} unit=" KB/s" color="#8b5cf6" size="13px" />
            </div>
            <div style={{ height: '4px', background: 'rgba(139,92,246,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(netSpeed / 10, 100)}%`, background: 'linear-gradient(90deg, #8b5cf640, #8b5cf6)', borderRadius: '2px', transition: 'width 0.5s', boxShadow: '0 0 6px #8b5cf650' }} />
            </div>
          </HudPanel>
        </div>
      )}

      {/* 底部状态栏 */}
      <div style={{ padding: '6px 12px', borderTop: `1px solid ${CYBER.border}`, display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: CYBER.textDim, background: 'rgba(0,0,0,0.3)' }}>
        <span>PROCESSES: {processes.length}</span>
        <span style={{ color: CYBER.green, textShadow: `0 0 4px ${CYBER.green}40` }}>ACTIVE: {processes.filter(p => p.state === 'RUNNING').length}</span>
        <span>SUSPENDED: {processes.filter(p => p.state === 'BLOCKED').length}</span>
      </div>
    </div>
  )
}

export default TaskManager
