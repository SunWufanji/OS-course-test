import React, { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'

const API_BASE = '/api'

const StateNames = {
  created: '新建', ready: '就绪', running: '运行',
  blocked: '阻塞', terminated: '结束'
}

const AlgoDesc = {
  FCFS: '先来先服务调度算法',
  SJF: '短作业优先调度算法',
  RR: '时间片轮转调度算法',
  Priority: '优先级调度算法'
}

function App() {
  const [processes, setProcesses] = useState([])
  const [readyQueue, setReadyQueue] = useState([])
  const [blockedQueue, setBlockedQueue] = useState([])
  const [runningProcess, setRunningProcess] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [currentAlgo, setCurrentAlgo] = useState('FCFS')
  const [ganttData, setGanttData] = useState([])
  const [stats, setStats] = useState({ avgTurnaround: 0, avgWaiting: 0, cpuUsage: 0, completed: 0 })
  const [selectedPid, setSelectedPid] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTab, setCurrentTab] = useState('all')
  const [searchText, setSearchText] = useState('')

  const [inputName, setInputName] = useState('P1')
  const [inputBurst, setInputBurst] = useState(5)
  const [inputPriority, setInputPriority] = useState(3)
  const [inputArrival, setInputArrival] = useState(0)
  const [inputQuantum, setInputQuantum] = useState(2)

  const playIntervalRef = useRef(null)

  // MySQL相关状态
  const [scenarios, setScenarios] = useState([])
  const [historyRecords, setHistoryRecords] = useState([])
  const [activePanel, setActivePanel] = useState('main') // main, history, scenarios

  // 获取所有数据
  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/processes`)
      const data = res.data
      setProcesses(data.processes || [])
      setReadyQueue(data.readyQueue || [])
      setBlockedQueue(data.blockedQueue || [])
      setRunningProcess(data.runningProcess)
      setCurrentTime(data.currentTime || 0)
      setCurrentAlgo(data.currentAlgo || 'FCFS')
      setGanttData(data.ganttData || [])
      setStats(data.stats || { avgTurnaround: 0, avgWaiting: 0, cpuUsage: 0, completed: 0 })
    } catch (err) {
      console.error('获取数据失败:', err)
    }
  }, [])

  // 创建进程
  const createProcess = async () => {
    try {
      await axios.post(`${API_BASE}/processes`, {
        name: inputName || `P${processes.length + 1}`,
        burstTime: parseInt(inputBurst) || 5,
        priority: parseInt(inputPriority) || 3,
        arrivalTime: parseInt(inputArrival) || 0
      })
      fetchData()
    } catch (err) {
      console.error('创建进程失败:', err)
    }
  }

  // 删除进程
  const deleteProcess = async () => {
    if (!selectedPid) return
    try {
      await axios.delete(`${API_BASE}/processes/${selectedPid}`)
      setSelectedPid(null)
      fetchData()
    } catch (err) {
      console.error('删除进程失败:', err)
    }
  }

  // 挂起进程
  const suspendProcess = async () => {
    if (!selectedPid) return
    try {
      await axios.post(`${API_BASE}/processes/${selectedPid}/suspend`)
      fetchData()
    } catch (err) {
      console.error('挂起进程失败:', err)
    }
  }

  // 恢复进程
  const resumeProcess = async () => {
    if (!selectedPid) return
    try {
      await axios.post(`${API_BASE}/processes/${selectedPid}/resume`)
      fetchData()
    } catch (err) {
      console.error('恢复进程失败:', err)
    }
  }

  // 执行一步
  const tick = async () => {
    try {
      await axios.post(`${API_BASE}/tick`)
      fetchData()
    } catch (err) {
      console.error('执行失败:', err)
    }
  }

  // 重置系统
  const resetSystem = async () => {
    stopPlay()
    try {
      await axios.post(`${API_BASE}/reset`)
      setSelectedPid(null)
      fetchData()
    } catch (err) {
      console.error('重置失败:', err)
    }
  }

  // 加载演示
  const loadDemo = async () => {
    stopPlay()
    try {
      await axios.post(`${API_BASE}/demo`)
      fetchData()
    } catch (err) {
      console.error('加载演示失败:', err)
    }
  }

  // 设置调度算法
  const setScheduler = async (algo) => {
    try {
      await axios.post(`${API_BASE}/scheduler`, { algo })
      setCurrentAlgo(algo)
      fetchData()
    } catch (err) {
      console.error('设置算法失败:', err)
    }
  }

  // ==================== MySQL功能 ====================

  // 获取实验场景
  const fetchScenarios = async () => {
    try {
      const res = await axios.get(`${API_BASE}/scenarios`)
      setScenarios(res.data || [])
    } catch (err) {
      console.error('获取场景失败:', err)
    }
  }

  // 获取历史记录
  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/history`)
      setHistoryRecords(res.data || [])
    } catch (err) {
      console.error('获取历史失败:', err)
    }
  }

  // 保存模拟结果
  const saveResults = async () => {
    try {
      await axios.post(`${API_BASE}/save`)
      alert('保存成功！数据已存入MySQL')
      fetchHistory()
    } catch (err) {
      console.error('保存失败:', err)
      alert('保存失败')
    }
  }

  // 加载场景
  const loadScenario = async (id) => {
    try {
      await axios.post(`${API_BASE}/scenarios/${id}/load`)
      fetchData()
      setActivePanel('main')
    } catch (err) {
      console.error('加载场景失败:', err)
    }
  }

  // 设置时间片
  const setQuantum = async () => {
    try {
      await axios.post(`${API_BASE}/quantum`, { quantum: parseInt(inputQuantum) || 2 })
    } catch (err) {
      console.error('设置时间片失败:', err)
    }
  }

  // 播放/暂停
  const togglePlay = () => {
    if (isPlaying) {
      stopPlay()
    } else {
      startPlay()
    }
  }

  const startPlay = () => {
    setIsPlaying(true)
    playIntervalRef.current = setInterval(async () => {
      try {
        const res = await axios.post(`${API_BASE}/tick`)
        fetchData()
        // 检查是否所有进程完成
        const data = await axios.get(`${API_BASE}/processes`)
        const allDone = data.data.processes.every(p => p.state === 'TERMINATED')
        if (allDone) {
          stopPlay()
        }
      } catch (err) {
        stopPlay()
      }
    }, 500)
  }

  const stopPlay = () => {
    setIsPlaying(false)
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current)
      playIntervalRef.current = null
    }
  }

  // 初始化
  useEffect(() => {
    fetchData()
    fetchScenarios()
    fetchHistory()
    return () => stopPlay()
  }, [fetchData])

  // 状态计数
  const counts = {
    created: processes.filter(p => p.state === 'CREATED').length,
    ready: readyQueue.length,
    running: runningProcess ? 1 : 0,
    blocked: blockedQueue.length,
    terminated: processes.filter(p => p.state === 'TERMINATED').length
  }

  // 过滤进程
  let filteredProcesses = processes
  if (currentTab !== 'all') {
    filteredProcesses = processes.filter(p => p.state.toLowerCase() === currentTab)
  }
  if (searchText) {
    filteredProcesses = filteredProcesses.filter(p => p.name.toLowerCase().includes(searchText.toLowerCase()))
  }

  return (
    <div className="app">
      {/* 标题栏 */}
      <header className="titlebar">
        <div className="traffic-lights">
          <div className="traffic-light close"></div>
          <div className="traffic-light minimize"></div>
          <div className="traffic-light maximize"></div>
        </div>
        <div className="titlebar-tabs">
          {['all', 'ready', 'running', 'blocked', 'terminated'].map(tab => (
            <button
              key={tab}
              className={`titlebar-tab ${currentTab === tab ? 'active' : ''}`}
              onClick={() => setCurrentTab(tab)}
            >
              {{ all: '所有进程', ready: '就绪队列', running: '运行中', blocked: '阻塞队列', terminated: '已完成' }[tab]}
            </button>
          ))}
        </div>
        <div className="titlebar-right">
          <input
            type="text"
            placeholder="搜索进程..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              padding: '5px 10px',
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-0)',
              fontSize: '12px',
              width: '150px',
              outline: 'none'
            }}
          />
          <div className="status-item">
            <div className={`status-dot ${isPlaying ? 'active' : 'idle'}`}></div>
            <span>{isPlaying ? '运行中' : '系统就绪'}</span>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="main-content">
        {/* 侧边栏 */}
        <aside className="sidebar">
          {/* 系统控制 */}
          <div className="sidebar-section">
            <div className="sidebar-label">系统控制</div>
            {[
              { key: 'all', icon: '📋', label: '所有进程', count: processes.length },
              { key: 'ready', icon: '⏳', label: '就绪队列', count: readyQueue.length },
              { key: 'running', icon: '▶', label: '运行中', count: runningProcess ? 1 : 0 },
              { key: 'blocked', icon: '⏸', label: '阻塞队列', count: blockedQueue.length },
              { key: 'terminated', icon: '✓', label: '已完成', count: processes.filter(p => p.state === 'TERMINATED').length }
            ].map(item => (
              <div
                key={item.key}
                className={`sidebar-item ${currentTab === item.key ? 'active' : ''}`}
                onClick={() => setCurrentTab(item.key)}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span>{item.label}</span>
                <span className="sidebar-badge">{item.count}</span>
              </div>
            ))}
          </div>

          {/* 快捷操作 */}
          <div className="sidebar-section">
            <div className="sidebar-label">快捷操作</div>
            <button className="control-btn primary" onClick={togglePlay} style={{ marginBottom: '6px' }}>
              <span>{isPlaying ? '⏸' : '▶'}</span>
              <span>{isPlaying ? '暂停模拟' : '开始模拟'}</span>
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button className="control-btn ghost" onClick={tick}>⏭ 单步</button>
              <button className="control-btn ghost" onClick={loadDemo}>📋 演示</button>
            </div>
            <button className="control-btn danger" onClick={resetSystem} style={{ marginTop: '6px' }}>↺ 重置</button>
          </div>

          {/* MySQL功能 */}
          <div className="sidebar-section">
            <div className="sidebar-label">数据库</div>
            <button className="control-btn success" onClick={saveResults} style={{ marginBottom: '6px', background: 'var(--green-soft)', color: 'var(--green)', border: '1px solid rgba(34,197,94,0.3)' }}>
              <span>💾</span>
              <span>保存结果</span>
            </button>
            <button className="control-btn ghost" onClick={() => { setActivePanel('history'); fetchHistory(); }} style={{ marginBottom: '6px' }}>
              <span>📜</span>
              <span>历史记录</span>
            </button>
            <button className="control-btn ghost" onClick={() => { setActivePanel('scenarios'); fetchScenarios(); }}>
              <span>📦</span>
              <span>实验场景</span>
            </button>
          </div>

          {/* 创建进程 */}
          <div className="control-card">
            <div className="control-title">创建进程</div>
            <div className="control-input">
              <div className="control-label">进程名称</div>
              <input type="text" className="control-field" value={inputName} onChange={(e) => setInputName(e.target.value)} placeholder="P1" />
            </div>
            <div className="control-row">
              <div className="control-input">
                <div className="control-label">执行时间</div>
                <input type="number" className="control-field" value={inputBurst} onChange={(e) => setInputBurst(e.target.value)} min="1" />
              </div>
              <div className="control-input">
                <div className="control-label">优先级</div>
                <input type="number" className="control-field" value={inputPriority} onChange={(e) => setInputPriority(e.target.value)} min="1" max="10" />
              </div>
            </div>
            <div className="control-input" style={{ marginBottom: '8px' }}>
              <div className="control-label">到达时间</div>
              <input type="number" className="control-field" value={inputArrival} onChange={(e) => setInputArrival(e.target.value)} min="0" />
            </div>
            <button className="control-btn primary" onClick={createProcess}>+ 创建进程</button>
          </div>

          {/* 调度算法 */}
          <div className="control-card">
            <div className="control-title">调度算法</div>
            <div className="algo-grid">
              {['FCFS', 'SJF', 'RR', 'Priority'].map(algo => (
                <div
                  key={algo}
                  className={`algo-option ${currentAlgo === algo ? 'active' : ''}`}
                  onClick={() => setScheduler(algo)}
                >
                  {{ FCFS: 'FCFS', SJF: 'SJF', RR: 'RR', Priority: '优先级' }[algo]}
                </div>
              ))}
            </div>
            <div className="control-input" style={{ marginTop: '8px' }}>
              <div className="control-label">时间片 (RR)</div>
              <input
                type="number"
                className="control-field"
                value={inputQuantum}
                onChange={(e) => setInputQuantum(e.target.value)}
                onBlur={setQuantum}
                min="1"
              />
            </div>
          </div>
        </aside>

        {/* 内容区 */}
        <div className="content">
          {/* 状态栏 */}
          <div className="status-bar">
            <div className="status-item">
              <span>时间</span>
              <span className="status-value">{currentTime}</span>
            </div>
            <div className="status-item">
              <span>CPU</span>
              <span className="status-value">{stats.cpuUsage}%</span>
            </div>
            <div className="status-item">
              <span>算法</span>
              <span className="status-value">{currentAlgo}</span>
            </div>
            <div className="status-item">
              <span>进程</span>
              <span className="status-value">{processes.length}</span>
            </div>
            <div style={{ flex: 1 }}></div>
            <div className="status-item">
              <span>{AlgoDesc[currentAlgo]}</span>
            </div>
            {activePanel !== 'main' && (
              <button className="control-btn ghost" onClick={() => setActivePanel('main')} style={{ padding: '4px 10px', fontSize: '11px' }}>
                ← 返回主界面
              </button>
            )}
          </div>

          {/* 历史记录面板 */}
          {activePanel === 'history' && (
            <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-0)' }}>📜 历史模拟记录</h3>
              {historyRecords.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>暂无历史记录，请先保存模拟结果</div>
              ) : (
                <table className="process-table">
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>算法</th>
                      <th>平均周转</th>
                      <th>平均等待</th>
                      <th>吞吐量</th>
                      <th>CPU利用率</th>
                      <th>总时间</th>
                      <th>完成数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRecords.map((record, i) => (
                      <tr key={i}>
                        <td>{new Date(record.createdAt).toLocaleString()}</td>
                        <td><span className="state-tag ready">{record.algorithm}</span></td>
                        <td>{record.avgTurnaround}</td>
                        <td>{record.avgWaiting}</td>
                        <td>{record.throughput}</td>
                        <td>{record.cpuUtilization}%</td>
                        <td>{record.totalTime}</td>
                        <td>{record.completedCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* 实验场景面板 */}
          {activePanel === 'scenarios' && (
            <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-0)' }}>📦 实验场景配置</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {scenarios.map(scenario => (
                  <div key={scenario.id} style={{
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => loadScenario(scenario.id)}
                  onMouseEnter={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onMouseLeave={(e) => e.target.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-0)' }}>{scenario.scenarioName}</span>
                      <span className={`state-tag ${scenario.loadType === 'light' ? 'ready' : scenario.loadType === 'medium' ? 'running' : 'blocked'}`}>
                        {scenario.loadType}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '8px' }}>{scenario.description}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>进程数: {scenario.processCount}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 主界面 */}
          {activePanel === 'main' && (
            <>

          {/* 状态流转图 */}
          <div className="state-flow-container">
            <div className="state-flow-title">进程状态流转</div>
            <div className="state-flow">
              {[
                { key: 'created', label: '新建', count: counts.created },
                { key: 'ready', label: '就绪', count: counts.ready },
                { key: 'running', label: '运行', count: counts.running },
                { key: 'blocked', label: '阻塞', count: counts.blocked },
                { key: 'terminated', label: '结束', count: counts.terminated }
              ].map((node, i) => (
                <React.Fragment key={node.key}>
                  <div className="state-node">
                    <div className={`state-circle ${node.key} ${
                      (node.key === 'running' && runningProcess) ||
                      (node.key === 'ready' && !runningProcess && readyQueue.length > 0) ||
                      (node.key === 'blocked' && !runningProcess && readyQueue.length === 0 && blockedQueue.length > 0) ||
                      (node.key === 'created' && processes.some(p => p.state === 'CREATED')) ||
                      (node.key === 'terminated' && processes.length > 0 && processes.every(p => p.state === 'TERMINATED'))
                      ? 'active' : ''
                    }`}>
                      {node.label}
                    </div>
                    <div className="state-count">{node.count}</div>
                  </div>
                  {i < 4 && (
                    <div className="state-arrow">
                      <svg width="40" height="16" viewBox="0 0 40 16">
                        <path d="M0 8 L32 8" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                        <path d="M28 4 L36 8 L28 12" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      </svg>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* 进程表格 */}
          <div className="table-wrapper">
            <table className="process-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>进程名</th>
                  <th>状态</th>
                  <th>优先级</th>
                  <th>到达</th>
                  <th>执行</th>
                  <th>剩余</th>
                  <th>进度</th>
                  <th>等待</th>
                  <th>周转</th>
                  <th>完成</th>
                </tr>
              </thead>
              <tbody>
                {filteredProcesses.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="empty-state">
                      <div className="empty-state-icon">📋</div>
                      <div>暂无进程，点击"创建进程"或"演示"开始</div>
                    </td>
                  </tr>
                ) : (
                  filteredProcesses.map(p => (
                    <tr
                      key={p.pid}
                      className={`${p.state === 'TERMINATED' ? 'terminated' : ''} ${selectedPid === p.pid ? 'selected' : ''}`}
                      onClick={() => setSelectedPid(p.pid)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ color: 'var(--text-3)' }}>{p.pid}</td>
                      <td>
                        <div className="process-name">
                          <div className="process-icon" style={{ background: p.color }}>
                            {p.name[1] || p.name[0]}
                          </div>
                          <span style={{ fontWeight: 500, color: 'var(--text-0)' }}>{p.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`state-tag ${p.state.toLowerCase()}`}>
                          <span className="dot"></span>
                          {StateNames[p.state.toLowerCase()] || p.state}
                        </span>
                      </td>
                      <td>{p.priority}</td>
                      <td>{p.arrivalTime}</td>
                      <td>{p.burstTime}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{p.remainingTime}</td>
                      <td>
                        <div className="mini-progress">
                          <div
                            className="mini-progress-fill"
                            style={{
                              width: `${((p.burstTime - p.remainingTime) / p.burstTime) * 100}%`,
                              background: p.color
                            }}
                          ></div>
                        </div>
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{p.waitingTime}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{p.turnaroundTime || '-'}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-3)' }}>{p.completionTime || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>

      {/* 底部面板 */}
      <div className="bottom-panel">
        {/* 甘特图 */}
        <div className="gantt-section">
          <div className="gantt-header">
            <div className="gantt-title">CPU 调度甘特图</div>
            <div className="gantt-legend">
              {[...new Set(ganttData.map(d => d.pid))].map(pid => {
                const d = ganttData.find(x => x.pid === pid)
                return (
                  <div key={pid} className="gantt-legend-item">
                    <div className="gantt-legend-dot" style={{ background: d.color }}></div>
                    {d.name}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="gantt-chart">
            <div className="gantt-timeline">
              {ganttData.length === 0 || currentTime === 0 ? (
                <div className="gantt-empty">点击"开始模拟"查看调度过程</div>
              ) : (
                ganttData.map((d, i) => (
                  <div
                    key={i}
                    className="gantt-block"
                    style={{
                      width: `${((d.end - d.start) / currentTime) * 100}%`,
                      background: d.color
                    }}
                  >
                    {d.name}
                  </div>
                ))
              )}
            </div>
            <div className="gantt-axis">
              {currentTime > 0 && Array.from({ length: Math.min(currentTime + 1, 20) }, (_, i) => (
                <span key={i} className="gantt-tick" style={{ width: `${100 / Math.min(currentTime + 1, 20)}%` }}>
                  {i}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 统计 */}
        <div className="stats-section">
          <div className="stats-title">调度统计</div>
          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-value">{stats.avgTurnaround || '-'}</div>
              <div className="stat-label">平均周转</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{stats.avgWaiting || '-'}</div>
              <div className="stat-label">平均等待</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{stats.completed || 0}</div>
              <div className="stat-label">已完成</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{stats.cpuUsage || 0}%</div>
              <div className="stat-label">CPU利用率</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
