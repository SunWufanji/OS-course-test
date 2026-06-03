import React, { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import Desktop from './components/Desktop/Desktop'
import TaskBar from './components/Desktop/TaskBar'
import Window from './components/Desktop/Window'
import TaskManager from './components/TaskManager/TaskManager'
import KernelLab from './components/KernelLab/KernelLab'

const API_BASE = '/api'

function App() {
  // 系统状态
  const [systemStatus, setSystemStatus] = useState(null)
  const [sandboxProcesses, setSandboxProcesses] = useState([])
  const [availableApps, setAvailableApps] = useState([])

  // 窗口管理
  const [windows, setWindows] = useState([])
  const [activeWindowId, setActiveWindowId] = useState(null)
  const nextWindowId = useRef(1)

  // 获取系统状态
  const fetchSystemStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/system/status`)
      setSystemStatus(res.data)
    } catch (err) {
      // 静默失败
    }
  }, [])

  // 获取沙盒进程列表
  const fetchSandboxProcesses = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/process/sandbox`)
      setSandboxProcesses(res.data)
    } catch (err) {
      // 静默失败
    }
  }, [])

  // 获取可用应用列表
  const fetchAvailableApps = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/system/apps`)
      setAvailableApps(res.data)
    } catch (err) {
      // 静默失败
    }
  }, [])

  // 启动应用
  const launchApp = async (appName) => {
    try {
      const res = await axios.post(`${API_BASE}/process/launch`, { appName })
      if (res.data.success) {
        openWindow(appName, res.data.process)
        fetchSandboxProcesses()
      } else {
        alert(res.data.error || '启动失败')
      }
    } catch (err) {
      console.error('启动应用失败:', err)
    }
  }

  // 结束进程
  const terminateProcess = async (pid) => {
    try {
      await axios.post(`${API_BASE}/process/${pid}/terminate`)
      closeWindowByPid(pid)
      fetchSandboxProcesses()
    } catch (err) {
      console.error('结束进程失败:', err)
    }
  }

  // 挂起进程
  const suspendProcess = async (pid) => {
    try {
      await axios.post(`${API_BASE}/process/${pid}/suspend`)
      fetchSandboxProcesses()
    } catch (err) {
      console.error('挂起进程失败:', err)
    }
  }

  // 恢复进程
  const resumeProcess = async (pid) => {
    try {
      await axios.post(`${API_BASE}/process/${pid}/resume`)
      fetchSandboxProcesses()
    } catch (err) {
      console.error('恢复进程失败:', err)
    }
  }

  // 重置沙盒
  const resetSandbox = async () => {
    try {
      await axios.post(`${API_BASE}/system/reset`)
      setWindows([])
      fetchSandboxProcesses()
      fetchSystemStatus()
    } catch (err) {
      console.error('重置沙盒失败:', err)
    }
  }

  // 打开窗口
  const openWindow = (appName, process) => {
    const windowConfig = getWindowConfig(appName)
    const id = nextWindowId.current++
    setWindows(prev => [...prev, {
      id,
      title: windowConfig.title,
      icon: windowConfig.icon,
      component: windowConfig.component,
      pid: process?.pid,
      x: 80 + (prev.length % 6) * 30,
      y: 30 + (prev.length % 6) * 30,
      width: windowConfig.width || 800,
      height: windowConfig.height || 600,
      minimized: false,
      maximized: false
    }])
    setActiveWindowId(id)
  }

  // 关闭窗口
  const closeWindow = (id) => {
    setWindows(prev => prev.filter(w => w.id !== id))
    if (activeWindowId === id) {
      setActiveWindowId(null)
    }
  }

  // 关闭对应进程的窗口
  const closeWindowByPid = (pid) => {
    setWindows(prev => prev.filter(w => w.pid !== pid))
  }

  // 最小化窗口
  const minimizeWindow = (id) => {
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, minimized: true } : w
    ))
  }

  // 最大化窗口
  const maximizeWindow = (id) => {
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, maximized: !w.maximized } : w
    ))
  }

  // 激活窗口
  const activateWindow = (id) => {
    setActiveWindowId(id)
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, minimized: false } : w
    ))
  }

  // 获取窗口配置
  const getWindowConfig = (appName) => {
    const configs = {
      '任务管理器': { title: '任务管理器', icon: '⚙️', component: 'TaskManager', width: 900, height: 580 },
      '内核算法实验室': { title: '内核算法实验室', icon: '🧪', component: 'KernelLab', width: 920, height: 640 },
    }
    if (configs[appName]) return configs[appName]
    // 动态应用
    const app = availableApps.find(a => a.name === appName)
    return {
      title: appName,
      icon: app?.icon || '📱',
      component: 'AppProcess',
      width: 600,
      height: 420
    }
  }

  // 定时刷新
  useEffect(() => {
    fetchAvailableApps()
    fetchSystemStatus()
    fetchSandboxProcesses()

    const timer = setInterval(() => {
      fetchSystemStatus()
      fetchSandboxProcesses()
    }, 1000)

    return () => clearInterval(timer)
  }, [fetchAvailableApps, fetchSystemStatus, fetchSandboxProcesses])

  return (
    <div className="app-container">
      {/* 桌面 */}
      <Desktop
        apps={availableApps}
        onLaunchApp={launchApp}
        onOpenTaskManager={() => openWindow('任务管理器')}
        onOpenKernelLab={() => openWindow('内核算法实验室')}
      />

      {/* 窗口 */}
      {windows.map(win => (
        !win.minimized && (
          <Window
            key={win.id}
            id={win.id}
            title={win.title}
            icon={win.icon}
            x={win.x}
            y={win.y}
            width={win.width}
            height={win.height}
            maximized={win.maximized}
            isActive={activeWindowId === win.id}
            onClose={() => closeWindow(win.id)}
            onMinimize={() => minimizeWindow(win.id)}
            onMaximize={() => maximizeWindow(win.id)}
            onActivate={() => activateWindow(win.id)}
          >
            {win.component === 'TaskManager' && (
              <TaskManager
                processes={sandboxProcesses}
                systemStatus={systemStatus}
                onTerminate={terminateProcess}
                onSuspend={suspendProcess}
                onResume={resumeProcess}
              />
            )}
            {win.component === 'KernelLab' && (
              <KernelLab />
            )}
            {win.component === 'AppProcess' && (
              <AppProcessView
                appName={win.title}
                pid={win.pid}
                process={sandboxProcesses.find(p => p.pid === win.pid)}
                onTerminate={terminateProcess}
              />
            )}
          </Window>
        )
      ))}

      {/* 任务栏 */}
      <TaskBar
        windows={windows}
        activeWindowId={activeWindowId}
        systemStatus={systemStatus}
        runningProcesses={sandboxProcesses}
        onActivateWindow={activateWindow}
        onOpenTaskManager={() => openWindow('任务管理器')}
        onReset={resetSandbox}
      />
    </div>
  )
}

// 普通应用进程视图
function AppProcessView({ appName, pid, process, onTerminate }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: '16px',
      color: '#ededef'
    }}>
      <div style={{ fontSize: '64px' }}>
        {process?.icon || '📱'}
      </div>
      <div style={{ fontSize: '20px', fontWeight: 600 }}>
        {appName}
      </div>
      {process ? (
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '8px',
          padding: '16px 24px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px 24px',
          fontSize: '13px',
          minWidth: '280px'
        }}>
          <div>PID: <span style={{ color: '#8b5cf6' }}>{process.pid}</span></div>
          <div>状态: <span style={{ color: process.state === 'RUNNING' ? '#22c55e' : '#f59e0b' }}>{process.state === 'RUNNING' ? '运行中' : '已挂起'}</span></div>
          <div>CPU: <span style={{ color: '#06b6d4' }}>{process.cpuUsage?.toFixed(1) || 0}%</span></div>
          <div>内存: <span style={{ color: '#f43f5e' }}>{process.currentMemoryUsage || 0}MB</span></div>
        </div>
      ) : (
        <div style={{ color: '#888', fontSize: '13px' }}>进程已结束</div>
      )}
      <button
        onClick={() => onTerminate(pid)}
        style={{
          marginTop: '8px',
          padding: '8px 20px',
          background: 'rgba(239,68,68,0.15)',
          color: '#ef4444',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px'
        }}
      >
        结束进程
      </button>
    </div>
  )
}

export default App
