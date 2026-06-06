import React, { useState, useEffect, useRef, useCallback, Component } from 'react'

// ===== 错误边界：防止子组件崩溃导致整个任务管理器白屏 =====
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  componentDidCatch(e, info) { console.error('[TaskManager ErrorBoundary]', e, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '20px', color: '#ef4444', fontFamily: 'monospace', fontSize: '11px', background: 'rgba(239,68,68,0.05)', borderRadius: '6px', margin: '8px' }}>
          <div style={{ fontWeight: 700, marginBottom: '6px' }}>⚠ 渲染错误</div>
          <div style={{ color: '#888' }}>{this.state.error.message}</div>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: '8px', padding: '3px 8px', background: 'rgba(239,68,68,0.15)', border: '1px solid #ef444440', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', fontSize: '10px' }}>
            重试
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

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

// ===== 内核面板：队列流程图 + CPU寄存器 + 内存网格 + 中断日志 =====
function KernelPanel({ processes, systemStatus, refreshTrigger }) {
  const [registers, setRegisters] = useState({})
  const [scheduler, setScheduler] = useState({})
  const [interruptLog, setInterruptLog] = useState([])
  const [maawsScores, setMaawsScores] = useState([])
  const safeScores = Array.isArray(maawsScores) ? maawsScores : []

  const fetchData = useCallback(async () => {
    try {
      const [regRes, schedRes, logRes, scoreRes] = await Promise.all([
        fetch('/api/system/registers').then(r => r.json()),
        fetch('/api/system/scheduler').then(r => r.json()),
        fetch('/api/system/interrupt-log').then(r => r.json()),
        fetch('/api/system/maaws-scores').then(r => r.json()),
      ])
      setRegisters(regRes)
      setScheduler(schedRes)
      setInterruptLog(logRes || [])
      setMaawsScores(scoreRes || [])
    } catch (e) { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, 800)
    return () => clearInterval(timer)
  }, [fetchData])

  // 单步触发立即刷新
  useEffect(() => {
    if (refreshTrigger > 0) fetchData()
  }, [refreshTrigger, fetchData])

  const running = scheduler.runningProcess
  const q0 = scheduler.q0 || []
  const q1 = scheduler.q1 || []
  const q2 = scheduler.q2 || []
  const blockedQueue = scheduler.blockedQueue || []
  const currentQL = scheduler.currentQueueLevel ?? -1
  const memUsed = systemStatus?.usedMemory || 0
  const memTotal = systemStatus?.totalMemory || 16384
  const MEM_COLS = 16
  const MEM_ROWS = 8
  const MEM_TOTAL_BLOCKS = MEM_ROWS * MEM_COLS
  const blockSize = memTotal / MEM_TOTAL_BLOCKS
  const memAllocations = systemStatus?.memoryAllocations || []

  const blockOccupancy = new Array(MEM_TOTAL_BLOCKS).fill(null)
  memAllocations.forEach(alloc => {
    const startBlock = Math.floor((alloc.startAddress || 0) / blockSize)
    const endBlock = Math.ceil(((alloc.startAddress || 0) + alloc.size) / blockSize)
    for (let i = startBlock; i < Math.min(endBlock, MEM_TOTAL_BLOCKS); i++) {
      blockOccupancy[i] = alloc
    }
  })

  const blockColors = {}
  const procColors = [CYBER.cyan, '#8b5cf6', CYBER.magenta, CYBER.green, CYBER.yellow]
  let ci = 0
  processes.forEach(p => { if (!blockColors[p.pid]) { blockColors[p.pid] = procColors[ci % procColors.length]; ci++ } })

  // 进程卡片组件
  const ProcessCard = ({ p, compact = false }) => {
    const color = blockColors[p.pid] || CYBER.cyan
    return (
      <div style={{
        background: `${color}15`, border: `1px solid ${color}40`, borderRadius: '6px',
        padding: compact ? '5px 8px' : '8px 10px', minWidth: compact ? '80px' : '110px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: compact ? 0 : '3px' }}>
          <span style={{ fontSize: '11px' }}>{p.icon || '📱'}</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color }}>{p.name}</span>
        </div>
        {!compact && (
          <div style={{ fontSize: '9px', color: CYBER.textDim, fontFamily: 'monospace' }}>
            PID:{p.pid} | PC:{p.programCounter ?? 0}
            {p.currentCodeLine && <div style={{ color: CYBER.text, marginTop: '2px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.currentCodeLine.split(';')[0]}</div>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, padding: '8px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>

      {/* ===== 第一行：就绪队列 → CPU → 阻塞队列 ===== */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'stretch' }}>

        {/* MLFQ三级队列 */}
        <div style={{ flex: '2 1 0', minWidth: 0, display: 'flex', gap: '6px' }}>
          {[
            { name: 'Q0(高)', queue: q0, quantum: 8, color: CYBER.green, level: 0 },
            { name: 'Q1(中)', queue: q1, quantum: 10, color: CYBER.cyan, level: 1 },
            { name: 'Q2(低)', queue: q2, quantum: 16, color: '#eab308', level: 2 },
          ].map(q => (
            <div key={q.level} style={{ flex: '1 1 0', minWidth: 0 }}>
              <div style={{ fontSize: '11px', color: q.color, fontWeight: 700, marginBottom: '4px', opacity: currentQL === q.level ? 1 : 0.6, textShadow: currentQL === q.level ? `0 0 6px ${q.color}40` : 'none' }}>
                {currentQL === q.level ? '▶ ' : ''}{q.name} (片{q.quantum}) [{q.queue.length}]
              </div>
              <div style={{...queueBoxStyle, minHeight: '50px', padding: '4px', borderColor: currentQL === q.level ? q.color + '60' : '#222', background: currentQL === q.level ? q.color + '08' : 'rgba(0,0,0,0.2)'}}>
                {q.queue.length === 0 ? <div style={{...emptyStyle, padding: '10px', fontSize: '10px'}}>空</div> :
                  q.queue.map(p => (
                    <div key={p.pid} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 6px', fontSize: '10px', color: blockColors[p.pid] || CYBER.text, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <span>{p.icon||'📱'}</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      <span style={{ color: CYBER.textDim, fontFamily: 'monospace', fontSize: '8px' }}>{p.pid}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          ))}
        </div>

        {/* 箭头 */}
        <div style={{ display: 'flex', alignItems: 'center', color: CYBER.cyan, flexShrink: 0, marginTop: '14px' }}>
          <svg width="24" height="12" viewBox="0 0 24 12"><path d="M0 6 L18 6" stroke={CYBER.cyan} strokeWidth="2" fill="none"/><path d="M14 2 L22 6 L14 10" stroke={CYBER.cyan} strokeWidth="2" fill="none"/></svg>
        </div>

        {/* CPU */}
        <div style={{ flex: '1.2 1 0', minWidth: 0 }}>
          <div style={sectionTitleStyle(CYBER.green)}>▶ CPU (单核)</div>
          <div style={{
            ...queueBoxStyle,
            border: `1px solid ${running ? CYBER.green + '60' : '#333'}`,
            background: running ? 'rgba(0,255,136,0.04)' : 'rgba(0,0,0,0.2)',
            padding: '4px 6px',
          }}>
            {running ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '11px' }}>{running.icon || '📱'}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: CYBER.green }}>{running.name}</span>
                  <span style={{ fontSize: '9px', color: CYBER.textDim }}>({running.pid})</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', fontSize: '9px', fontFamily: 'monospace', color: CYBER.textDim }}>
                  <span>PC=<b style={{color:CYBER.cyan}}>{running.programCounter ?? 0}</b></span>
                  <span>IR=<b style={{color:'#8b5cf6'}}>{running.ir ?? Math.max(0, (running.programCounter ?? 1) - 1)}</b></span>
                  <span>AX=<b style={{color:CYBER.green}}>{running.savedAx ?? 0}</b></span>
                </div>
                {running.currentCodeLine && (
                  <div style={{ fontSize: '9px', fontFamily: 'monospace', color: CYBER.text, padding: '2px 4px', background: 'rgba(0,255,136,0.06)', borderRadius: '2px', marginTop: '2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    ▸ {running.currentCodeLine.split(';')[0]}
                  </div>
                )}
              </div>
            ) : <div style={emptyStyle}>空闲</div>}
          </div>
        </div>

        {/* 箭头 */}
        <div style={{ display: 'flex', alignItems: 'center', color: '#444', flexShrink: 0, marginTop: '14px' }}>
          <svg width="24" height="12" viewBox="0 0 24 12"><path d="M0 6 L18 6" stroke="#444" strokeWidth="2" fill="none"/><path d="M14 2 L22 6 L14 10" stroke="#444" strokeWidth="2" fill="none"/></svg>
        </div>

        {/* 阻塞队列 */}
        <div style={{ flex: '1 1 0', minWidth: 0 }}>
          <div style={sectionTitleStyle(CYBER.magenta)}>⏸ 阻塞 ({blockedQueue.length})</div>
          <div style={{...queueBoxStyle, minHeight: '28px', padding: '3px'}}>
            {blockedQueue.length === 0 ? <div style={emptyStyle}>空</div> :
              <table style={miniTableStyle}><thead><tr>
                <th style={thStyle}>PID</th><th style={thStyle}>名称</th><th style={thStyle}>原因</th>
              </tr></thead><tbody>
                {blockedQueue.map(p => (
                  <tr key={p.pid} style={trStyle}>
                    <td style={tdStyle}>{p.pid}</td>
                    <td style={{...tdStyle, color: blockColors[p.pid] || CYBER.magenta, whiteSpace:'nowrap'}}>{p.icon||'📱'} {p.name}</td>
                    <td style={{...tdStyle, color: CYBER.magenta, fontSize:'9px'}}>{p.blockedReason || '等待'}</td>
                  </tr>
                ))}
              </tbody></table>
            }
          </div>
        </div>
      </div>

      {/* ===== 第二行：左侧=进程列表+寄存器，右侧=内存 ===== */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {/* 左侧：进程列表 */}
        <div style={{ flex: '1.2 1 0', minWidth: 0 }}>
          <div style={sectionTitleStyle(CYBER.cyan)}>📋 进程列表 ({(processes||[]).filter(p=>p.state!=='TERMINATED').length})</div>
          <div style={{...queueBoxStyle, maxHeight: '140px', overflow: 'auto', padding: '3px'}}>
            <table style={miniTableStyle}><thead><tr>
              <th style={thStyle}>PID</th><th style={thStyle}>名称</th><th style={thStyle}>状态</th>
              <th style={thStyle}>PC</th><th style={thStyle}>当前指令</th>
              <th style={thStyle}>内存</th>
            </tr></thead><tbody>
              {(processes||[]).filter(p => p.state !== 'TERMINATED').map(p => (
                <tr key={p.pid} style={{...trStyle, background: p.state === 'RUNNING' ? 'rgba(0,255,136,0.04)' : 'transparent'}}>
                  <td style={tdStyle}>{p.pid}</td>
                  <td style={{...tdStyle, color: blockColors[p.pid] || CYBER.cyan, whiteSpace:'nowrap'}}>{p.icon||'📱'} {p.name}</td>
                  <td style={tdStyle}><span style={{color: stateColor[p.state] || '#666', fontSize: '9px', fontWeight: 600}}>{stateLabel[p.state] || p.state}</span></td>
                  <td style={{...tdStyle, fontFamily: 'monospace', fontSize:'9px'}}>{p.programCounter ?? 0}</td>
                  <td style={{...tdStyle, fontFamily: 'monospace', fontSize:'9px', color: CYBER.textDim}}>{p.ir ?? Math.max(0, (p.programCounter ?? 1) - 1)}</td>
                  <td style={{...tdStyle, fontFamily: 'monospace', fontSize:'8px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: p.state === 'RUNNING' ? CYBER.text : CYBER.textDim}}>
                    {p.currentCodeLine ? p.currentCodeLine.split(';')[0] : '-'}
                  </td>
                  <td style={{...tdStyle, fontSize:'9px'}}>{p.currentMemoryUsage || 0}MB</td>
                </tr>
              ))}
              {(processes||[]).filter(p => p.state !== 'TERMINATED').length === 0 && (
                <tr><td colSpan={7} style={emptyStyle}>无活跃进程</td></tr>
              )}
            </tbody></table>
          </div>
        </div>

        {/* 右侧：内存 + 寄存器 */}
        <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* 内存网格 */}
          <div>
            <div style={sectionTitleStyle('#06b6d4')}>🧠 内存 ({memUsed}/{memTotal}MB)</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${MEM_COLS}, 1fr)`, gap: '1px', background: '#111', borderRadius: '3px', padding: '2px' }}>
              {Array.from({ length: MEM_TOTAL_BLOCKS }).map((_, i) => {
                const alloc = blockOccupancy[i]
                return (
                  <div key={i}
                    title={alloc ? `${alloc.processName}(PID:${alloc.pid}) 块${i}` : `空闲 块${i}`}
                    style={{
                      width: '100%', paddingBottom: '50%', position: 'relative',
                      background: alloc ? (blockColors[alloc.pid] || CYBER.cyan) : 'rgba(255,255,255,0.04)',
                      borderRadius: '1px',
                    }}>
                    <div style={{ position: 'absolute', inset: 0 }} />
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px', fontSize: '8px' }}>
              {memAllocations.map((a, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '1px', background: blockColors[a.pid] || CYBER.cyan, display: 'inline-block' }} />
                  <span style={{ color: CYBER.textDim }}>{a.processName}</span>
                </span>
              ))}
            </div>
          </div>
          {/* 寄存器 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>
            {[
              { l: 'PC', v: registers.pc ?? '-', c: CYBER.cyan },
              { l: 'IR', v: registers.ir ?? '-', c: '#8b5cf6' },
              { l: 'AX', v: registers.ax ?? '-', c: CYBER.green },
              { l: 'BX', v: registers.bx ?? '-', c: CYBER.yellow },
              { l: 'CX', v: registers.cx ?? '-', c: CYBER.magenta },
              { l: 'DX', v: registers.dx ?? '-', c: '#06b6d4' },
            ].map(r => (
              <div key={r.l} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '2px', padding: '2px 4px', textAlign: 'center' }}>
                <div style={{ fontSize: '7px', color: CYBER.textDim, letterSpacing: '1px' }}>{r.l}</div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: r.c, fontFamily: 'monospace' }}>{r.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MLFQ调度信息 */}
      <div>
        <div style={sectionTitleStyle('#eab308')}>📊 MLFQ — Q0(4tick高) → Q1(8tick中) → Q2(16tick低) | 老化:30tick升级</div>
        <div style={{...queueBoxStyle, overflow: 'auto', padding: '3px'}}>
          <table style={miniTableStyle}><thead><tr>
            <th style={thStyle}>#</th><th style={thStyle}>PID</th><th style={thStyle}>名称</th>
            <th style={thStyle}>状态</th><th style={thStyle}>队列</th><th style={thStyle}>时间片</th>
            <th style={thStyle}>已用</th><th style={thStyle}>等待</th><th style={thStyle}>剩余</th>
          </tr></thead><tbody>
            {safeScores.map((s, i) => (
              <tr key={s.pid} style={{...trStyle, background: s.isRunning ? 'rgba(0,255,136,0.06)' : 'transparent'}}>
                <td style={{...tdStyle, color: i === 0 ? '#eab308' : CYBER.textDim}}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</td>
                <td style={tdStyle}>{s.pid}</td>
                <td style={{...tdStyle, color: s.isRunning ? CYBER.green : CYBER.text, whiteSpace:'nowrap'}}>{s.name}{s.isRunning && ' ▶'}</td>
                <td style={tdStyle}><span style={{color: stateColor[s.state]||'#666', fontSize:'9px'}}>{stateLabel[s.state]}</span></td>
                <td style={{...tdStyle, color: s.queueLevel === 0 ? CYBER.green : s.queueLevel === 1 ? CYBER.cyan : '#eab308', fontWeight: 600}}>Q{s.queueLevel}</td>
                <td style={tdStyle}>{s.quantum}t</td>
                <td style={tdStyle}>{s.timeUsed}t</td>
                <td style={tdStyle}>{s.waitTicks}t</td>
                <td style={tdStyle}>{s.remainingInstructions}条</td>
              </tr>
            ))}
            {safeScores.length === 0 && <tr><td colSpan={9} style={emptyStyle}>无</td></tr>}
          </tbody></table>
        </div>
      </div>

      {/* 中断日志 */}
      <HudPanel title="📜 运行日志">
        <div style={{ maxHeight: '120px', overflow: 'auto', fontSize: '9px', fontFamily: 'monospace' }}>
          {(interruptLog || []).length === 0 && <div style={emptyStyle}>暂无</div>}
          {(interruptLog || []).slice(-15).reverse().map((e, i) => {
            const c = { SCHEDULE:'#8b5cf6', PREEMPT:CYBER.magenta, TIMEOUT:CYBER.yellow, ARRIVAL:CYBER.green, BLOCK:CYBER.red, TERMINATED:'#666', SUSPEND:CYBER.red, RESUME:CYBER.green, KILL:CYBER.red }[e.type] || CYBER.textDim
            return (
              <div key={i} style={{ display: 'flex', gap: '4px', padding: '1px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ color: '#555', minWidth: '22px' }}>T{e.tick}</span>
                <span style={{ color: c, minWidth: '60px', fontWeight: 600 }}>{e.type}</span>
                <span style={{ color: CYBER.text, flex: 1 }}>{e.description}</span>
              </div>
            )
          })}
        </div>
      </HudPanel>
    </div>
  )
}

// ===== 暂停/恢复/单步控制 =====
function PauseControls({ onRefresh }) {
  const [isPaused, setIsPaused] = useState(false)
  const [autoPause, setAutoPause] = useState(false)
  const [tick, setTick] = useState(0)

  const refreshState = async () => {
    try {
      const d = await fetch('/api/system/scheduler').then(r => r.json())
      setIsPaused(d.paused || false)
      setTick(d.clockTick || 0)
    } catch (e) {}
  }

  useEffect(() => { refreshState() }, [])

  // 连续播放：未暂停且非单步模式时，定时调用 run 推进仿真
  useEffect(() => {
    if (isPaused || autoPause) return  // 暂停或单步模式 → 不自动推进
    const timer = setInterval(async () => {
      try {
        const res = await fetch('/api/system/run', { method: 'POST' })
        const d = await res.json()
        setTick(d.clockTick || 0)
        if (d.paused) setIsPaused(true)
      } catch (e) {}
    }, 300) // 每300ms一个tick，约3.3倍速
    return () => clearInterval(timer)
  }, [isPaused, autoPause])

  const togglePause = async () => {
    try {
      await fetch('/api/system/pause', { method: 'POST' })
      await refreshState()
    } catch (e) {}
  }

  const toggleAutoPause = async () => {
    try {
      const res = await fetch('/api/system/auto-pause', { method: 'POST' }).then(r => r.json())
      setAutoPause(res.autoPause ?? false)
      setIsPaused(res.paused ?? false)
    } catch (e) {}
  }

  const doStep = async () => {
    try {
      await fetch('/api/system/step', { method: 'POST' })
      setIsPaused(true)
      await refreshState()
      if (onRefresh) onRefresh()
    } catch (e) {}
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 8px' }}>
      <span style={{ fontSize: '10px', color: CYBER.textDim, fontFamily: 'monospace' }}>T{tick}</span>
      <button onClick={toggleAutoPause} style={{
        padding: '3px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 600,
        background: autoPause ? 'rgba(139,92,246,0.2)' : 'rgba(100,100,100,0.1)',
        color: autoPause ? '#8b5cf6' : '#555',
        boxShadow: autoPause ? '0 0 6px #8b5cf630' : 'none',
      }}>
        {autoPause ? '📍单步模式' : '📍连续'}
      </button>
      {autoPause ? (
        <button onClick={doStep} style={{
          padding: '3px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer',
          fontSize: '10px', fontWeight: 600,
          background: 'rgba(0,240,255,0.15)', color: CYBER.cyan,
        }}>
          ⏭ 单步
        </button>
      ) : (
        <button onClick={togglePause} style={{
          padding: '3px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 600,
          background: isPaused ? 'rgba(0,255,136,0.15)' : 'rgba(255,215,0,0.15)',
          color: isPaused ? CYBER.green : CYBER.yellow,
        }}>
          {isPaused ? '▶ 恢复' : '⏸ 暂停'}
        </button>
      )}
    </div>
  )
}

// ===== PCB详情字段 =====
function PcbField({ label, value, color = CYBER.text }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '4px', padding: '6px 8px' }}>
      <div style={{ fontSize: '9px', color: CYBER.textDim, marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: 600, color, fontFamily: 'monospace' }}>{value}</div>
    </div>
  )
}

// ===== 内核面板通用样式 =====
const stateLabel = { RUNNING: '运行', READY: '就绪', BLOCKED: '阻塞', TERMINATED: '结束' }
const stateColor = { RUNNING: CYBER.green, READY: CYBER.cyan, BLOCKED: CYBER.magenta, TERMINATED: '#666' }
const sectionTitleStyle = (color) => ({
  fontSize: '10px', color, letterSpacing: '1px', marginBottom: '4px',
  textShadow: `0 0 6px ${color}40`, fontWeight: 600,
})
const queueBoxStyle = {
  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,240,255,0.08)',
  borderRadius: '6px', padding: '6px', minHeight: '36px',
}
const emptyStyle = { color: '#444', fontSize: '10px', textAlign: 'center', padding: '8px' }
const miniTableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '10px' }
const thStyle = { padding: '3px 6px', textAlign: 'left', color: CYBER.textDim, fontWeight: 500, borderBottom: `1px solid ${CYBER.border}`, fontSize: '9px' }
const tdStyle = { padding: '3px 6px', color: CYBER.text, borderBottom: '1px solid rgba(255,255,255,0.03)' }
const trStyle = { }

/**
 * 任务管理器 - 赛博朋克 HUD 风格
 */
function TaskManager({ processes, systemStatus, onTerminate, onSuspend, onResume }) {
  const [tab, setTab] = useState('processes')
  const [sortBy, setSortBy] = useState('pid')
  const [sortDir, setSortDir] = useState('asc')
  const [searchText, setSearchText] = useState('')
  const [expandedTrees, setExpandedTrees] = useState(new Set())
  const [selectedProcess, setSelectedProcess] = useState(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

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

      {/* 标签页 + 控制按钮 */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${CYBER.border}`, background: 'rgba(0,0,0,0.3)', alignItems: 'center' }}>
        <div style={{ display: 'flex' }}>
          {[{ id: 'processes', label: '进程', icon: '📋' }, { id: 'kernel', label: '内核', icon: '⚙️' }, { id: 'performance', label: '性能', icon: '📊' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '10px 20px', background: tab === t.id ? CYBER.panelBg : 'transparent',
              border: 'none', borderBottom: tab === t.id ? `2px solid ${CYBER.cyan}` : '2px solid transparent',
              color: tab === t.id ? CYBER.cyan : CYBER.textDim, cursor: 'pointer', fontSize: '13px',
              fontWeight: tab === t.id ? 600 : 400, transition: 'all 0.2s',
              textShadow: tab === t.id ? `0 0 8px ${CYBER.cyan}60` : 'none'
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <PauseControls onRefresh={() => setRefreshTrigger(t => t + 1)} />
        <button onClick={async () => { if (confirm('确定重置系统？所有进程将被清除')) { await fetch('/api/system/reset', { method: 'POST' }); window.location.reload() } }}
          style={{ padding: '3px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 600, background: 'rgba(239,68,68,0.15)', color: '#ef4444', marginLeft: '4px' }}>
          ↺ 重置
        </button>
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
                  { key: 'icon', label: '', width: 40 }, { key: 'name', label: '名称', width: 130 },
                  { key: 'pid', label: 'PID', width: 50 }, { key: 'state', label: '状态', width: 65 },
                  { key: 'pc', label: 'PC', width: 40 }, { key: 'ir', label: 'IR', width: 35 }, { key: 'currentCodeLine', label: '当前指令', width: 160 },
                  { key: 'currentMemoryUsage', label: '内存', width: 70 },
                  { key: 'device', label: '设备', width: 90 },
                  { key: 'actions', label: '操作', width: 100 },
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
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: CYBER.textDim }}>
                  暂无运行中的进程<br /><span style={{ fontSize: '11px' }}>双击桌面图标启动应用</span>
                </td></tr>
              ) : roots.map(root => {
                const kids = childrenMap[root.pid] || []
                const isExpanded = expandedTrees.has(root.pid)
                const hasChildren = kids.length > 0
                const processColor = appColorMap[root.appType] || CYBER.cyan

                const renderRow = (p, depth = 0, isChild = false) => (
                  <tr key={p.pid} style={{ borderBottom: `1px solid ${CYBER.border}`, background: isChild ? 'rgba(0,240,255,0.02)' : 'transparent', cursor: 'pointer' }}
                    onClick={() => setSelectedProcess(selectedProcess?.pid === p.pid ? null : p)}
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
                      {(() => {
                        const stateMap = {
                          RUNNING: { bg: CYBER.greenDim, color: CYBER.green, label: '●运行' },
                          READY: { bg: 'rgba(0,240,255,0.1)', color: CYBER.cyan, label: '●就绪' },
                          BLOCKED: { bg: 'rgba(255,45,123,0.15)', color: CYBER.magenta, label: '●阻塞' },
                          TERMINATED: { bg: 'rgba(100,100,100,0.15)', color: '#666', label: '●结束' },
                        }
                        const s = stateMap[p.state] || stateMap.READY
                        return <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '11px', background: s.bg, color: s.color, textShadow: `0 0 6px ${s.color}60` }}>{s.label}</span>
                      })()}
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '12px', color: p.state === 'RUNNING' ? CYBER.green : CYBER.textDim }}>
                      {p.programCounter ?? 0}
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px', color: p.state === 'RUNNING' ? CYBER.text : CYBER.textDim, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.currentCodeLine || <span style={{ color: '#444' }}>-</span>}
                    </td>
                    <td style={{ padding: '8px 12px' }}><CyberValue value={p.currentMemoryUsage || 0} unit="MB" color={CYBER.magenta} size="12px" /></td>
                    <td style={{ padding: '8px 12px', fontSize: '11px' }}>
                      {p.occupiedDevice ? (
                        <span style={{ color: CYBER.green, textShadow: `0 0 4px ${CYBER.green}40` }}>
                          {p.occupiedDevice === '打印机' ? '🖨️' : p.occupiedDevice === '耳机' ? '🎧' : '💾'} {p.occupiedDevice}
                        </span>
                      ) : p.blockedReason ? (
                        <span style={{ color: CYBER.magenta, textShadow: `0 0 4px ${CYBER.magenta}40` }}>
                          ⏸ {p.blockedReason}
                        </span>
                      ) : (
                        <span style={{ color: '#444' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {p.state === 'RUNNING' ? (
                          <button onClick={() => onSuspend(p.pid)} style={{ padding: '3px 8px', background: CYBER.yellowDim, color: CYBER.yellow, border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>挂起</button>
                        ) : p.state !== 'TERMINATED' ? (
                          <button onClick={() => onResume(p.pid)} style={{ padding: '3px 8px', background: CYBER.greenDim, color: CYBER.green, border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>恢复</button>
                        ) : null}
                        {p.state !== 'TERMINATED' && (
                          <button onClick={() => { if (confirm(`确定结束 ${p.name}?`)) onTerminate(p.pid) }}
                            style={{ padding: '3px 8px', background: 'rgba(255,51,51,0.15)', color: CYBER.red, border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>结束</button>
                        )}
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

      {/* ===== 内核面板：CPU寄存器 + 内存网格 + 调度队列 + 中断日志 ===== */}
      {tab === 'kernel' && (
        <ErrorBoundary key="kernel-panel">
          <KernelPanel processes={processes} systemStatus={systemStatus} refreshTrigger={refreshTrigger} />
        </ErrorBoundary>
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

      {/* PCB详情弹窗 */}
      {selectedProcess && (() => {
        const live = processes.find(p => p.pid === selectedProcess.pid) || selectedProcess
        const pc = live.programCounter ?? 0
        return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setSelectedProcess(null)}>
          <div style={{ background: '#0a1628', border: `1px solid ${CYBER.cyan}40`, borderRadius: '12px', padding: '20px', minWidth: '400px', maxWidth: '500px', boxShadow: `0 0 30px ${CYBER.cyan}20` }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>{live.icon || '📱'}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: CYBER.text }}>{live.name}</span>
                <span style={{ fontSize: '11px', color: CYBER.textDim }}>(PID:{live.pid})</span>
              </div>
              <button onClick={() => setSelectedProcess(null)} style={{ background: 'none', border: 'none', color: CYBER.textDim, fontSize: '16px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
              <PcbField label="进程ID" value={live.pid} />
              <PcbField label="状态" value={stateLabel[live.state] || live.state} color={stateColor[live.state]} />
              <PcbField label="优先级" value={live.priority} />
              <PcbField label="内存" value={`${live.currentMemoryUsage || 0}MB`} color={CYBER.magenta} />
              <PcbField label="PC" value={pc} color={CYBER.cyan} />
              <PcbField label="IR" value={Math.max(0, pc - 1)} color="#8b5cf6" />
              <PcbField label="代码段" value={`${live.codeSegment?.length || 0} 条`} />
              <PcbField label="父进程" value={live.parentPid > 0 ? `PID:${live.parentPid}` : '无'} />
            </div>
            {live.currentCodeLine && (
              <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(0,255,136,0.06)', borderRadius: '6px', border: `1px solid ${CYBER.green}30` }}>
                <div style={{ fontSize: '10px', color: CYBER.green, marginBottom: '4px' }}>当前执行</div>
                <div style={{ fontFamily: 'monospace', fontSize: '13px', color: CYBER.text }}>{live.currentCodeLine.split(';')[0]}</div>
              </div>
            )}
            {live.codeSegment && live.codeSegment.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '10px', color: CYBER.textDim, marginBottom: '4px' }}>代码段</div>
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '6px', fontFamily: 'monospace', fontSize: '10px', maxHeight: '200px', overflow: 'auto' }}>
                  {live.codeSegment.map((line, i) => (
                    <div key={i} style={{ padding: '1px 0', color: i === pc ? CYBER.cyan : i < pc ? '#555' : CYBER.textDim, background: i === pc ? 'rgba(0,240,255,0.08)' : 'transparent' }}>
                      <span style={{ color: '#444', marginRight: '6px' }}>{i}</span>{line.split(';')[0]}
                    </div>
                  ))}
                  <div style={{ color: '#555', padding: '2px 0', fontSize: '9px' }}>共 {live.codeSegment.length} 条指令</div>
                </div>
              </div>
            )}
          </div>
        </div>
        )})()}

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
