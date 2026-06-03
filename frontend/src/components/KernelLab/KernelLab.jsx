import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API_BASE = '/api'

/**
 * 内核算法实验室 - 调度算法可视化演示
 */
function KernelLab() {
  const [algorithm, setAlgorithm] = useState('FCFS')
  const [quantum, setQuantum] = useState(2)
  const [processes, setProcesses] = useState([
    { name: 'P1', burstTime: 6, priority: 3, arrivalTime: 0 },
    { name: 'P2', burstTime: 4, priority: 1, arrivalTime: 1 },
    { name: 'P3', burstTime: 2, priority: 4, arrivalTime: 2 },
  ])
  const [ganttData, setGanttData] = useState([])
  const [stats, setStats] = useState({})
  const [totalTime, setTotalTime] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [newProcess, setNewProcess] = useState({ name: '', burstTime: 5, priority: 3, arrivalTime: 0 })
  const animRef = useRef(null)

  // 运行模拟
  const runSimulation = async () => {
    if (processes.length === 0) {
      alert('请先添加进程')
      return
    }
    try {
      const res = await axios.post(`${API_BASE}/lab/simulate`, {
        algorithm,
        quantum,
        processes: processes.map(p => ({
          name: p.name,
          burstTime: p.burstTime,
          priority: p.priority,
          arrivalTime: p.arrivalTime
        }))
      })
      const data = res.data
      setGanttData(data.gantt || [])
      setStats(data.stats || {})
      setTotalTime(data.totalTime || 0)
      setCurrentTime(0)
      // 启动甘特图动画
      startGanttAnimation(data.totalTime || 10)
    } catch (err) {
      console.error('模拟失败:', err)
    }
  }

  // 甘特图扫描线动画
  const startGanttAnimation = (total) => {
    setIsAnimating(true)
    setCurrentTime(0)
    let t = 0
    if (animRef.current) clearInterval(animRef.current)
    animRef.current = setInterval(() => {
      t++
      setCurrentTime(t)
      if (t >= total) {
        clearInterval(animRef.current)
        setIsAnimating(false)
      }
    }, 400)
  }

  // 添加进程
  const addProcess = () => {
    const name = newProcess.name || `P${processes.length + 1}`
    setProcesses(prev => [...prev, {
      name,
      burstTime: newProcess.burstTime,
      priority: newProcess.priority,
      arrivalTime: newProcess.arrivalTime
    }])
    setNewProcess({ name: '', burstTime: 5, priority: 3, arrivalTime: 0 })
  }

  // 删除进程
  const removeProcess = (index) => {
    setProcesses(prev => prev.filter((_, i) => i !== index))
  }

  // 加载演示数据
  const loadDemo = () => {
    setProcesses([
      { name: 'P1', burstTime: 6, priority: 3, arrivalTime: 0 },
      { name: 'P2', burstTime: 4, priority: 1, arrivalTime: 1 },
      { name: 'P3', burstTime: 2, priority: 4, arrivalTime: 2 },
      { name: 'P4', burstTime: 3, priority: 2, arrivalTime: 3 },
      { name: 'P5', burstTime: 5, priority: 5, arrivalTime: 4 },
    ])
  }

  // 清理定时器
  useEffect(() => {
    return () => { if (animRef.current) clearInterval(animRef.current) }
  }, [])

  // 获取进程颜色
  const getProcessColor = (pid) => {
    const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316']
    return colors[pid % colors.length]
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1a1a2e', color: '#ededef' }}>
      {/* 标题 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: '14px', fontWeight: 600 }}>🧪 内核算法实验室</div>
        <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>选择算法 → 配置进程 → 开始模拟</div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 左侧：配置面板 */}
        <div style={{ width: '280px', borderRight: '1px solid rgba(255,255,255,0.08)', padding: '12px', overflow: 'auto' }}>
          {/* 算法选择 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>调度算法</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              {['FCFS', 'SJF', 'RR', 'Priority'].map(algo => (
                <button
                  key={algo}
                  onClick={() => setAlgorithm(algo)}
                  style={{
                    padding: '8px',
                    background: algorithm === algo ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${algorithm === algo ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '6px',
                    color: algorithm === algo ? '#8b5cf6' : '#888',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {{ FCFS: 'FCFS', SJF: 'SJF', RR: 'RR', Priority: '优先级' }[algo]}
                </button>
              ))}
            </div>
            {algorithm === 'RR' && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>时间片</div>
                <input
                  type="number"
                  value={quantum}
                  onChange={e => setQuantum(parseInt(e.target.value) || 2)}
                  min={1}
                  style={{ width: '60px', padding: '6px 8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', color: '#ededef', fontSize: '12px' }}
                />
              </div>
            )}
          </div>

          {/* 进程配置 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>进程列表</span>
              <button onClick={loadDemo} style={{ fontSize: '10px', color: '#8b5cf6', background: 'none', border: 'none', cursor: 'pointer' }}>加载演示</button>
            </div>

            {/* 添加进程 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 30px 50px', gap: '4px', marginBottom: '8px' }}>
              <input
                placeholder="名称"
                value={newProcess.name}
                onChange={e => setNewProcess(prev => ({ ...prev, name: e.target.value }))}
                style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', color: '#ededef', fontSize: '11px' }}
              />
              <input
                type="number" placeholder="执行" min={1}
                value={newProcess.burstTime}
                onChange={e => setNewProcess(prev => ({ ...prev, burstTime: parseInt(e.target.value) || 1 }))}
                style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', color: '#ededef', fontSize: '11px' }}
              />
              <input
                type="number" placeholder="优先" min={1}
                value={newProcess.priority}
                onChange={e => setNewProcess(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', color: '#ededef', fontSize: '11px' }}
              />
              <button onClick={addProcess} style={{ padding: '6px', background: '#6366f1', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '12px' }}>+</button>
            </div>

            {/* 到达时间 */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#888' }}>到达时间:</span>
              <input
                type="number" min={0}
                value={newProcess.arrivalTime}
                onChange={e => setNewProcess(prev => ({ ...prev, arrivalTime: parseInt(e.target.value) || 0 }))}
                style={{ width: '50px', padding: '6px 8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', color: '#ededef', fontSize: '11px' }}
              />
            </div>

            {/* 进程列表 */}
            <div style={{ maxHeight: '150px', overflow: 'auto' }}>
              {processes.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginBottom: '2px', fontSize: '11px' }}>
                  <span style={{ color: getProcessColor(i) }}>{p.name}</span>
                  <span style={{ color: '#888' }}>执行:{p.burstTime} 到达:{p.arrivalTime}</span>
                  <button onClick={() => removeProcess(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>×</button>
                </div>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <button
            onClick={runSimulation}
            disabled={isAnimating}
            style={{
              width: '100%',
              padding: '10px',
              background: isAnimating ? '#555' : '#6366f1',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isAnimating ? 'not-allowed' : 'pointer'
            }}
          >
            {isAnimating ? '模拟中...' : '▶ 开始模拟'}
          </button>
        </div>

        {/* 右侧：结果展示 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* 甘特图 */}
          <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CPU 调度甘特图</div>
            <div style={{ position: 'relative', height: '40px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', overflow: 'hidden' }}>
              {ganttData.length > 0 ? (
                <>
                  {ganttData.map((block, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        left: `${(block.start / totalTime) * 100}%`,
                        width: `${((block.end - block.start) / totalTime) * 100}%`,
                        top: 0,
                        bottom: 0,
                        background: block.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: 'white',
                        borderRight: '1px solid rgba(0,0,0,0.3)',
                        opacity: block.end <= currentTime ? 1 : 0.3,
                        transition: 'opacity 0.3s'
                      }}
                    >
                      {block.end <= currentTime ? block.name : ''}
                    </div>
                  ))}
                  {/* 扫描线 */}
                  <div
                    className="gantt-scanline"
                    style={{ left: `${(currentTime / totalTime) * 100}%` }}
                  />
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: '12px' }}>
                  点击"开始模拟"查看甘特图
                </div>
              )}
            </div>
            {/* 时间轴 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              {Array.from({ length: Math.min(totalTime + 1, 20) }, (_, i) => {
                const step = totalTime <= 20 ? 1 : Math.ceil(totalTime / 20)
                const t = i * step
                if (t > totalTime) return null
                return <span key={i} style={{ fontSize: '9px', color: '#555', position: 'absolute', left: `${(t / totalTime) * 100}%`, transform: 'translateX(-50%)' }}>{t}</span>
              })}
            </div>
          </div>

          {/* 统计信息 */}
          <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[
              { label: '平均周转', value: stats.avgTurnaround || '-', color: '#6366f1' },
              { label: '平均等待', value: stats.avgWaiting || '-', color: '#f59e0b' },
              { label: 'CPU 利用率', value: `${stats.cpuUsage || 0}%`, color: '#22c55e' },
              { label: '已完成', value: stats.completed || 0, color: '#06b6d4' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* 进程详情表 */}
          <div style={{ flex: 1, padding: '0 16px 16px', overflow: 'auto' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>进程执行详情</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['进程', '到达', '执行', '完成', '周转', '等待'].map(h => (
                    <th key={h} style={{ padding: '8px', textAlign: 'left', color: '#888', fontWeight: 500, fontSize: '11px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ganttData.length > 0 && (() => {
                  // 从甘特图数据提取每个进程的信息
                  const seen = new Set()
                  const rows = []
                  ganttData.forEach(block => {
                    if (!seen.has(block.name)) {
                      seen.add(block.name)
                      const pid = block.pid
                      rows.push({
                        name: block.name,
                        color: block.color,
                        arrival: processes.find(p => p.name === block.name)?.arrivalTime || 0,
                        burst: processes.find(p => p.name === block.name)?.burstTime || 0,
                        completion: block.end,
                        turnaround: (block.end) - (processes.find(p => p.name === block.name)?.arrivalTime || 0),
                        waiting: (block.end) - (processes.find(p => p.name === block.name)?.arrivalTime || 0) - (processes.find(p => p.name === block.name)?.burstTime || 0),
                      })
                    }
                  })
                  return rows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '8px', color: row.color, fontWeight: 500 }}>{row.name}</td>
                      <td style={{ padding: '8px', color: '#888' }}>{row.arrival}</td>
                      <td style={{ padding: '8px', color: '#888' }}>{row.burst}</td>
                      <td style={{ padding: '8px', color: '#888' }}>{row.completion}</td>
                      <td style={{ padding: '8px', color: '#f59e0b' }}>{row.turnaround}</td>
                      <td style={{ padding: '8px', color: '#ef4444' }}>{row.waiting}</td>
                    </tr>
                  ))
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KernelLab
