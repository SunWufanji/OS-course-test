import React, { useState } from 'react'

/**
 * 任务管理器 - 仿 Windows 任务管理器
 */
function TaskManager({ processes, systemStatus, onTerminate, onSuspend, onResume }) {
  const [tab, setTab] = useState('processes')
  const [sortBy, setSortBy] = useState('pid')
  const [sortDir, setSortDir] = useState('asc')

  const cpuUsage = systemStatus?.totalCpuUsage?.toFixed(1) || 0
  const memUsed = systemStatus?.usedMemory || 0
  const memTotal = systemStatus?.totalMemory || 1024
  const memPercent = ((memUsed / memTotal) * 100).toFixed(1)
  const diskRead = systemStatus?.diskReadSpeed?.toFixed(1) || 0
  const diskWrite = systemStatus?.diskWriteSpeed?.toFixed(1) || 0
  const netSpeed = systemStatus?.networkSpeed?.toFixed(0) || 0

  // 排序进程
  const sortedProcesses = [...processes].sort((a, b) => {
    let va = a[sortBy], vb = b[sortBy]
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb?.toLowerCase() || '' }
    if (va == null) va = 0
    if (vb == null) vb = 0
    return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
  })

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span style={{ opacity: 0.3 }}>↕</span>
    return <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1a1a2e' }}>
      {/* 标签页 */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.2)'
      }}>
        {[
          { id: 'processes', label: '进程', icon: '📋' },
          { id: 'performance', label: '性能', icon: '📊' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 20px',
              background: tab === t.id ? 'rgba(255,255,255,0.05)' : 'transparent',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid #8b5cf6' : '2px solid transparent',
              color: tab === t.id ? '#ededef' : '#888',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: tab === t.id ? 600 : 400,
              transition: 'all 0.2s'
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* 进程列表 */}
      {tab === 'processes' && (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.3)', position: 'sticky', top: 0 }}>
                {[
                  { key: 'icon', label: '', width: 40 },
                  { key: 'name', label: '名称', width: 150 },
                  { key: 'pid', label: 'PID', width: 60 },
                  { key: 'state', label: '状态', width: 70 },
                  { key: 'cpuUsage', label: 'CPU', width: 70 },
                  { key: 'currentMemoryUsage', label: '内存', width: 80 },
                  { key: 'diskRead', label: '磁盘读', width: 70 },
                  { key: 'networkSpeed', label: '网络', width: 70 },
                  { key: 'actions', label: '操作', width: 120 },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => col.key !== 'icon' && col.key !== 'actions' && handleSort(col.key)}
                    style={{
                      padding: '8px 10px',
                      textAlign: 'left',
                      color: '#888',
                      fontWeight: 500,
                      width: col.width,
                      cursor: col.key !== 'icon' && col.key !== 'actions' ? 'pointer' : 'default',
                      userSelect: 'none'
                    }}
                  >
                    {col.label} <SortIcon field={col.key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedProcesses.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#555' }}>
                    暂无运行中的进程<br />
                    <span style={{ fontSize: '11px' }}>双击桌面图标启动应用</span>
                  </td>
                </tr>
              ) : (
                sortedProcesses.map(p => (
                  <tr
                    key={p.pid}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{p.icon || '📱'}</td>
                    <td style={{ padding: '8px 12px', color: '#ededef', fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: '8px 12px', color: '#888' }}>{p.pid}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        background: p.state === 'RUNNING' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                        color: p.state === 'RUNNING' ? '#22c55e' : '#f59e0b'
                      }}>
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
                          <button
                            onClick={() => onSuspend(p.pid)}
                            style={{ padding: '3px 8px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                          >挂起</button>
                        ) : (
                          <button
                            onClick={() => onResume(p.pid)}
                            style={{ padding: '3px 8px', background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                          >恢复</button>
                        )}
                        <button
                          onClick={() => { if (confirm(`确定结束 ${p.name} (PID:${p.pid})?`)) onTerminate(p.pid) }}
                          style={{ padding: '3px 8px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                        >结束</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 性能监控 */}
      {tab === 'performance' && systemStatus && (
        <div style={{ flex: 1, padding: '16px', overflow: 'auto' }}>
          {/* CPU */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#ededef', fontWeight: 600, fontSize: '13px' }}>🔲 CPU ({systemStatus.cpuCores} 核)</span>
              <span style={{ color: '#06b6d4', fontSize: '20px', fontWeight: 700 }}>{cpuUsage}%</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${cpuUsage}%`, background: 'linear-gradient(90deg, #06b6d4, #3b82f6)', borderRadius: '4px', transition: 'width 0.5s' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(systemStatus.cpuCores, 8)}, 1fr)`, gap: '6px', marginTop: '10px' }}>
              {(systemStatus.coreUsage || []).slice(0, 8).map((usage, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{
                    height: '40px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '4px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: `${usage}%`,
                      background: usage > 80 ? '#ef4444' : usage > 50 ? '#f59e0b' : '#22c55e',
                      transition: 'height 0.5s',
                      borderRadius: '0 0 4px 4px'
                    }} />
                  </div>
                  <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>核心{i}</div>
                  <div style={{ fontSize: '10px', color: '#06b6d4' }}>{usage?.toFixed(0) || 0}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* 内存 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#ededef', fontWeight: 600, fontSize: '13px' }}>🧠 内存</span>
              <span style={{ color: '#f43f5e', fontSize: '20px', fontWeight: 700 }}>{memPercent}%</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${memPercent}%`, background: 'linear-gradient(90deg, #f43f5e, #ec4899)', borderRadius: '4px', transition: 'width 0.5s' }} />
            </div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
              {memUsed}MB / {memTotal}MB
            </div>
            {/* 内存分配详情 */}
            {systemStatus.memoryAllocations && systemStatus.memoryAllocations.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>内存分配：</div>
                {systemStatus.memoryAllocations.map((alloc, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginBottom: '2px', fontSize: '11px' }}>
                    <span style={{ color: '#ededef' }}>{alloc.processName} (PID:{alloc.pid})</span>
                    <span style={{ color: '#f43f5e' }}>{alloc.size}MB</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 磁盘和网络 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div style={{ color: '#ededef', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>💾 磁盘</div>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#888', fontSize: '12px' }}>读取</span>
                  <span style={{ color: '#22c55e', fontSize: '12px' }}>{diskRead} MB/s</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888', fontSize: '12px' }}>写入</span>
                  <span style={{ color: '#f59e0b', fontSize: '12px' }}>{diskWrite} MB/s</span>
                </div>
              </div>
            </div>
            <div>
              <div style={{ color: '#ededef', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>🌐 网络</div>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888', fontSize: '12px' }}>速度</span>
                  <span style={{ color: '#8b5cf6', fontSize: '12px' }}>{netSpeed} KB/s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 底部状态栏 */}
      <div style={{
        padding: '6px 12px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: '#888',
        background: 'rgba(0,0,0,0.2)'
      }}>
        <span>进程数: {processes.length}</span>
        <span>运行中: {processes.filter(p => p.state === 'RUNNING').length}</span>
        <span>已挂起: {processes.filter(p => p.state === 'BLOCKED').length}</span>
      </div>
    </div>
  )
}

export default TaskManager
