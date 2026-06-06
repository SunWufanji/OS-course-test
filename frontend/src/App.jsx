import React, { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import Desktop from './components/Desktop/Desktop'
import TaskBar from './components/Desktop/TaskBar'
import Window from './components/Desktop/Window'
import TaskManager from './components/TaskManager/TaskManager'
import SchedulerLab from './components/SchedulerLab/SchedulerLab'
import SystemLogViewer from './components/SystemLog/SystemLogViewer'
import SyncLab from './components/SyncLab/SyncLab'
import IoDeviceManager from './components/Desktop/IODeviceManager'
import ControlCenter from './components/Desktop/ControlCenter'
import AppLauncher from './components/Desktop/AppLauncher'
import TerminalWindow from './components/Desktop/TerminalWindow'

const API_BASE = '/api'

function App() {
  const [systemStatus, setSystemStatus] = useState(null)
  const [sandboxProcesses, setSandboxProcesses] = useState([])
  const [availableApps, setAvailableApps] = useState([])
  const [windows, setWindows] = useState([])
  const [activeWindowId, setActiveWindowId] = useState(null)
  const nextWindowId = useRef(1)
  const [controlCenterOpen, setControlCenterOpen] = useState(false)
  const [launcherOpen, setLauncherOpen] = useState(false)

  const fetchSystemStatus = useCallback(async () => {
    try { const res = await axios.get(`${API_BASE}/system/status`); setSystemStatus(res.data) } catch {}
  }, [])
  const fetchSandboxProcesses = useCallback(async () => {
    try { const res = await axios.get(`${API_BASE}/process/sandbox`); setSandboxProcesses(res.data) } catch {}
  }, [])
  const fetchAvailableApps = useCallback(async () => {
    try { const res = await axios.get(`${API_BASE}/system/apps`); setAvailableApps(res.data) } catch {}
  }, [])

  const launchApp = async (appName) => {
    // 终端是纯 UI 工具，不占进程槽
    if (appName === '终端') { openWindow('终端', {}); return }
    try {
      const res = await axios.post(`${API_BASE}/process/launch`, { appName })
      if (res.data.success && res.data.waitingMemory) {
        // 内存不足，进程已进入阻塞队列
        fetchSandboxProcesses()
      } else if (res.data.success) {
        openWindow(appName, res.data.process)
        fetchSandboxProcesses()
      } else if (res.data.alreadyRunning) {
        // 已运行，激活对应窗口
        const existingPid = res.data.existingPid
        const win = windows.find(w => w.pid === existingPid)
        if (win) activateWindow(win.id)
        else openWindow(appName, { pid: existingPid })
      } else {
        alert(res.data.error || '启动失败')
      }
    } catch (err) { console.error(err) }
  }

  const terminateProcess = async (pid) => {
    try { await axios.post(`${API_BASE}/process/${pid}/terminate`); closeWindowByPid(pid); fetchSandboxProcesses() } catch {}
  }
  const suspendProcess = async (pid) => {
    try { await axios.post(`${API_BASE}/process/${pid}/suspend`); fetchSandboxProcesses() } catch {}
  }
  const resumeProcess = async (pid) => {
    try { await axios.post(`${API_BASE}/process/${pid}/resume`); fetchSandboxProcesses() } catch {}
  }
  const resetSandbox = async () => {
    try { await axios.post(`${API_BASE}/system/reset`); setWindows([]); fetchSandboxProcesses(); fetchSystemStatus() } catch {}
  }

  const getWindowConfig = (appName) => {
    const configs = {
      '内核算法实验室': { title: '内核算法实验室 v2.0', icon: '🧪', component: 'SchedulerLab', width: '100%', height: '100%' },
      '任务管理器': { title: '任务管理器', icon: '⚙️', component: 'TaskManager', width: 860, height: 560 },
      '系统日志': { title: '系统事件查看器', icon: '📋', component: 'SystemLog', width: 900, height: 520 },
      '同步互斥实验室': { title: '同步互斥实验室', icon: '🔒', component: 'SyncLab', width: 860, height: 560 },
      'I/O设备管理': { title: 'I/O 设备管理器', icon: '🔧', component: 'IoDeviceManager', width: 700, height: 500 },
      '终端': { title: '终端', icon: '⬛', component: 'Terminal', width: 700, height: 460 },
    }
    if (configs[appName]) return configs[appName]
    const app = availableApps.find(a => a.name === appName)
    const iconMap = { 'CS:GO': '/picture/CS2.jpg' }
    const icon = iconMap[appName] || app?.icon || '📱'
    const isImageIcon = !!iconMap[appName]
    return { title: appName, icon, component: 'AppProcess', width: 560, height: 400, isImageIcon }
  }

  const openWindow = (appName, process) => {
    const config = getWindowConfig(appName)
    const existing = windows.find(w => w.title === config.title)
    if (existing) { activateWindow(existing.id); return }
    const id = nextWindowId.current++
    setWindows(prev => [...prev, {
      id, title: config.title, icon: config.icon, isImageIcon: config.isImageIcon, component: config.component, pid: process?.pid,
      x: 60 + (prev.length % 6) * 30, y: 20 + (prev.length % 6) * 30,
      width: config.width, height: config.height, minimized: false, maximized: false
    }])
    setActiveWindowId(id)
  }
  const closeWindow = (id) => { setWindows(prev => prev.filter(w => w.id !== id)); if (activeWindowId === id) setActiveWindowId(null) }
  const closeWindowByPid = (pid) => { setWindows(prev => prev.filter(w => w.pid !== pid)) }
  const minimizeWindow = (id) => { setWindows(prev => prev.map(w => w.id === id ? { ...w, minimized: true } : w)) }
  const maximizeWindow = (id) => { setWindows(prev => prev.map(w => w.id === id ? { ...w, maximized: !w.maximized } : w)) }
  const activateWindow = (id) => {
    setActiveWindowId(id)
    setWindows(prev => {
      const win = prev.find(w => w.id === id)
      if (!win) return prev
      const others = prev.filter(w => w.id !== id)
      return [...others, { ...win, minimized: false }]
    })
  }

  useEffect(() => {
    fetchAvailableApps(); fetchSystemStatus(); fetchSandboxProcesses()
    const timer = setInterval(() => { fetchSystemStatus(); fetchSandboxProcesses() }, 1000)
    return () => clearInterval(timer)
  }, [fetchAvailableApps, fetchSystemStatus, fetchSandboxProcesses])

  return (
    <div className="app-container">
      <Desktop apps={availableApps} onLaunchApp={launchApp} systemStatus={systemStatus}
        onOpenTaskManager={() => openWindow('任务管理器')}
        onOpenKernelLab={() => openWindow('内核算法实验室')}
        onOpenSystemLog={() => openWindow('系统日志')} />

      {windows.map(win => !win.minimized && (
        <Window key={win.id} id={win.id} title={win.title} icon={win.icon} isImageIcon={win.isImageIcon}
          x={win.x} y={win.y} width={win.width} height={win.height}
          maximized={win.maximized} isActive={activeWindowId === win.id}
          onClose={() => closeWindow(win.id)} onMinimize={() => minimizeWindow(win.id)}
          onMaximize={() => maximizeWindow(win.id)} onActivate={() => activateWindow(win.id)}>
          {win.component === 'SchedulerLab' && <SchedulerLab />}
          {win.component === 'SyncLab' && <SyncLab />}
          {win.component === 'IoDeviceManager' && <IoDeviceManager />}
          {win.component === 'TaskManager' && (
            <TaskManager processes={sandboxProcesses} systemStatus={systemStatus}
              onTerminate={terminateProcess} onSuspend={suspendProcess} onResume={resumeProcess} />
          )}
          {win.component === 'SystemLog' && <SystemLogViewer />}
          {win.component === 'AppProcess' && (
            <AppProcessView appName={win.title} pid={win.pid}
              process={sandboxProcesses.find(p => p.pid === win.pid)} onTerminate={terminateProcess} />
          )}
          {win.component === 'Terminal' && (
            <TerminalWindow
              sandboxProcesses={sandboxProcesses}
              onLaunchApp={launchApp}
              onTerminate={terminateProcess}
              onSuspend={suspendProcess}
              onResume={resumeProcess}
            />
          )}
        </Window>
      ))}

      <TaskBar windows={windows} activeWindowId={activeWindowId} systemStatus={systemStatus}
        runningProcesses={sandboxProcesses} onActivateWindow={activateWindow}
        onOpenTaskManager={() => openWindow('任务管理器')}
        onOpenKernelLab={() => openWindow('内核算法实验室')}
        onOpenSystemLog={() => openWindow('系统日志')}
        onLaunchApp={launchApp}
        onReset={resetSandbox}
        onToggleControlCenter={() => setControlCenterOpen(!controlCenterOpen)}
        onToggleLauncher={() => setLauncherOpen(!launcherOpen)}
        hasMaximized={windows.some(w => w.maximized)}
        toggleWindow={(title) => {
          const win = windows.find(w => w.title.includes(title))
          if (win) {
            if (win.minimized) activateWindow(win.id)
            else minimizeWindow(win.id)
          } else {
            openWindow(title)
          }
        }} />

      <ControlCenter isOpen={controlCenterOpen} onClose={() => setControlCenterOpen(false)} systemStatus={systemStatus}
        onOpenTaskManager={() => openWindow('任务管理器')} />
      <AppLauncher isOpen={launcherOpen} onClose={() => setLauncherOpen(false)}
        onLaunchApp={launchApp} onOpenTaskManager={() => openWindow('任务管理器')}
        onOpenKernelLab={() => openWindow('内核算法实验室')} onOpenSystemLog={() => openWindow('系统日志')}
        onOpenSyncLab={() => openWindow('同步互斥实验室')}
        onOpenIoDevice={() => openWindow('I/O设备管理')} />
    </div>
  )
}

function AppProcessView({ appName, pid, process, onTerminate }) {
  const [printStatus, setPrintStatus] = useState(null)

  const canPrint = ['Word', 'Excel', '记事本', 'PDF'].some(n => appName.includes(n) || appName.startsWith(n))
  const canWriteDisk = ['下载工具', '系统更新'].some(n => appName.includes(n))
  const [writeDiskStatus, setWriteDiskStatus] = useState(null)

  const doWriteDisk = async () => {
    try {
      const res = await axios.post('/api/io/exclusive/request', { device: 'USB_DISK', pid, processName: appName })
      if (res.data.success) {
        setWriteDiskStatus('WRITING')
      } else {
        setWriteDiskStatus('BLOCKED')
        setTimeout(() => setWriteDiskStatus(null), 2000)
      }
    } catch {}
  }

  const doWriteDiskDone = async () => {
    try {
      await axios.post('/api/io/exclusive/release', { device: 'USB_DISK', pid })
      setWriteDiskStatus('DONE')
      setTimeout(() => setWriteDiskStatus(null), 1500)
    } catch {}
  }

  const doPrint = async () => {
    try {
      const res = await axios.post('/api/io/print', { pid, processName: appName })
      if (res.data.success) {
        setPrintStatus('PRINTING')
      } else {
        setPrintStatus('BLOCKED')
        setTimeout(() => setPrintStatus(null), 2000)
      }
    } catch {}
  }

  const doPrintDone = async () => {
    try {
      await axios.post('/api/io/print-done', { pid })
      setPrintStatus('DONE')
      setTimeout(() => setPrintStatus(null), 1500)
    } catch {}
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: '#ededef' }}>
      <div style={{ fontSize: '64px' }}>{process?.icon || '📱'}</div>
      <div style={{ fontSize: '20px', fontWeight: 600 }}>{appName}</div>
      {process ? (
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', fontSize: '13px' }}>
          <div>PID: <span style={{ color: '#8b5cf6' }}>{process.pid}</span></div>
          <div>状态: <span style={{ color: process.state === 'RUNNING' ? '#22c55e' : '#f59e0b' }}>{process.state === 'RUNNING' ? '运行中' : '已挂起'}</span></div>
          <div>CPU: <span style={{ color: '#06b6d4' }}>{process.cpuUsage?.toFixed(1) || 0}%</span></div>
          <div>内存: <span style={{ color: '#f43f5e' }}>{process.currentMemoryUsage || 0}MB</span></div>
        </div>
      ) : <div style={{ color: '#888' }}>进程已结束</div>}
      <div style={{ display: 'flex', gap: '8px' }}>
        {canPrint && !printStatus && (
          <button onClick={doPrint} style={{
            padding: '8px 20px', borderRadius: '6px', cursor: 'pointer',
            background: 'rgba(0,240,255,0.15)', color: '#00f0ff',
            border: '1px solid rgba(0,240,255,0.3)', fontSize: '13px'
          }}>🖨️ 打印</button>
        )}
        {canPrint && printStatus === 'PRINTING' && (
          <button onClick={doPrintDone} style={{
            padding: '8px 20px', borderRadius: '6px', cursor: 'pointer',
            background: 'rgba(0,255,136,0.15)', color: '#00ff88',
            border: '1px solid rgba(0,255,136,0.3)', fontSize: '13px',
            animation: 'breathe 1.5s ease-in-out infinite'
          }}>✅ 打印完成</button>
        )}
        {canPrint && printStatus === 'BLOCKED' && (
          <button disabled style={{
            padding: '8px 20px', borderRadius: '6px',
            background: 'rgba(255,215,0,0.15)', color: '#ffd700',
            border: '1px solid rgba(255,215,0,0.3)', fontSize: '13px'
          }}>⏳ 等待打印机...</button>
        )}
        {canPrint && printStatus === 'DONE' && (
          <button disabled style={{
            padding: '8px 20px', borderRadius: '6px',
            background: 'rgba(0,255,136,0.1)', color: '#00ff88',
            border: '1px solid rgba(0,255,136,0.2)', fontSize: '13px'
          }}>✓ 打印完成</button>
        )}
        {canWriteDisk && !writeDiskStatus && (
          <button onClick={doWriteDisk} style={{
            padding: '8px 20px', borderRadius: '6px', cursor: 'pointer',
            background: 'rgba(255,215,0,0.15)', color: '#ffd700',
            border: '1px solid rgba(255,215,0,0.3)', fontSize: '13px'
          }}>💾 写入U盘</button>
        )}
        {canWriteDisk && writeDiskStatus === 'WRITING' && (
          <button onClick={doWriteDiskDone} style={{
            padding: '8px 20px', borderRadius: '6px', cursor: 'pointer',
            background: 'rgba(0,255,136,0.15)', color: '#00ff88',
            border: '1px solid rgba(0,255,136,0.3)', fontSize: '13px',
            animation: 'breathe 1.5s ease-in-out infinite'
          }}>✅ 写入完成</button>
        )}
        {canWriteDisk && writeDiskStatus === 'BLOCKED' && (
          <button disabled style={{
            padding: '8px 20px', borderRadius: '6px',
            background: 'rgba(255,215,0,0.15)', color: '#ffd700',
            border: '1px solid rgba(255,215,0,0.3)', fontSize: '13px'
          }}>⏳ 等待U盘...</button>
        )}
        <button onClick={() => onTerminate(pid)} style={{ padding: '8px 20px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', cursor: 'pointer' }}>结束进程</button>
      </div>
    </div>
  )
}

export default App
