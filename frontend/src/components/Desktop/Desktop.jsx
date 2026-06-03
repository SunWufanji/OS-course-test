import React, { useState, useEffect } from 'react'
import DesktopIcon from './DesktopIcon'

// 应用分组配置
const APP_GROUPS = [
  { name: '开发工具', icon: '🔨', apps: ['VSCode', 'Chrome', 'Firefox', '终端'] },
  { name: '办公文档', icon: '📄', apps: ['Word', 'Excel', '记事本', 'VSCode'] },
  { name: '娱乐媒体', icon: '🎬', apps: ['音乐播放器', '视频播放器', 'CS:GO'] },
  { name: '系统工具', icon: '⚙️', apps: ['下载工具', '杀毒软件', '系统更新'] },
]

// 最近使用（模拟数据）
const RECENT_DOCS = [
  { icon: '📄', name: '进程管理系统开发方案.docx', time: '2分钟前' },
  { icon: '📊', name: 'Xiaomi MiMo API 文档.pdf', time: '1小时前' },
  { icon: '🔗', name: 'SunWufanji/OS-course-test', time: '3小时前' },
  { icon: '⚙️', name: '设置中心', time: '5小时前' },
]

// 左侧导航项
const NAV_ITEMS = [
  { key: 'home', label: '首页', icon: '🏠' },
  { key: 'all', label: '全部应用', icon: '📦' },
  { key: 'recent', label: '最近使用', icon: '🕐' },
  { key: 'dev', label: '开发工具', icon: '🔨' },
  { key: 'office', label: '办公文档', icon: '📄' },
  { key: 'media', label: '娱乐媒体', icon: '🎬' },
  { key: 'system', label: '系统工具', icon: '⚙️' },
]

function Desktop({ apps, onLaunchApp, onOpenTaskManager, onOpenKernelLab, onOpenSystemLog, systemStatus }) {
  const [activeNav, setActiveNav] = useState('home')
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const cpuUsage = systemStatus?.totalCpuUsage?.toFixed(0) || 0
  const memUsed = systemStatus?.usedMemory || 0
  const memTotal = systemStatus?.totalMemory || 16384
  const memPercent = ((memUsed / memTotal) * 100).toFixed(0)
  const diskRead = systemStatus?.diskReadSpeed?.toFixed(0) || 0

  const hours = time.getHours().toString().padStart(2, '0')
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const dateStr = `${time.getFullYear()}年${time.getMonth() + 1}月${time.getDate()}日 ${weekdays[time.getDay()]}`

  const getGreeting = () => {
    const h = time.getHours()
    if (h < 6) return '夜深了'
    if (h < 12) return '早上好'
    if (h < 14) return '中午好'
    if (h < 18) return '下午好'
    return '晚上好'
  }

  // 按名称查找应用
  const findApp = (name) => apps.find(a => a.name === name)

  // 处理快捷操作按钮
  const handleQuickAction = (action) => {
    switch (action) {
      case '新建文档': onLaunchApp('记事本'); break
      case '打开项目': onLaunchApp('VSCode'); break
      case '系统设置': onOpenSystemLog(); break
      case '性能监控': onOpenTaskManager(); break
    }
  }

  // 获取系统工具应用
  const systemToolApps = [
    { name: '任务管理器', icon: '⚙️', action: onOpenTaskManager },
    { name: '系统日志', icon: '📋', action: onOpenSystemLog },
    { name: '内核算法实验室', icon: '🧪', action: onOpenKernelLab },
  ]

  // 渲染应用图标（小尺寸，用于分组内）
  const renderSmallIcon = (app, key) => {
    if (!app) return null
    return (
      <div key={key} className="app-group-item" onDoubleClick={() => onLaunchApp(app.name)} title={app.name}>
        <div className="app-group-icon">{app.icon}</div>
        <div className="app-group-label">{app.name}</div>
      </div>
    )
  }

  return (
    <div className="desktop-workbench">
      {/* ═══ 左侧边栏 ═══ */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <span style={{ fontSize: '20px' }}>⚡</span>
          <span className="sidebar-logo-text">ProcessOS</span>
          <span className="sidebar-badge">Simulator</span>
        </div>

        {/* 导航菜单 */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <div key={item.key}
              className={`sidebar-nav-item ${activeNav === item.key ? 'active' : ''}`}
              onClick={() => setActiveNav(item.key)}>
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* 系统工具快捷入口 */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">系统工具</div>
          {systemToolApps.map(app => (
            <div key={app.name} className="sidebar-nav-item" onDoubleClick={app.action}>
              <span className="sidebar-nav-icon">{app.icon}</span>
              <span>{app.name}</span>
            </div>
          ))}
        </div>

        {/* 系统状态常驻监控 */}
        <div className="sidebar-status">
          <div className="sidebar-status-title">系统状态</div>
          {[
            { label: 'CPU', value: cpuUsage, color: '#00f0ff', max: 100 },
            { label: '内存', value: memPercent, color: '#ff2d7b', max: 100 },
            { label: '磁盘', value: Math.min(diskRead * 3, 100), color: '#00ff88', max: 100 },
          ].map(item => (
            <div key={item.label} className="status-row">
              <span className="status-label">{item.label}</span>
              <div className="status-bar-track">
                <div className="status-bar-fill" style={{ width: `${item.value}%`, background: item.color }} />
              </div>
              <span className="status-value" style={{ color: item.color }}>{item.value}%</span>
            </div>
          ))}
        </div>

        {/* 版本信息 */}
        <div className="sidebar-footer">
          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px' }}>ProcessOS Simulator v1.0.0</span>
        </div>
      </aside>

      {/* ═══ 右侧主内容区 ═══ */}
      <main className="main-content-area">
        {/* 顶部栏 */}
        <header className="top-bar">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="搜索应用、文档、工具..." className="search-input" />
            <kbd className="search-kbd">Ctrl K</kbd>
          </div>
          <div className="top-bar-actions">
            <div className="top-bar-icon" title="网络">📶</div>
            <div className="top-bar-icon" title="音量">🔊</div>
            <div className="top-bar-icon" title="设置" onClick={onOpenSystemLog}>⚙️</div>
            <div className="top-bar-avatar">🧑‍💻</div>
          </div>
        </header>

        {/* 欢迎区域 */}
        <div className="welcome-section">
          <div className="welcome-left">
            <h1 className="welcome-title">{getGreeting()}，开发者 👋</h1>
            <p className="welcome-subtitle">专注创造价值，让每一次构建都更有意义。</p>
            <div className="quick-actions">
              {[
                { label: '新建文档', icon: '📝', action: '新建文档' },
                { label: '打开项目', icon: '📂', action: '打开项目' },
                { label: '系统设置', icon: '⚙️', action: '系统设置' },
                { label: '性能监控', icon: '📊', action: '性能监控' },
              ].map(btn => (
                <button key={btn.action} className="quick-action-btn" onClick={() => handleQuickAction(btn.action)}>
                  <span>{btn.icon}</span>
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="welcome-clock">
            <div className="clock-time">{hours}:{minutes}</div>
            <div className="clock-date">{dateStr}</div>
          </div>
        </div>

        {/* 快速访问 */}
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">快速访问</h2>
          </div>
          <div className="quick-access-grid">
            {['VSCode', 'Chrome', 'Firefox', '终端', 'Word', 'Excel', '下载工具'].map(name => {
              const app = findApp(name)
              return app ? (
                <div key={name} className="quick-access-item" onDoubleClick={() => onLaunchApp(name)}>
                  <div className="quick-access-icon">{app.icon}</div>
                  <div className="quick-access-label">{app.name}</div>
                </div>
              ) : null
            })}
            <div className="quick-access-item add-app">
              <div className="quick-access-icon">➕</div>
              <div className="quick-access-label">添加</div>
            </div>
          </div>
        </div>

        {/* 应用分组 */}
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">应用分组</h2>
          </div>
          <div className="app-groups-grid">
            {APP_GROUPS.map(group => (
              <div key={group.name} className="app-group-card">
                <div className="app-group-header">
                  <div className="app-group-title-row">
                    <span className="app-group-icon-lg">{group.icon}</span>
                    <div>
                      <div className="app-group-name">{group.name}</div>
                      <div className="app-group-count">{group.apps.length} 个应用</div>
                    </div>
                  </div>
                </div>
                <div className="app-group-items">
                  {group.apps.map((name, i) => {
                    // 系统工具特殊处理
                    if (name === '任务管理器') return <div key={i} className="app-group-item" onDoubleClick={onOpenTaskManager}>
                      <div className="app-group-icon">⚙️</div><div className="app-group-label">任务管理器</div>
                    </div>
                    if (name === '系统日志') return <div key={i} className="app-group-item" onDoubleClick={onOpenSystemLog}>
                      <div className="app-group-icon">📋</div><div className="app-group-label">系统日志</div>
                    </div>
                    const app = findApp(name)
                    return renderSmallIcon(app, i)
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 最近使用 */}
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">最近使用</h2>
            <button className="view-all-btn">查看全部 →</button>
          </div>
          <div className="recent-grid">
            {RECENT_DOCS.map((doc, i) => (
              <div key={i} className="recent-item">
                <div className="recent-icon">{doc.icon}</div>
                <div className="recent-info">
                  <div className="recent-name">{doc.name}</div>
                  <div className="recent-time">{doc.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Desktop
