import React, { useState, useEffect } from 'react'

const APP_GROUPS = [
  { name: '开发工具', icon: '🔨', apps: ['VSCode', 'Chrome', 'Firefox', '终端'] },
  { name: '办公文档', icon: '📄', apps: ['Word', 'Excel', '记事本'] },
  { name: '娱乐媒体', icon: '🎬', apps: ['音乐播放器', '视频播放器', 'CS:GO'] },
  { name: '系统工具', icon: '⚙️', apps: ['下载工具', '杀毒软件', '系统更新'] },
]

const RECENT_DOCS = [
  { icon: '📄', name: '进程管理系统开发方案.docx', time: '2分钟前' },
  { icon: '📊', name: 'Xiaomi MiMo API 文档.pdf', time: '1小时前' },
  { icon: '🔗', name: 'SunWufanji/OS-course-test', time: '3小时前' },
  { icon: '⚙️', name: '设置中心', time: '5小时前' },
]

function Desktop({ apps, onLaunchApp, onOpenTaskManager, onOpenKernelLab, onOpenSystemLog, systemStatus }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

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

  const findApp = (name) => apps.find(a => a.name === name)

  const handleQuickAction = (action) => {
    switch (action) {
      case '新建文档': onLaunchApp('记事本'); break
      case '打开项目': onLaunchApp('VSCode'); break
      case '系统设置': onOpenSystemLog(); break
      case '性能监控': onOpenTaskManager(); break
    }
  }

  const systemToolApps = [
    { name: '任务管理器', icon: '⚙️', action: onOpenTaskManager },
    { name: '系统日志', icon: '📋', action: onOpenSystemLog },
    { name: '内核算法实验室', icon: '🧪', action: onOpenKernelLab },
  ]

  return (
    <div className="desktop-workbench" style={{ flexDirection: 'column' }}>
      {/* 顶部系统工具栏 */}
      <div className="top-system-bar">
        {systemToolApps.map(app => (
          <div key={app.name} className="top-system-item" onDoubleClick={app.action} title={app.name}>
            <span>{app.icon}</span>
            <span className="top-system-label">{app.name}</span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div className="top-system-time">{hours}:{minutes}</div>
      </div>

      {/* 主内容区（无侧边栏） */}
      <div className="main-content-area" style={{ padding: '20px 48px' }}>

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
                  <span>{btn.icon}</span><span>{btn.label}</span>
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
          <div className="section-header"><h2 className="section-title">快速访问</h2></div>
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
          </div>
        </div>

        {/* 应用分组 */}
        <div className="section">
          <div className="section-header"><h2 className="section-title">应用分组</h2></div>
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
                    const app = findApp(name)
                    if (!app) return null
                    return (
                      <div key={i} className="app-group-item" onDoubleClick={() => onLaunchApp(name)}>
                        <div className="app-group-icon">{app.icon}</div>
                        <div className="app-group-label">{app.name}</div>
                      </div>
                    )
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
      </div>
    </div>
  )
}

export default Desktop
