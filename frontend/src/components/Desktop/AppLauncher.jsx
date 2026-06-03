import React, { useState } from 'react'

// 所有应用配置
const ALL_APPS = [
  // 系统工具
  { name: '任务管理器', icon: '⚙️', action: 'taskManager', category: '系统工具' },
  { name: '系统日志', icon: '📋', action: 'systemLog', category: '系统工具' },
  { name: '内核算法实验室', icon: '🧪', action: 'kernelLab', category: '系统工具' },
  // 游戏
  { name: 'CS:GO', icon: '🎮', app: 'CS:GO', category: '游戏' },
  { name: '绝地求生', icon: '🎯', app: '绝地求生', category: '游戏' },
  { name: '我的世界', icon: '⛏️', app: '我的世界', category: '游戏' },
  // 浏览器
  { name: 'Chrome', icon: '🌐', app: 'Chrome', category: '浏览器' },
  { name: 'Firefox', icon: '🦊', app: 'Firefox', category: '浏览器' },
  // 开发工具
  { name: 'VSCode', icon: '💻', app: 'VSCode', category: '开发' },
  { name: '终端', icon: '⬛', app: '终端', category: '开发' },
  // 办公
  { name: '记事本', icon: '📝', app: '记事本', category: '办公' },
  { name: 'Word', icon: '📄', app: 'Word', category: '办公' },
  { name: 'Excel', icon: '📊', app: 'Excel', category: '办公' },
  // 系统
  { name: '下载工具', icon: '⬇️', app: '下载工具', category: '系统' },
  { name: '杀毒软件', icon: '🛡️', app: '杀毒软件', category: '系统' },
  { name: '系统更新', icon: '🔄', app: '系统更新', category: '系统' },
  { name: '音乐播放器', icon: '🎵', app: '音乐播放器', category: '娱乐' },
  { name: '视频播放器', icon: '🎬', app: '视频播放器', category: '娱乐' },
]

function AppLauncher({ isOpen, onClose, onLaunchApp, onOpenTaskManager, onOpenKernelLab, onOpenSystemLog }) {
  const [search, setSearch] = useState('')

  if (!isOpen) return null

  const filtered = ALL_APPS.filter(app =>
    app.name.toLowerCase().includes(search.toLowerCase()) ||
    app.category.includes(search)
  )

  const handleLaunch = (app) => {
    if (app.action === 'taskManager') onOpenTaskManager()
    else if (app.action === 'systemLog') onOpenSystemLog()
    else if (app.action === 'kernelLab') onOpenKernelLab()
    else if (app.app) onLaunchApp(app.app)
    onClose()
  }

  return (
    <>
      <div className="launcher-overlay" onClick={onClose} />
      <div className="launcher-panel">
        {/* 搜索栏 */}
        <div className="launcher-search">
          <span className="launcher-search-icon">🔍</span>
          <input
            type="text"
            placeholder="搜索应用..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            className="launcher-search-input"
          />
          {search && (
            <button className="launcher-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        {/* 应用网格 */}
        <div className="launcher-grid">
          {filtered.map(app => (
            <div key={app.name} className="launcher-app" onClick={() => handleLaunch(app)}>
              <div className="launcher-app-icon">{app.icon}</div>
              <div className="launcher-app-name">{app.name}</div>
              <div className="launcher-app-category">{app.category}</div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="launcher-empty">没有找到匹配的应用</div>
        )}
      </div>
    </>
  )
}

export default AppLauncher
