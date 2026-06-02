import React, { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'

const API_BASE = '/api'
const StateNames = { created: '新建', ready: '就绪', running: '运行', blocked: '阻塞', terminated: '结束' }
const AlgoDesc = { FCFS: '先来先服务', SJF: '短作业优先', RR: '时间片轮转', Priority: '优先级调度' }

function App() {
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
      setGanttData(d.ganttData || [])
      setStats(d.stats || {})
    } catch (e) { console.error(e) }
  }, [])

  const fetchScenarios = async () => { try { const r = await axios.get(`${API_BASE}/scenarios`); setScenarios(r.data || []) } catch(e) { console.error(e) } }
  const fetchHistory = async () => { try { const r = await axios.get(`${API_BASE}/history`); setHistoryRecords(r.data || []) } catch(e) { console.error(e) } }
  const saveResults = async () => { try { await axios.post(`${API_BASE}/save`); alert('保存成功！'); fetchHistory() } catch(e) { alert('保存失败') } }
  const loadScenario = async (id) => { try { await axios.post(`${API_BASE}/scenarios/${id}/load`); fetchData(); setActivePanel('main') } catch(e) { console.error(e) } }
  const createProcess = async () => { try { await axios.post(`${API_BASE}/processes`, { name: inputName || `P${processes.length+1}`, burstTime: +inputBurst||5, priority: +inputPriority||3, arrivalTime: +inputArrival||0 }); fetchData() } catch(e) { console.error(e) } }
  const tick = async () => { try { await axios.post(`${API_BASE}/tick`); fetchData() } catch(e) { console.error(e) } }
  const resetSystem = async () => { stopPlay(); try { await axios.post(`${API_BASE}/reset`); setSelectedPid(null); fetchData() } catch(e) { console.error(e) } }
  const loadDemo = async () => { stopPlay(); try { await axios.post(`${API_BASE}/demo`); fetchData() } catch(e) { console.error(e) } }
  const setScheduler = async (algo) => { try { await axios.post(`${API_BASE}/scheduler`, { algo }); setCurrentAlgo(algo); fetchData() } catch(e) { console.error(e) } }

  const togglePlay = () => { isPlaying ? stopPlay() : startPlay() }
  const startPlay = () => {
    setIsPlaying(true)
    playIntervalRef.current = setInterval(async () => {
      try { await axios.post(`${API_BASE}/tick`); fetchData(); const r = await axios.get(`${API_BASE}/processes`); if(r.data.processes.every(p => p.state==='TERMINATED')) stopPlay() } catch(e) { stopPlay() }
    }, 500)
  }
  const stopPlay = () => { setIsPlaying(false); if(playIntervalRef.current) { clearInterval(playIntervalRef.current); playIntervalRef.current = null } }

  useEffect(() => { fetchData(); fetchScenarios(); fetchHistory(); return () => stopPlay() }, [fetchData])

  const counts = { created: processes.filter(p=>p.state==='CREATED').length, ready: readyQueue.length, running: runningProcess?1:0, blocked: blockedQueue.length, terminated: processes.filter(p=>p.state==='TERMINATED').length }
  let filteredProcesses = processes
  if(currentTab!=='all') filteredProcesses = processes.filter(p=>p.state.toLowerCase()===currentTab)
  if(searchText) filteredProcesses = filteredProcesses.filter(p=>p.name.toLowerCase().includes(searchText.toLowerCase()))

  return (
    <div className="app">
      <header className="titlebar">
        <div className="traffic-lights"><div className="traffic-light close"></div><div className="traffic-light minimize"></div><div className="traffic-light maximize"></div></div>
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
            <div className="sidebar-label">数据库</div>
            <button className="control-btn" onClick={saveResults} style={{marginBottom:'6px',background:'var(--green-soft)',color:'var(--green)',border:'1px solid rgba(34,197,94,0.3)'}}><span>💾</span><span>保存结果</span></button>
            <button className="control-btn ghost" onClick={()=>{setActivePanel('history');fetchHistory()}} style={{marginBottom:'6px'}}><span>📜</span><span>历史记录</span></button>
            <button className="control-btn ghost" onClick={()=>{setActivePanel('scenarios');fetchScenarios()}}><span>📦</span><span>实验场景</span></button>
          </div>
          <div className="control-card">
            <div className="control-title">创建进程</div>
            <div className="control-input"><div className="control-label">名称</div><input className="control-field" value={inputName} onChange={e=>setInputName(e.target.value)} /></div>
            <div className="control-row">
              <div className="control-input"><div className="control-label">执行时间</div><input type="number" className="control-field" value={inputBurst} onChange={e=>setInputBurst(e.target.value)} /></div>
              <div className="control-input"><div className="control-label">优先级</div><input type="number" className="control-field" value={inputPriority} onChange={e=>setInputPriority(e.target.value)} /></div>
            </div>
            <div className="control-input" style={{marginBottom:'8px'}}><div className="control-label">到达时间</div><input type="number" className="control-field" value={inputArrival} onChange={e=>setInputArrival(e.target.value)} /></div>
            <button className="control-btn primary" onClick={createProcess}>+ 创建</button>
          </div>
          <div className="control-card">
            <div className="control-title">调度算法</div>
            <div className="algo-grid">
              {['FCFS','SJF','RR','Priority'].map(a=>(<div key={a} className={`algo-option ${currentAlgo===a?'active':''}`} onClick={()=>setScheduler(a)}>{{FCFS:'FCFS',SJF:'SJF',RR:'RR',Priority:'优先级'}[a]}</div>))}
            </div>
            <div className="control-input" style={{marginTop:'8px'}}><div className="control-label">时间片(RR)</div><input type="number" className="control-field" value={inputQuantum} onChange={e=>setInputQuantum(e.target.value)} min="1" /></div>
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
              <h3 style={{fontSize:'16px',fontWeight:600,marginBottom:'16px',color:'var(--text-0)'}}>📜 历史模拟记录</h3>
              {historyRecords.length===0?<div style={{textAlign:'center',padding:'40px',color:'var(--text-3)'}}>暂无记录</div>:(
                <table className="process-table"><thead><tr><th>时间</th><th>算法</th><th>平均周转</th><th>平均等待</th><th>吞吐量</th><th>CPU</th><th>总时间</th><th>完成数</th></tr></thead>
                <tbody>{historyRecords.map((r,i)=>(<tr key={i}><td>{new Date(r.createdAt).toLocaleString()}</td><td><span className="state-tag ready">{r.algorithm}</span></td><td>{r.avgTurnaround}</td><td>{r.avgWaiting}</td><td>{r.throughput}</td><td>{r.cpuUtilization}%</td><td>{r.totalTime}</td><td>{r.completedCount}</td></tr>))}</tbody></table>
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
                  <thead><tr><th>#</th><th>进程名</th><th>状态</th><th>优先级</th><th>到达</th><th>执行</th><th>剩余</th><th>进度</th><th>等待</th><th>周转</th><th>完成</th></tr></thead>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bottom-panel">
        <div className="gantt-section">
          <div className="gantt-header">
            <div className="gantt-title">CPU 调度甘特图</div>
            <div className="gantt-legend">{[...new Set(ganttData.map(d=>d.pid))].map(pid=>{const d=ganttData.find(x=>x.pid===pid);return<div key={pid} className="gantt-legend-item"><div className="gantt-legend-dot" style={{background:d.color}}></div>{d.name}</div>})}</div>
          </div>
          <div className="gantt-chart">
            <div className="gantt-timeline">
              {ganttData.length===0||currentTime===0?<div className="gantt-empty">点击"开始模拟"查看</div>:ganttData.map((d,i)=><div key={i} className="gantt-block" style={{width:`${((d.end-d.start)/currentTime)*100}%`,background:d.color}}>{d.name}</div>)}
            </div>
            <div className="gantt-axis">{currentTime>0&&Array.from({length:Math.min(currentTime+1,20)},(_,i)=><span key={i} className="gantt-tick" style={{width:`${100/Math.min(currentTime+1,20)}%`}}>{i}</span>)}</div>
          </div>
        </div>
        <div className="stats-section">
          <div className="stats-title">调度统计</div>
          <div className="stats-grid">
            <div className="stat-box"><div className="stat-value">{stats.avgTurnaround||'-'}</div><div className="stat-label">平均周转</div></div>
            <div className="stat-box"><div className="stat-value">{stats.avgWaiting||'-'}</div><div className="stat-label">平均等待</div></div>
            <div className="stat-box"><div className="stat-value">{stats.completed||0}</div><div className="stat-label">已完成</div></div>
            <div className="stat-box"><div className="stat-value">{stats.cpuUsage||0}%</div><div className="stat-label">CPU</div></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
