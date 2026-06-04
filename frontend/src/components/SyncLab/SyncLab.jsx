import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = '/api/sync-lab'

// ===== 生产者消费者组件（多线程版） =====
function ProducerConsumer() {
  const [status, setStatus] = useState({ buffer: [], empty: 8, full: 0, mutex: 1, producerCount: 0, consumerCount: 0, producerStates: {}, consumerStates: {}, isRunning: false, log: [] })
  const [numProducers, setNumProducers] = useState(2)
  const [numConsumers, setNumConsumers] = useState(2)
  const timerRef = React.useRef(null)

  const fetchStatus = useCallback(async () => {
    try { const r = await axios.get(`${API}/pc/status`); setStatus(r.data) } catch {}
  }, [])

  useEffect(() => { axios.post(`${API}/pc/init`); fetchStatus() }, [fetchStatus])

  // 定时刷新状态
  useEffect(() => {
    timerRef.current = setInterval(fetchStatus, 800)
    return () => clearInterval(timerRef.current)
  }, [fetchStatus])

  const start = async () => {
    await axios.post(`${API}/pc/start`, { producers: numProducers, consumers: numConsumers })
    fetchStatus()
  }
  const stop = async () => { await axios.post(`${API}/pc/stop`); fetchStatus() }
  const reset = async () => { await axios.post(`${API}/pc/stop`); await axios.post(`${API}/pc/init`); fetchStatus() }

  const stateColor = (s) => {
    if (!s) return '#555'
    if (s.includes('BLOCKED')) return '#ef4444'
    if (s.includes('PRODUC') || s.includes('CONSUM')) return '#22c55e'
    if (s.includes('WAITING')) return '#f59e0b'
    return '#555'
  }
  const stateLabel = (s) => {
    if (!s) return '空闲'
    if (s === 'IDLE') return '空闲'
    if (s.includes('BLOCKED')) return '阻塞'
    if (s.includes('PRODUC')) return '生产中'
    if (s.includes('CONSUM')) return '消费中'
    if (s.includes('WAITING')) return '等待'
    return s
  }

  const producerStates = status.producerStates || {}
  const consumerStates = status.consumerStates || {}
  const producerIds = Object.keys(producerStates).map(Number).sort()
  const consumerIds = Object.keys(consumerStates).map(Number).sort()

  return (
    <div style={{ padding: '16px' }}>
      {/* 信号量监视器 */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', justifyContent: 'center' }}>
        {[
          { label: 'mutex', value: status.mutex, color: '#f59e0b' },
          { label: 'empty', value: status.empty, color: '#22c55e' },
          { label: 'full', value: status.full, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 16px', border: `1px solid ${s.color}30` }}>
            <div style={{ fontSize: '9px', color: '#888', letterSpacing: '1px' }}>{s.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: s.color, textShadow: `0 0 8px ${s.color}40` }}>{s.value}</div>
          </div>
        ))}
        <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 16px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '9px', color: '#888', letterSpacing: '1px' }}>守恒</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: status.empty + status.full === 8 ? '#22c55e' : '#ef4444' }}>{status.empty}+{status.full}={status.empty + status.full}</div>
        </div>
      </div>

      {/* 多线程生产者/消费者可视化 */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', justifyContent: 'center' }}>
        {/* 生产者区域 */}
        <div style={{ textAlign: 'center', minWidth: '120px' }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px', letterSpacing: '1px' }}>🏭 PRODUCERS</div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {producerIds.map(id => {
              const s = producerStates[id]
              const blocked = s && s.includes('BLOCKED')
              return (
                <div key={id} style={{ textAlign: 'center', minWidth: '50px' }}>
                  <div style={{ fontSize: '24px', filter: blocked ? 'grayscale(1) brightness(0.5)' : 'none', transition: '0.3s' }}>🏭</div>
                  <div style={{ fontSize: '9px', color: stateColor(s) }}>{stateLabel(s)}</div>
                  <div style={{ fontSize: '8px', color: '#555' }}>P{id}</div>
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>已生产: {status.producerCount}</div>
        </div>

        {/* 箭头 */}
        <div style={{ color: '#555', fontSize: '20px', alignSelf: 'center' }}>→</div>

        {/* 缓冲区 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '9px', color: '#888', marginBottom: '4px', letterSpacing: '1px' }}>BUFFER [N=8]</div>
          <div style={{ display: 'flex', gap: '3px', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            {(status.buffer || []).map((filled, i) => (
              <div key={i} style={{
                width: '26px', height: '26px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: filled ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${filled ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.06)'}`,
                transition: 'all 0.3s', fontSize: '11px'
              }}>{filled ? '📦' : ''}</div>
            ))}
          </div>
          <div style={{ fontSize: '9px', color: '#555', marginTop: '4px' }}>empty={status.empty} full={status.full}</div>
        </div>

        {/* 箭头 */}
        <div style={{ color: '#555', fontSize: '20px', alignSelf: 'center' }}>→</div>

        {/* 消费者区域 */}
        <div style={{ textAlign: 'center', minWidth: '120px' }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px', letterSpacing: '1px' }}>🛒 CONSUMERS</div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {consumerIds.map(id => {
              const s = consumerStates[id]
              const blocked = s && s.includes('BLOCKED')
              return (
                <div key={id} style={{ textAlign: 'center', minWidth: '50px' }}>
                  <div style={{ fontSize: '24px', filter: blocked ? 'grayscale(1) brightness(0.5)' : 'none', transition: '0.3s' }}>🛒</div>
                  <div style={{ fontSize: '9px', color: stateColor(s) }}>{stateLabel(s)}</div>
                  <div style={{ fontSize: '8px', color: '#555' }}>C{id}</div>
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>已消费: {status.consumerCount}</div>
        </div>
      </div>

      {/* 控制面板 */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '8px' }}>
          <span style={{ fontSize: '11px', color: '#888' }}>生产者:</span>
          <input type="number" value={numProducers} onChange={e => setNumProducers(Math.max(1, Math.min(5, +e.target.value || 1)))} min={1} max={5}
            style={{ width: '36px', padding: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#e0f0ff', fontSize: '11px', textAlign: 'center' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '8px' }}>
          <span style={{ fontSize: '11px', color: '#888' }}>消费者:</span>
          <input type="number" value={numConsumers} onChange={e => setNumConsumers(Math.max(1, Math.min(5, +e.target.value || 1)))} min={1} max={5}
            style={{ width: '36px', padding: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#e0f0ff', fontSize: '11px', textAlign: 'center' }} />
        </div>
        <button onClick={status.isRunning ? stop : start} style={{
          padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
          background: status.isRunning ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
          color: status.isRunning ? '#ef4444' : '#22c55e',
          border: `1px solid ${status.isRunning ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`
        }}>{status.isRunning ? '⏹ 停止' : '▶ 启动多线程'}</button>
        <button onClick={reset} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.05)', color: '#888', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>↺ 重置</button>
      </div>

      {/* 守恒验证 */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', color: status.empty + status.full === 8 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
          {status.empty + status.full === 8 ? '✅ empty + full = 8 守恒成立' : '❌ 守恒被破坏！empty + full = ' + (status.empty + status.full)}
        </span>
      </div>

      {/* 运行日志 */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '10px', maxHeight: '180px', overflow: 'auto', fontFamily: 'monospace', fontSize: '10px' }}>
        <div style={{ color: '#555', marginBottom: '6px', fontSize: '9px', letterSpacing: '1px' }}>PV 操作日志</div>
        {(status.log || []).slice(-20).reverse().map((log, i) => (
          <div key={i} style={{ padding: '2px 0', color: log.includes('阻塞') ? '#ef4444' : log.includes('放入') ? '#22c55e' : log.includes('取出') ? '#3b82f6' : '#666', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>{log}</div>
        ))}
      </div>
    </div>
  )
}

// ===== 主组件 =====
function SyncLab() {
  const [activeTab, setActiveTab] = useState('pc')

  const tabs = [
    { id: 'pc', label: '生产者消费者', icon: '🏭' },
    { id: 'rw', label: '读者写者', icon: '📖' },
    { id: 'dp', label: '哲学家进餐', icon: '🍽️' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0a0f', color: '#e0f0ff' }}>
      {/* 标签页 */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '10px 20px', background: activeTab === tab.id ? 'rgba(255,255,255,0.05)' : 'transparent',
            border: 'none', borderBottom: activeTab === tab.id ? '2px solid #8b5cf6' : '2px solid transparent',
            color: activeTab === tab.id ? '#e0f0ff' : '#888', cursor: 'pointer', fontSize: '13px',
            fontWeight: activeTab === tab.id ? 600 : 400, transition: 'all 0.2s'
          }}>{tab.icon} {tab.label}</button>
        ))}
      </div>

      {/* 内容 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'pc' && <ProducerConsumer />}
        {activeTab === 'rw' && <ReaderWriter />}
        {activeTab === 'dp' && <DiningPhilosophers />}
      </div>
    </div>
  )
}

// ===== 读者写者组件 =====
function ReaderWriter() {
  const [status, setStatus] = useState({ readCount: 0, isWriting: false, readerStates: ['IDLE','IDLE','IDLE'], writerStates: ['IDLE','IDLE'], log: [] })

  const fetchStatus = useCallback(async () => {
    try { const r = await axios.get(`${API}/rw/status`); setStatus(r.data) } catch {}
  }, [])

  useEffect(() => { axios.post(`${API}/rw/init`); fetchStatus() }, [fetchStatus])

  const read = async (i) => { await axios.post(`${API}/rw/read/${i}`); fetchStatus() }
  const readFinish = async (i) => { await axios.post(`${API}/rw/read-finish/${i}`); fetchStatus() }
  const write = async (i) => { await axios.post(`${API}/rw/write/${i}`); fetchStatus() }
  const writeFinish = async (i) => { await axios.post(`${API}/rw/write-finish/${i}`); fetchStatus() }
  const reset = async () => { await axios.post(`${API}/rw/init`); fetchStatus() }

  const stateColor = (s) => s === 'READING' ? '#3b82f6' : s === 'WRITING' ? '#ef4444' : s === 'BLOCKED' ? '#f59e0b' : '#555'
  const stateLabel = (s) => s === 'READING' ? '读取中' : s === 'WRITING' ? '写入中' : s === 'BLOCKED' ? '阻塞' : '空闲'

  return (
    <div style={{ padding: '16px' }}>
      {/* 信号量 */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 16px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '9px', color: '#888', letterSpacing: '1px' }}>readcount</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>{status.readCount}</div>
        </div>
        <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 16px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '9px', color: '#888', letterSpacing: '1px' }}>wrt (互斥锁)</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: status.isWriting ? '#ef4444' : '#22c55e' }}>{status.isWriting ? '0' : '1'}</div>
        </div>
      </div>

      {/* 主视图 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', justifyContent: 'center' }}>
        {/* 读者 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px', letterSpacing: '1px' }}>READERS</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(status.readerStates || []).map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', filter: s === 'BLOCKED' ? 'grayscale(1)' : 'none', transition: '0.3s' }}>📖</div>
                <div style={{ fontSize: '10px', color: stateColor(s) }}>{stateLabel(s)}</div>
                <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
                  {s === 'IDLE' && <button onClick={() => read(i)} style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>读</button>}
                  {s === 'READING' && <button onClick={() => readFinish(i)} style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', color: '#888', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>完</button>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 共享数据库 */}
        <div style={{ textAlign: 'center', padding: '20px', minWidth: '100px' }}>
          <div style={{
            fontSize: '40px', transition: '0.3s',
            filter: status.isWriting ? 'drop-shadow(0 0 12px rgba(239,68,68,0.6))' : status.readCount > 0 ? 'drop-shadow(0 0 12px rgba(59,130,246,0.6))' : 'none'
          }}>🗄️</div>
          <div style={{ fontSize: '11px', color: status.isWriting ? '#ef4444' : status.readCount > 0 ? '#3b82f6' : '#888', marginTop: '4px' }}>
            {status.isWriting ? '🔴 锁定写入' : status.readCount > 0 ? `🔵 ${status.readCount} 个读者` : '⚪ 空闲'}
          </div>
        </div>

        {/* 写者 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px', letterSpacing: '1px' }}>WRITERS</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(status.writerStates || []).map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', filter: s === 'BLOCKED' ? 'grayscale(1)' : 'none', transition: '0.3s' }}>✏️</div>
                <div style={{ fontSize: '10px', color: stateColor(s) }}>{stateLabel(s)}</div>
                <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
                  {s === 'IDLE' && <button onClick={() => write(i)} style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>写</button>}
                  {s === 'WRITING' && <button onClick={() => writeFinish(i)} style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', color: '#888', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>完</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '12px' }}>
        <button onClick={reset} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.05)', color: '#888', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>↺ 重置</button>
      </div>

      {/* 日志 */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '10px', maxHeight: '150px', overflow: 'auto', fontFamily: 'monospace', fontSize: '11px' }}>
        <div style={{ color: '#555', marginBottom: '6px', fontSize: '10px', letterSpacing: '1px' }}>运行日志</div>
        {(status.log || []).slice(-15).reverse().map((log, i) => (
          <div key={i} style={{ padding: '2px 0', color: '#666', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>{log}</div>
        ))}
      </div>
    </div>
  )
}

// ===== 哲学家进餐组件 =====
function DiningPhilosophers() {
  const [status, setStatus] = useState({ philosopherStates: ['THINKING','THINKING','THINKING','THINKING','THINKING'], chopsticks: [false,false,false,false,false], hasDeadlock: false, strategy: 'NONE', log: [] })

  const fetchStatus = useCallback(async () => {
    try { const r = await axios.get(`${API}/dp/status`); setStatus(r.data) } catch {}
  }, [])

  useEffect(() => { axios.post(`${API}/dp/init`); fetchStatus() }, [fetchStatus])

  const getHungry = async (id) => { await axios.post(`${API}/dp/hungry/${id}`); fetchStatus() }
  const eat = async (id) => { await axios.post(`${API}/dp/eat/${id}`); fetchStatus() }
  const put = async (id) => { await axios.post(`${API}/dp/put/${id}`); fetchStatus() }
  const triggerDeadlock = async () => { await axios.post(`${API}/dp/deadlock`); fetchStatus() }
  const setStrategy = async (s) => { await axios.post(`${API}/dp/strategy/${s}`); fetchStatus() }
  const reset = async () => { await axios.post(`${API}/dp/reset`); fetchStatus() }

  const stateColor = (s) => s === 'EATING' ? '#22c55e' : s === 'HUNGRY' ? '#f59e0b' : s === 'BLOCKED' ? '#ef4444' : '#555'
  const stateLabel = (s) => ({ THINKING: '思考', HUNGRY: '饥饿', EATING: '进餐', BLOCKED: '阻塞' }[s] || s)

  // 圆桌位置（5个哲学家围成一圈）
  const radius = 120
  const positions = [0,1,2,3,4].map(i => {
    const angle = (i * 72 - 90) * Math.PI / 180
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
  })

  return (
    <div style={{ padding: '16px' }}>
      {/* 死锁警告 */}
      {status.hasDeadlock && (
        <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 16px', marginBottom: '12px', color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>
          ⚠️ 死锁检测！所有哲学家互相等待，循环等待条件成立
        </div>
      )}

      {/* 策略选择 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {[
          { value: 'NONE', label: '无策略' },
          { value: 'LIMIT_4', label: '限制4人进餐' },
          { value: 'ODD_EVEN', label: '奇偶拿筷子' },
        ].map(s => (
          <button key={s.value} onClick={() => setStrategy(s.value)} style={{
            padding: '5px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s',
            background: status.strategy === s.value ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${status.strategy === s.value ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
            color: status.strategy === s.value ? '#8b5cf6' : '#888'
          }}>{s.label}</button>
        ))}
        <button onClick={triggerDeadlock} style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>💀 触发死锁</button>
        <button onClick={reset} style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#888' }}>↺ 重置</button>
      </div>

      {/* 圆桌 */}
      <div style={{ position: 'relative', width: '300px', height: '300px', margin: '0 auto' }}>
        {/* 圆桌背景 */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '2px solid rgba(255,255,255,0.06)' }} />

        {/* 筷子（在哲学家之间） */}
        {[0,1,2,3,4].map(i => {
          const angle = (i * 72 + 36 - 90) * Math.PI / 180
          const cx = Math.cos(angle) * (radius * 0.55)
          const cy = Math.sin(angle) * (radius * 0.55)
          return (
            <div key={`c${i}`} style={{
              position: 'absolute', left: `calc(50% + ${cx}px - 8px)`, top: `calc(50% + ${cy}px - 8px)`,
              width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', transition: '0.3s',
              color: status.chopsticks[i] ? '#f59e0b' : '#555'
            }}>🥢</div>
          )
        })}

        {/* 哲学家 */}
        {positions.map((pos, i) => {
          const s = status.philosopherStates[i]
          return (
            <div key={i} style={{
              position: 'absolute', left: `calc(50% + ${pos.x}px - 30px)`, top: `calc(50% + ${pos.y}px - 30px)`,
              width: '60px', textAlign: 'center', cursor: 'pointer'
            }} onClick={() => {
              if (s === 'THINKING') getHungry(i)
              else if (s === 'HUNGRY') eat(i)
              else if (s === 'EATING') put(i)
            }}>
              <div style={{
                fontSize: '32px', transition: '0.3s',
                filter: s === 'BLOCKED' ? 'grayscale(1) brightness(0.5)' : s === 'EATING' ? `drop-shadow(0 0 8px ${stateColor(s)})` : 'none'
              }}>🧑‍🍳</div>
              <div style={{ fontSize: '9px', color: stateColor(s), fontWeight: 600 }}>{stateLabel(s)}</div>
              <div style={{ fontSize: '8px', color: '#555' }}>P{i}</div>
            </div>
          )
        })}
      </div>

      {/* 提示 */}
      <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '11px', color: '#555' }}>
        点击哲学家：思考→饥饿→尝试进餐→吃完放筷子
      </div>

      {/* 日志 */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '10px', maxHeight: '120px', overflow: 'auto', fontFamily: 'monospace', fontSize: '11px', marginTop: '12px' }}>
        <div style={{ color: '#555', marginBottom: '6px', fontSize: '10px', letterSpacing: '1px' }}>运行日志</div>
        {(status.log || []).slice(-10).reverse().map((log, i) => (
          <div key={i} style={{ padding: '2px 0', color: '#666', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>{log}</div>
        ))}
      </div>
    </div>
  )
}

export default SyncLab
