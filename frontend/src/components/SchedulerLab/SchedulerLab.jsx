import React, { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import GanttPanel from './GanttPanel'
import MFQPanel from '../MFQPanel'

const API_BASE = '/api'
const StateNames = { created: '新建', ready: '就绪', running: '运行', blocked: '阻塞', terminated: '结束' }
const AlgoDesc = { FCFS: '先来先服务', SJF: '短作业优先', SRTN: '最短剩余时间优先', RR: '时间片轮转', Priority: '非抢占优先级', PreemptivePriority: '抢占式优先级', MFQ: '多级反馈队列' }

// 进程树节点组件
function ProcessTreeNode({ node, level }) {
  const stateColors = {
    CREATED: '#71717a', READY: '#3b82f6', RUNNING: '#22c55e',
    BLOCKED: '#f59e0b', TERMINATED: '#52525b'
  }
  const stateNames = { CREATED: '新建', READY: '就绪', RUNNING: '运行', BLOCKED: '阻塞', TERMINATED: '结束' }

  return (
    <div style={{marginLeft: level * 20}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 0'}}>
        <span style={{color:'#52525b'}}>{level > 0 ? '├─' : '●'}</span>
        <span style={{color:node.color,fontWeight:600}}>{node.name}</span>
        <span style={{fontSize:'11px',color:'#71717a'}}>(PID:{node.pid})</span>
        <span style={{fontSize:'10px',padding:'2px 6px',background:stateColors[node.state]+'22',color:stateColors[node.state],borderRadius:'4px'}}>{stateNames[node.state]}</span>
      </div>
      {node.children && node.children.map(child => (
        <ProcessTreeNode key={child.pid} node={child} level={level + 1} />
      ))}
    </div>
  )
}

function SchedulerLab() {
  const [processes, setProcesses] = useState([])
  const [readyQueue, setReadyQueue] = useState([])
  const [blockedQueue, setBlockedQueue] = useState([])
  const [runningProcess, setRunningProcess] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [currentAlgo, setCurrentAlgo] = useState('FCFS')
  const [ganttData, setGanttData] = useState([])
  const [stats, setStats] = useState({})
  const [selectedPid, setSelectedPid] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTab, setCurrentTab] = useState('all')
  const [searchText, setSearchText] = useState('')
  const [inputName, setInputName] = useState('P1')
  const [inputBurst, setInputBurst] = useState(5)
  const [inputPriority, setInputPriority] = useState(3)
  const [inputArrival, setInputArrival] = useState(0)
  const [inputQuantum, setInputQuantum] = useState(2)
  const [scenarios, setScenarios] = useState([])
  const [historyRecords, setHistoryRecords] = useState([])
  const [activePanel, setActivePanel] = useState('main')
  const playIntervalRef = useRef(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/processes`)
      const d = res.data
      setProcesses(d.processes || [])
      setReadyQueue(d.readyQueue || [])
      setBlockedQueue(d.blockedQueue || [])
      setRunningProcess(d.runningProcess)
      setCurrentTime(d.currentTime || 0)
      setCurrentAlgo(d.currentAlgo || 'FCFS')
      // 合并已完成的甘特图数据和当前运行的进程
      const allGantt = [...(d.ganttData || [])]
      if (d.currentGantt) {
        allGantt.push(d.currentGantt)
      }
      setGanttData(allGantt)
      setStats(d.stats || {})
      // MFQ队列信息
      if (d.mfqQueues) {
        setMfqQueues(d.mfqQueues)
      }
    } catch (e) { console.error(e) }
  }, [])

  // 进程树功能
  const [processTree, setProcessTree] = useState([])
  const [mfqQueues, setMfqQueues] = useState([0, 0, 0, 0])
  const fetchProcessTree = async () => { try { const r = await axios.get(`${API_BASE}/processes/tree`); setProcessTree(r.data || []) } catch(e) { console.error(e) } }

  // 同步演示功能
  const [syncLog, setSyncLog] = useState([])
  const [syncStatus, setSyncStatus] = useState({})
  const fetchSyncStatus = async () => {
    try {
      const r = await axios.get(`${API_BASE}/sync/status`)
      setSyncStatus(r.data)
      setSyncLog(r.data.log || [])
    } catch(e) { console.error(e) }
  }
  const startProducerConsumer = async () => { try { await axios.post(`${API_BASE}/sync/producer-consumer`); fetchSyncStatus() } catch(e) { console.error(e) } }
  const startDiningPhilosophers = async () => { try { await axios.post(`${API_BASE}/sync/dining-philosophers`); fetchSyncStatus() } catch(e) { console.error(e) } }
  const startReaderWriter = async () => { try { await axios.post(`${API_BASE}/sync/reader-writer`); fetchSyncStatus() } catch(e) { console.error(e) } }
  const stopSyncDemo = async () => { try { await axios.post(`${API_BASE}/sync/stop`); fetchSyncStatus() } catch(e) { console.error(e) } }
  const resetSyncDemo = async () => { try { await axios.post(`${API_BASE}/sync/reset`); fetchSyncStatus(); setSyncLog([]) } catch(e) { console.error(e) } }
  const forkProcess = async (pid) => {
    try {
      const childName = prompt('请输入子进程名称:', `P${pid}_child`)
      if (!childName) return
      await axios.post(`${API_BASE}/processes/${pid}/fork`, { name: childName })
      fetchData()
      fetchProcessTree()
    } catch(e) { console.error(e) }
  }
  const killTree = async (pid) => {
    if (!confirm('确定要终止该进程及其所有子进程吗？')) return
    try {
      const r = await axios.delete(`${API_BASE}/processes/${pid}/tree`)
      alert(`已终止 ${r.data.killedPids.length} 个进程`)
      fetchData()
      fetchProcessTree()
    } catch(e) { console.error(e) }
  }

  const fetchScenarios = async () => { try { const r = await axios.get(`${API_BASE}/scenarios`); setScenarios(r.data || []) } catch(e) { console.error(e) } }
  const fetchHistory = async () => { try { const r = await axios.get(`${API_BASE}/history`); setHistoryRecords(r.data || []) } catch(e) { console.error(e) } }
  const deleteHistoryRecord = async (id) => {
    if (!confirm('确定要删除这条记录吗？')) return
    try {
      await axios.delete(`${API_BASE}/history/${id}`)
      fetchHistory()
    } catch(e) { console.error(e) }
  }
  const clearAllHistory = async () => {
    if (!confirm('确定要清空所有历史记录吗？')) return
    try {
      await axios.delete(`${API_BASE}/history`)
      fetchHistory()
    } catch(e) { console.error(e) }
  }
  const replayHistory = async (id) => {
    if (!confirm('确定要重新创建这些进程吗？')) return
    try {
      await axios.post(`${API_BASE}/history/${id}/replay`)
      fetchData()
      setActivePanel('main')
    } catch(e) { console.error(e) }
  }
  const saveResults = async () => { try { await axios.post(`${API_BASE}/save`); alert('保存成功！'); fetchHistory() } catch(e) { alert('保存失败') } }
  const loadScenario = async (id) => { try { await axios.post(`${API_BASE}/scenarios/${id}/load`); fetchData(); setActivePanel('main') } catch(e) { console.error(e) } }
  const createProcess = async () => { try { await axios.post(`${API_BASE}/processes`, { name: inputName || `P${processes.length+1}`, burstTime: +inputBurst||5, priority: +inputPriority||3, arrivalTime: +inputArrival||0 }); fetchData(); setActivePanel('main') } catch(e) { console.error(e) } }
  const tick = async () => { try { await axios.post(`${API_BASE}/tick`); fetchData(); setActivePanel('main') } catch(e) { console.error(e) } }
  const resetSystem = async () => { stopPlay(); try { await axios.post(`${API_BASE}/reset`); setSelectedPid(null); fetchData(); setActivePanel('main') } catch(e) { console.error(e) } }
  const loadDemo = async () => { stopPlay(); try { await axios.post(`${API_BASE}/demo`); fetchData(); setActivePanel('main') } catch(e) { console.error(e) } }
  const setScheduler = async (algo) => { try { await axios.post(`${API_BASE}/scheduler`, { algo }); setCurrentAlgo(algo); fetchData() } catch(e) { console.error(e) } }

  const togglePlay = () => { isPlaying ? stopPlay() : startPlay() }
  const startPlay = () => {
    setIsPlaying(true)
    setActivePanel('main')
    playIntervalRef.current = setInterval(async () => {
      try { await axios.post(`${API_BASE}/tick`); fetchData(); const r = await axios.get(`${API_BASE}/processes`); if(r.data.processes.every(p => p.state==='TERMINATED')) stopPlay() } catch(e) { stopPlay() }
    }, 500)
  }
  const stopPlay = () => { setIsPlaying(false); if(playIntervalRef.current) { clearInterval(playIntervalRef.current); playIntervalRef.current = null } }

  // 删除进程
  const deleteProcess = async (pid) => {
    if (!confirm('确定删除这个进程？')) return
    try {
      await axios.delete(`${API_BASE}/processes/${pid}`)
      fetchData()
    } catch(e) { console.error(e) }
  }

  useEffect(() => { fetchData(); fetchScenarios(); fetchHistory(); fetchProcessTree(); return () => stopPlay() }, [fetchData])

  const counts = { created: processes.filter(p=>p.state==='CREATED').length, ready: readyQueue.length, running: runningProcess?1:0, blocked: blockedQueue.length, terminated: processes.filter(p=>p.state==='TERMINATED').length }
  let filteredProcesses = processes
  if(currentTab!=='all') filteredProcesses = processes.filter(p=>p.state.toLowerCase()===currentTab)
  if(searchText) filteredProcesses = filteredProcesses.filter(p=>p.name.toLowerCase().includes(searchText.toLowerCase()))

  return (
    <div className="app">
      <header className="titlebar">
        <div className="titlebar-tabs">
          {['all','ready','running','blocked','terminated'].map(tab => (
            <button key={tab} className={`titlebar-tab ${currentTab===tab?'active':''}`} onClick={()=>setCurrentTab(tab)}>
              {{all:'所有进程',ready:'就绪队列',running:'运行中',blocked:'阻塞队列',terminated:'已完成'}[tab]}
            </button>
          ))}
        </div>
        <div className="titlebar-right">
          <input type="text" placeholder="搜索..." value={searchText} onChange={e=>setSearchText(e.target.value)} style={{padding:'5px 10px',background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:'6px',color:'var(--text-0)',fontSize:'12px',width:'120px',outline:'none'}} />
          <div className="status-item"><div className={`status-dot ${isPlaying?'active':'idle'}`}></div><span>{isPlaying?'运行中':'就绪'}</span></div>
        </div>
      </header>

      <div className="main-content">
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">系统控制</div>
            {[{k:'all',i:'📋',l:'所有进程',c:processes.length},{k:'ready',i:'⏳',l:'就绪队列',c:readyQueue.length},{k:'running',i:'▶',l:'运行中',c:runningProcess?1:0},{k:'blocked',i:'⏸',l:'阻塞队列',c:blockedQueue.length},{k:'terminated',i:'✓',l:'已完成',c:counts.terminated}].map(item=>(
              <div key={item.k} className={`sidebar-item ${currentTab===item.k?'active':''}`} onClick={()=>setCurrentTab(item.k)}>
                <span className="sidebar-icon">{item.i}</span><span>{item.l}</span><span className="sidebar-badge">{item.c}</span>
              </div>
            ))}
          </div>
          <div className="sidebar-section">
            <div className="sidebar-label">快捷操作</div>
            <button className="control-btn primary" onClick={togglePlay} style={{marginBottom:'6px'}}><span>{isPlaying?'⏸':'▶'}</span><span>{isPlaying?'暂停':'开始'}</span></button>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
              <button className="control-btn ghost" onClick={tick}>⏭ 单步</button>
              <button className="control-btn ghost" onClick={loadDemo}>📋 演示</button>
            </div>
            <button className="control-btn danger" onClick={resetSystem} style={{marginTop:'6px'}}>↺ 重置</button>
          </div>
          <div className="sidebar-section">
            <div className="sidebar-label">进程树</div>
            <button className="control-btn ghost" onClick={()=>{fetchProcessTree();setActivePanel('tree')}} style={{marginBottom:'6px'}}><span>🌳</span><span>查看进程树</span></button>
            {selectedPid && (
              <>
                <button className="control-btn ghost" onClick={()=>forkProcess(selectedPid)} style={{marginBottom:'6px'}}><span>🔱</span><span>派生子进程</span></button>
                <button className="control-btn" onClick={()=>killTree(selectedPid)} style={{background:'var(--red-soft)',color:'var(--red)',border:'1px solid rgba(239,68,68,0.3)'}}><span>☠</span><span>级联终止</span></button>
              </>
            )}
          </div>
          <div className="sidebar-section">
            <div className="sidebar-label">同步演示</div>
            <button className="control-btn ghost" onClick={()=>{fetchSyncStatus();setActivePanel('sync')}} style={{marginBottom:'6px'}}><span>🔒</span><span>同步互斥演示</span></button>
          </div>
          <div className="sidebar-section">
            <div className="sidebar-label">数据库</div>
            <button className="control-btn" onClick={saveResults} style={{marginBottom:'6px',background:'var(--green-soft)',color:'var(--green)',border:'1px solid rgba(34,197,94,0.3)'}}><span>💾</span><span>保存结果</span></button>
            <button className="control-btn ghost" onClick={()=>{setActivePanel('history');fetchHistory()}} style={{marginBottom:'6px'}}><span>📜</span><span>历史记录</span></button>
            <button className="control-btn ghost" onClick={()=>{setActivePanel('scenarios');fetchScenarios()}}><span>📦</span><span>实验场景</span></button>
          </div>
          <div className="control-card">
            <div className="control-title">创建进程</div>
            <div className="control-input"><div className="control-label">名称</div><input className="control-field" value={inputName} onChange={e=>setInputName(e.target.value)} /></div>
            <div className="control-input"><div className="control-label">执行时间</div><input type="number" className="control-field" value={inputBurst} onChange={e=>setInputBurst(e.target.value)} /></div>
            <div className="control-input"><div className="control-label">优先级</div><input type="number" className="control-field" value={inputPriority} onChange={e=>setInputPriority(e.target.value)} /></div>
            <div className="control-input" style={{marginBottom:'8px'}}><div className="control-label">到达时间</div><input type="number" className="control-field" value={inputArrival} onChange={e=>setInputArrival(e.target.value)} /></div>
            <button className="control-btn primary" onClick={createProcess}>+ 创建</button>
          </div>
          <div className="control-card">
            <div className="control-title">调度算法</div>
            <div className="algo-grid">
              {['FCFS','SJF','SRTN','RR','Priority','PreemptivePriority','MFQ'].map(a=>(<div key={a} className={`algo-option ${currentAlgo===a?'active':''}`} onClick={()=>setScheduler(a)}>{{FCFS:'FCFS',SJF:'SJF',SRTN:'SRTN',RR:'RR',Priority:'优先级',PreemptivePriority:'抢占优先级',MFQ:'MFQ'}[a]}</div>))}
            </div>
            {currentAlgo === 'RR' && <div className="control-input" style={{marginTop:'8px'}}><div className="control-label">时间片(RR)</div><input type="number" className="control-field" value={inputQuantum} onChange={e=>setInputQuantum(e.target.value)} min="1" /></div>}
          </div>
        </aside>

        <div className="content">
          <div className="status-bar">
            <div className="status-item"><span>时间</span><span className="status-value">{currentTime}</span></div>
            <div className="status-item"><span>CPU</span><span className="status-value">{stats.cpuUsage||0}%</span></div>
            <div className="status-item"><span>算法</span><span className="status-value">{currentAlgo}</span></div>
            <div className="status-item"><span>进程</span><span className="status-value">{processes.length}</span></div>
            <div style={{flex:1}}></div>
            <div className="status-item"><span>{AlgoDesc[currentAlgo]}</span></div>
            {activePanel!=='main'&&<button className="control-btn ghost" onClick={()=>setActivePanel('main')} style={{padding:'4px 10px',fontSize:'11px'}}>← 返回</button>}
          </div>

          {activePanel==='history'&&(
            <div style={{flex:1,padding:'20px',overflow:'auto'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
                <h3 style={{fontSize:'16px',fontWeight:600,color:'var(--text-0)'}}>📜 历史模拟记录</h3>
                {historyRecords.length > 0 && (
                  <button onClick={clearAllHistory} style={{padding:'6px 12px',background:'var(--red-soft)',color:'var(--red)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'6px',cursor:'pointer',fontSize:'12px'}}>🗑 清空全部</button>
                )}
              </div>
              {historyRecords.length===0?<div style={{textAlign:'center',padding:'40px',color:'var(--text-3)'}}>暂无记录</div>:(
                <table className="process-table"><thead><tr><th>时间</th><th>算法</th><th>平均周转</th><th>平均等待</th><th>吞吐量</th><th>CPU</th><th>总时间</th><th>完成数</th><th>操作</th></tr></thead>
                <tbody>{historyRecords.map((r,i)=>(<tr key={i||r.createdAt}><td>{new Date(r.createdAt).toLocaleString()}</td><td><span className="state-tag ready">{r.algorithm}</span></td><td>{r.avgTurnaround}</td><td>{r.avgWaiting}</td><td>{r.throughput}</td><td>{r.cpuUtilization}%</td><td>{r.totalTime}</td><td>{r.completedCount}</td><td style={{display:'flex',gap:'4px'}}><button onClick={()=>replayHistory(r.id)} style={{padding:'4px 8px',background:'var(--green-soft)',color:'var(--green)',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'11px'}}>重新创建</button><button onClick={()=>deleteHistoryRecord(r.id)} style={{padding:'4px 8px',background:'var(--red-soft)',color:'var(--red)',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'11px'}}>删除</button></td></tr>))}</tbody></table>
              )}
            </div>
          )}

          {activePanel==='sync' && (
            <div style={{flex:1,padding:'20px',overflow:'auto'}}>
              <h3 style={{fontSize:'16px',fontWeight:600,marginBottom:'16px',color:'var(--text-0)'}}>🔒 进程同步互斥演示</h3>

              {/* 演示选择 */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'20px'}}>
                <div onClick={startProducerConsumer} style={{background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:'12px',padding:'16px',cursor:'pointer',textAlign:'center'}}>
                  <div style={{fontSize:'24px',marginBottom:'8px'}}>🏭</div>
                  <div style={{fontWeight:600,color:'var(--text-0)',marginBottom:'4px'}}>生产者消费者</div>
                  <div style={{fontSize:'11px',color:'var(--text-3)'}}>信号量+互斥锁</div>
                </div>
                <div onClick={startDiningPhilosophers} style={{background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:'12px',padding:'16px',cursor:'pointer',textAlign:'center'}}>
                  <div style={{fontSize:'24px',marginBottom:'8px'}}>🍽️</div>
                  <div style={{fontWeight:600,color:'var(--text-0)',marginBottom:'4px'}}>哲学家就餐</div>
                  <div style={{fontSize:'11px',color:'var(--text-3)'}}>死锁避免</div>
                </div>
                <div onClick={startReaderWriter} style={{background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:'12px',padding:'16px',cursor:'pointer',textAlign:'center'}}>
                  <div style={{fontSize:'24px',marginBottom:'8px'}}>📖</div>
                  <div style={{fontWeight:600,color:'var(--text-0)',marginBottom:'4px'}}>读者写者</div>
                  <div style={{fontSize:'11px',color:'var(--text-3)'}}>读写锁</div>
                </div>
              </div>

              {/* 控制按钮 */}
              <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
                <button className="control-btn" onClick={stopSyncDemo} style={{background:'var(--amber-soft)',color:'var(--amber)',border:'1px solid rgba(245,158,11,0.3)'}}>⏹ 停止</button>
                <button className="control-btn" onClick={resetSyncDemo}>↺ 重置</button>
                <button className="control-btn ghost" onClick={fetchSyncStatus}>🔄 刷新状态</button>
              </div>

              {/* 状态信息 */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',marginBottom:'16px'}}>
                <div style={{background:'var(--bg-2)',borderRadius:'8px',padding:'12px',textAlign:'center'}}>
                  <div style={{fontSize:'18px',fontWeight:700,color:'var(--text-0)'}}>{syncStatus.buffer || 0}</div>
                  <div style={{fontSize:'11px',color:'var(--text-3)'}}>缓冲区</div>
                </div>
                <div style={{background:'var(--bg-2)',borderRadius:'8px',padding:'12px',textAlign:'center'}}>
                  <div style={{fontSize:'18px',fontWeight:700,color:'var(--green)'}}>{syncStatus.producerCount || 0}</div>
                  <div style={{fontSize:'11px',color:'var(--text-3)'}}>已生产</div>
                </div>
                <div style={{background:'var(--bg-2)',borderRadius:'8px',padding:'12px',textAlign:'center'}}>
                  <div style={{fontSize:'18px',fontWeight:700,color:'var(--blue)'}}>{syncStatus.consumerCount || 0}</div>
                  <div style={{fontSize:'11px',color:'var(--text-3)'}}>已消费</div>
                </div>
                <div style={{background:'var(--bg-2)',borderRadius:'8px',padding:'12px',textAlign:'center'}}>
                  <div style={{fontSize:'18px',fontWeight:700,color:'var(--text-0)'}}>{syncStatus.semaphoreValue || 0}</div>
                  <div style={{fontSize:'11px',color:'var(--text-3)'}}>信号量</div>
                </div>
              </div>

              {/* 日志 */}
              <div style={{background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:'8px',padding:'12px',maxHeight:'300px',overflow:'auto',fontFamily:'monospace',fontSize:'12px'}}>
                <div style={{color:'var(--text-3)',marginBottom:'8px',fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.5px'}}>运行日志</div>
                {syncLog.length === 0 ? (
                  <div style={{color:'var(--text-3)',textAlign:'center',padding:'20px'}}>点击上方演示开始</div>
                ) : (
                  syncLog.slice().reverse().map((log, i) => (
                    <div key={i} style={{padding:'4px 0',color:'var(--text-2)',borderBottom:'1px solid var(--border)'}}>{log}</div>
                  ))
                )}
              </div>
            </div>
          )}

          {activePanel==='tree' && (
            <div style={{flex:1,padding:'20px',overflow:'auto'}}>
              <h3 style={{fontSize:'16px',fontWeight:600,marginBottom:'16px',color:'var(--text-0)'}}>🌳 进程树</h3>
              {processTree.length === 0 ? (
                <div style={{textAlign:'center',padding:'40px',color:'var(--text-3)'}}>暂无进程树数据</div>
              ) : (
                <div style={{fontFamily:'monospace',fontSize:'13px'}}>
                  {processTree.map(node => (
                    <ProcessTreeNode key={node.pid} node={node} level={0} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activePanel==='scenarios'&&(
            <div style={{flex:1,padding:'20px',overflow:'auto'}}>
              <h3 style={{fontSize:'16px',fontWeight:600,marginBottom:'16px',color:'var(--text-0)'}}>📦 实验场景</h3>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'16px'}}>
                {scenarios.map(s=>(
                  <div key={s.id} onClick={()=>loadScenario(s.id)} style={{background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:'12px',padding:'16px',cursor:'pointer'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}><span style={{fontWeight:600,color:'var(--text-0)'}}>{s.scenarioName}</span><span className={`state-tag ${s.loadType==='light'?'ready':s.loadType==='medium'?'running':'blocked'}`}>{s.loadType}</span></div>
                    <div style={{fontSize:'12px',color:'var(--text-2)',marginBottom:'8px'}}>{s.description}</div>
                    <div style={{fontSize:'11px',color:'var(--text-3)'}}>进程数: {s.processCount}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activePanel==='main'&&(
            <>
              <div className="state-flow-container">
                <div className="state-flow-title">进程状态流转</div>
                <div className="state-flow">
                  {[{k:'created',l:'新建',c:counts.created},{k:'ready',l:'就绪',c:counts.ready},{k:'running',l:'运行',c:counts.running},{k:'blocked',l:'阻塞',c:counts.blocked},{k:'terminated',l:'结束',c:counts.terminated}].map((n,i)=>(
                    <React.Fragment key={n.k}>
                      <div className="state-node">
                        <div className={`state-circle ${n.k} ${(n.k==='running'&&runningProcess)||(n.k==='ready'&&!runningProcess&&readyQueue.length>0)||(n.k==='blocked'&&!runningProcess&&readyQueue.length===0&&blockedQueue.length>0)||(n.k==='created'&&processes.some(p=>p.state==='CREATED'))||(n.k==='terminated'&&processes.length>0&&processes.every(p=>p.state==='TERMINATED'))?'active':''}`}>{n.l}</div>
                        <div className="state-count">{n.c}</div>
                      </div>
                      {i<4&&<div className="state-arrow"><svg width="40" height="16" viewBox="0 0 40 16"><path d="M0 8 L32 8" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M28 4 L36 8 L28 12" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg></div>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div className="table-wrapper">
                <table className="process-table">
                  <thead><tr><th>#</th><th>进程名</th><th>状态</th><th>优先级</th><th>到达</th><th>执行</th><th>剩余</th><th>进度</th><th>等待</th><th>周转</th><th>完成</th><th>操作</th></tr></thead>
                  <tbody>
                    {filteredProcesses.length===0?<tr><td colSpan="11" className="empty-state"><div className="empty-state-icon">📋</div><div>暂无进程</div></td></tr>:
                    filteredProcesses.map(p=>(
                      <tr key={p.pid} className={`${p.state==='TERMINATED'?'terminated':''} ${selectedPid===p.pid?'selected':''}`} onClick={()=>setSelectedPid(p.pid)} style={{cursor:'pointer'}}>
                        <td style={{color:'var(--text-3)'}}>{p.pid}</td>
                        <td><div className="process-name"><div className="process-icon" style={{background:p.color}}>{p.name[1]||p.name[0]}</div><span style={{fontWeight:500,color:'var(--text-0)'}}>{p.name}</span></div></td>
                        <td><span className={`state-tag ${p.state.toLowerCase()}`}><span className="dot"></span>{StateNames[p.state.toLowerCase()]}</span></td>
                        <td>{p.priority}</td><td>{p.arrivalTime}</td><td>{p.burstTime}</td>
                        <td>{p.remainingTime}</td>
                        <td><div className="mini-progress"><div className="mini-progress-fill" style={{width:`${((p.burstTime-p.remainingTime)/p.burstTime)*100}%`,background:p.color}}></div></div></td>
                        <td>{p.waitingTime}</td><td>{p.turnaroundTime||'-'}</td><td style={{color:'var(--text-3)'}}>{p.completionTime||'-'}</td>
                        <td><button onClick={(e)=>{e.stopPropagation();deleteProcess(p.pid)}} style={{background:'var(--red-soft)',color:'var(--red)',border:'none',borderRadius:'4px',padding:'3px 8px',cursor:'pointer',fontSize:'11px'}}>删除</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          </div>
        </div>

      {/* 甘特图 — 底部浮动面板，鼠标移到底部才显示 */}
      <GanttPanel ganttData={ganttData} currentTime={currentTime} stats={stats} currentAlgo={currentAlgo} mfqQueues={mfqQueues} processes={processes} runningProcess={runningProcess} />
    </div>
  )
}

export default SchedulerLab
