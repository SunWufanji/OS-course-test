import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = '/api/io'

// ==================== 独占设备标签页 ====================
function ExclusiveDevicesTab({ exclusiveStatus }) {
  const devices = exclusiveStatus || {}
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
      {['PRINTER', 'USB_DISK'].map(name => {
        const d = devices[name] || {}
        const busy = d.status === 'BUSY'
        return (
          <div key={name} style={{
            background: busy ? 'rgba(0,255,136,0.05)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${busy ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: '10px', padding: '16px', transition: 'all 0.3s'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '28px' }}>{name === 'PRINTER' ? '🖨️' : '💾'}</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#e0f0ff' }}>{name === 'PRINTER' ? '打印机' : 'U 盘'}</div>
                <div style={{ fontSize: '10px', color: '#888' }}>独占设备（互斥）</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span style={{
                  padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                  background: busy ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.05)',
                  color: busy ? '#00ff88' : '#555', border: `1px solid ${busy ? 'rgba(0,255,136,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: busy ? '0 0 8px rgba(0,255,136,0.2)' : 'none'
                }}>
                  {busy ? '● BUSY' : '○ IDLE'}
                </span>
              </div>
            </div>
            {busy && (
              <div style={{ fontSize: '12px', color: '#00ff88', marginBottom: '8px' }}>
                占用者: {d.occupiedByName} (PID: {d.occupiedByPid})
              </div>
            )}
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>等待队列:</div>
            <div style={{ minHeight: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', padding: '6px' }}>
              {(d.waitingQueue || []).length === 0 ? (
                <span style={{ fontSize: '11px', color: '#444' }}>(空)</span>
              ) : (
                d.waitingQueue.map((w, i) => (
                  <span key={i} style={{ display: 'inline-block', padding: '2px 8px', margin: '2px', background: 'rgba(255,215,0,0.1)', borderRadius: '4px', fontSize: '11px', color: '#ffd700' }}>
                    {w.processName} (PID:{w.pid})
                  </span>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ==================== 共享设备标签页 ====================
function SharedDevicesTab({ audioStatus }) {
  const pids = audioStatus?.activePids || []
  const count = audioStatus?.count || 0
  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <div style={{ fontSize: '36px', marginBottom: '8px', filter: count > 0 ? 'drop-shadow(0 0 12px rgba(0,255,136,0.4))' : 'none' }}>🎧</div>
      <div style={{ fontSize: '16px', fontWeight: 600, color: '#e0f0ff', marginBottom: '4px' }}>耳机 / 声卡</div>
      <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>共享设备 — 多进程可同时使用（混音器）</div>
      <div style={{
        padding: '12px', borderRadius: '8px',
        background: count > 0 ? 'rgba(0,255,136,0.08)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${count > 0 ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.06)'}`
      }}>
        {count === 0 ? (
          <div style={{ fontSize: '12px', color: '#555' }}>无进程使用音频</div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {pids.map((pid, i) => (
              <span key={i} style={{ padding: '4px 10px', background: 'rgba(0,255,136,0.15)', borderRadius: '6px', fontSize: '12px', color: '#00ff88', border: '1px solid rgba(0,255,136,0.3)' }}>
                🎵 PID: {pid} 正在播放
              </span>
            ))}
          </div>
        )}
        {count > 1 && (
          <div style={{ fontSize: '11px', color: '#00ff88', marginTop: '8px' }}>
            ✅ {count} 个进程同时使用耳机（共享设备，不会阻塞！）
          </div>
        )}
      </div>
      <div style={{ fontSize: '10px', color: '#555', marginTop: '10px', fontStyle: 'italic' }}>
        💡 对比独占设备：耳机是共享设备，多个进程可以同时使用（音频混音器），不会产生阻塞
      </div>
    </div>
  )
}

// ==================== 磁盘调度标签页 ====================
function DiskSchedulerTab({ diskStatus }) {
  const [diskAlgorithm, setDiskAlgorithm] = useState('SSTF')
  const [trackInput, setTrackInput] = useState('50')
  const [pidInput, setPidInput] = useState('100')

  const setAlgorithm = async (algo) => {
    setDiskAlgorithm(algo)
    await axios.post(`${API}/disk/algorithm/${algo}`)
  }

  const submitRequest = async () => {
    await axios.post(`${API}/disk/request`, { pid: parseInt(pidInput), track: parseInt(trackInput), type: 'READ' })
  }

  const step = async () => {
    await axios.post(`${API}/disk/schedule`)
  }

  const headPos = diskStatus?.diskHead || 100
  const queueSize = diskStatus?.diskQueue || 0
  const totalSeek = diskStatus?.totalSeekLength || 0

  return (
    <div style={{ padding: '12px' }}>
      {/* 算法选择 */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: '#888' }}>调度算法:</span>
        {['FCFS', 'SSTF', 'SCAN', 'CSCAN'].map(algo => (
          <button key={algo} onClick={() => setAlgorithm(algo)} style={{
            padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer',
            background: diskAlgorithm === algo ? 'rgba(0,240,255,0.15)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${diskAlgorithm === algo ? '#00f0ff' : 'rgba(255,255,255,0.08)'}`,
            color: diskAlgorithm === algo ? '#00f0ff' : '#888'
          }}>{algo}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#888' }}>寻道总长: <span style={{ color: '#00f0ff' }}>{totalSeek}</span></span>
      </div>

      {/* 磁道可视化 */}
      <div style={{ position: 'relative', height: '50px', marginBottom: '16px' }}>
        {/* 磁道线 */}
        <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }} />
        {/* 刻度 */}
        {[0, 50, 100, 150, 199].map(t => (
          <span key={t} style={{ position: 'absolute', left: `${20 + (t / 199) * (100 - 4)}%`, top: '30px', fontSize: '9px', color: '#555', transform: 'translateX(-50%)' }}>{t}</span>
        ))}
        {/* 磁头 */}
        <div style={{
          position: 'absolute', top: '10px', left: `${20 + (headPos / 199) * (100 - 4)}%`,
          transform: 'translateX(-50%)', transition: 'left 0.5s ease',
          fontSize: '16px', filter: 'drop-shadow(0 0 6px #00f0ff)'
        }}>▼</div>
        <div style={{ position: 'absolute', top: '2px', left: `${20 + (headPos / 199) * (100 - 4)}%`, transform: 'translateX(-50%)', fontSize: '9px', color: '#00f0ff', fontWeight: 600 }}>
          HEAD: {headPos}
        </div>
      </div>

      {/* 提交请求 */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', color: '#888' }}>PID:</span>
        <input value={pidInput} onChange={e => setPidInput(e.target.value)}
          style={{ width: '50px', padding: '4px 6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', color: '#e0f0ff', fontSize: '11px' }} />
        <span style={{ fontSize: '11px', color: '#888' }}>磁道:</span>
        <input value={trackInput} onChange={e => setTrackInput(e.target.value)}
          style={{ width: '60px', padding: '4px 6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', color: '#e0f0ff', fontSize: '11px' }} />
        <button onClick={submitRequest} style={{ padding: '4px 12px', background: 'rgba(0,240,255,0.15)', color: '#00f0ff', border: '1px solid rgba(0,240,255,0.3)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>提交请求</button>
        <button onClick={step} style={{ padding: '4px 12px', background: 'rgba(0,255,136,0.15)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.3)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>⏭ 单步调度</button>
      </div>

      {/* 磁盘日志 */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '8px', maxHeight: '100px', overflow: 'auto', fontFamily: 'monospace', fontSize: '10px' }}>
        <div style={{ color: '#555', marginBottom: '4px', fontSize: '9px', letterSpacing: '1px' }}>磁盘调度日志</div>
        {(diskStatus?.diskLog || []).map((log, i) => (
          <div key={i} style={{ padding: '2px 0', color: '#666' }}>{log}</div>
        ))}
      </div>
    </div>
  )
}

// ==================== 主组件 ====================
function IoDeviceManager() {
  const [activeTab, setActiveTab] = useState('exclusive')
  const [exclusiveStatus, setExclusiveStatus] = useState({})
  const [audioStatus, setAudioStatus] = useState({})
  const [diskStatus, setDiskStatus] = useState({})

  const fetchAll = useCallback(async () => {
    try {
      const [e, a, d] = await Promise.all([
        axios.get(`${API}/exclusive/status`),
        axios.get(`${API}/audio/status`),
        axios.get(`${API}/disk/status`)
      ])
      setExclusiveStatus(e.data)
      setAudioStatus(a.data)
      setDiskStatus(d.data)
    } catch {}
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])
  useEffect(() => {
    const timer = setInterval(fetchAll, 1500)
    return () => clearInterval(timer)
  }, [fetchAll])

  const tabs = [
    { id: 'exclusive', label: '独占设备', icon: '🖨️' },
    { id: 'shared', label: '共享设备', icon: '🎧' },
    { id: 'disk', label: '磁盘调度', icon: '💿' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0a0f', color: '#e0f0ff' }}>
      {/* 标签页 */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '10px 20px', background: activeTab === tab.id ? 'rgba(255,255,255,0.05)' : 'transparent',
            border: 'none', borderBottom: activeTab === tab.id ? '2px solid #00f0ff' : '2px solid transparent',
            color: activeTab === tab.id ? '#e0f0ff' : '#888', cursor: 'pointer', fontSize: '13px',
            fontWeight: activeTab === tab.id ? 600 : 400, transition: 'all 0.2s'
          }}>{tab.icon} {tab.label}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {activeTab === 'exclusive' && <ExclusiveDevicesTab exclusiveStatus={exclusiveStatus} />}
        {activeTab === 'shared' && <SharedDevicesTab audioStatus={audioStatus} />}
        {activeTab === 'disk' && <DiskSchedulerTab diskStatus={diskStatus} />}
      </div>
    </div>
  )
}

export default IoDeviceManager
