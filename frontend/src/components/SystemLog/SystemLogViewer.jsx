import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'

const API_BASE = '/api/events'

// 日志级别样式
const LEVEL_STYLE = {
  INFO:    { color: '#00f0ff', bg: 'rgba(0,240,255,0.1)', icon: 'ℹ' },
  SUCCESS: { color: '#00ff88', bg: 'rgba(0,255,136,0.1)', icon: '✓' },
  WARNING: { color: '#ffd700', bg: 'rgba(255,215,0,0.1)', icon: '⚠' },
  ERROR:   { color: '#ff3333', bg: 'rgba(255,51,51,0.1)', icon: '✕' },
}

// 来源显示名
const SOURCE_LABEL = {
  PROCESS_MGR: '进程管理器',
  MEMORY_MGR: '内存管理器',
  LAB: '算法实验室',
  SYNC: '同步机制',
  SYSTEM: '系统',
}

function SystemLogViewer() {
  const [events, setEvents] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [filterLevel, setFilterLevel] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [keyword, setKeyword] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const refreshRef = useRef(null)

  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page, size: 15 })
      if (filterLevel) params.append('level', filterLevel)
      if (filterSource) params.append('source', filterSource)
      if (keyword) params.append('keyword', keyword)
      const res = await axios.get(`${API_BASE}?${params}`)
      setEvents(res.data.content || [])
      setTotalPages(res.data.totalPages || 0)
      setTotalElements(res.data.totalElements || 0)
    } catch (err) { console.error(err) }
  }, [page, filterLevel, filterSource, keyword])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // 实时刷新
  useEffect(() => {
    if (autoRefresh) {
      refreshRef.current = setInterval(fetchEvents, 3000)
    } else {
      if (refreshRef.current) clearInterval(refreshRef.current)
    }
    return () => { if (refreshRef.current) clearInterval(refreshRef.current) }
  }, [autoRefresh, fetchEvents])

  // 导出 CSV
  const exportCSV = async () => {
    try {
      const params = new URLSearchParams({ page: 0, size: 9999 })
      if (filterLevel) params.append('level', filterLevel)
      if (filterSource) params.append('source', filterSource)
      if (keyword) params.append('keyword', keyword)
      const res = await axios.get(`${API_BASE}?${params}`)
      const rows = res.data.content || []
      const header = 'ID,时间,级别,来源,消息,PID,进程名\n'
      const csv = header + rows.map(r =>
        `${r.id},"${r.createdAt}","${r.level}","${r.source}","${(r.message || '').replace(/"/g, '""')}",${r.pid || ''},"${r.processName || ''}"`
      ).join('\n')
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `system-events-${new Date().toISOString().slice(0,10)}.csv`
      a.click(); URL.revokeObjectURL(url)
    } catch (err) { console.error(err) }
  }

  // 清空日志
  const clearLogs = async () => {
    if (!confirm('确定清空所有系统日志？')) return
    await axios.delete(API_BASE)
    fetchEvents()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#060e17', color: '#e0f0ff', fontSize: '12px' }}>
      {/* 工具栏 */}
      <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(0,240,255,0.12)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* 级别筛选 */}
        <span style={{ color: '#4a6a80', fontSize: '10px', letterSpacing: '1px' }}>LEVEL</span>
        {['', 'INFO', 'SUCCESS', 'WARNING', 'ERROR'].map(l => (
          <button key={l} onClick={() => { setFilterLevel(l); setPage(0) }}
            style={{ padding: '3px 8px', background: filterLevel === l ? (LEVEL_STYLE[l]?.bg || 'rgba(0,240,255,0.1)') : 'rgba(255,255,255,0.03)',
              border: `1px solid ${filterLevel === l ? (LEVEL_STYLE[l]?.color || '#00f0ff') : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '4px', color: filterLevel === l ? (LEVEL_STYLE[l]?.color || '#00f0ff') : '#4a6a80',
              cursor: 'pointer', fontSize: '11px', transition: 'all 0.2s' }}>
            {l || '全部'}
          </button>
        ))}

        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

        {/* 来源筛选 */}
        <span style={{ color: '#4a6a80', fontSize: '10px', letterSpacing: '1px' }}>SOURCE</span>
        <select value={filterSource} onChange={e => { setFilterSource(e.target.value); setPage(0) }}
          style={{ padding: '3px 6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '4px', color: '#e0f0ff', fontSize: '11px', outline: 'none' }}>
          <option value="">全部</option>
          {Object.entries(SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

        {/* 搜索 */}
        <input type="text" placeholder="🔍 搜索日志..." value={keyword} onChange={e => { setKeyword(e.target.value); setPage(0) }}
          style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '4px', color: '#e0f0ff', fontSize: '11px', outline: 'none', width: '140px' }} />

        <div style={{ flex: 1 }} />

        {/* 实时刷新 */}
        <button onClick={() => setAutoRefresh(!autoRefresh)}
          style={{ padding: '3px 10px', background: autoRefresh ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${autoRefresh ? '#00ff88' : 'rgba(255,255,255,0.08)'}`, borderRadius: '4px',
            color: autoRefresh ? '#00ff88' : '#4a6a80', cursor: 'pointer', fontSize: '11px' }}>
          {autoRefresh ? '● 实时中' : '○ 实时刷新'}
        </button>

        <button onClick={exportCSV} style={{ padding: '3px 10px', background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.2)',
          borderRadius: '4px', color: '#00f0ff', cursor: 'pointer', fontSize: '11px' }}>导出 CSV</button>

        <button onClick={clearLogs} style={{ padding: '3px 10px', background: 'rgba(255,51,51,0.08)', border: '1px solid rgba(255,51,51,0.2)',
          borderRadius: '4px', color: '#ff3333', cursor: 'pointer', fontSize: '11px' }}>清空日志</button>
      </div>

      {/* 日志表格 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.3)', position: 'sticky', top: 0 }}>
              {['时间', '级别', '来源', '消息', 'PID'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#4a6a80', fontSize: '10px', letterSpacing: '1px',
                  borderBottom: '1px solid rgba(0,240,255,0.12)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#4a6a80' }}>暂无系统日志</td></tr>
            ) : events.map(ev => {
              const ls = LEVEL_STYLE[ev.level] || LEVEL_STYLE.INFO
              return (
                <tr key={ev.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,240,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '7px 10px', color: '#4a6a80', whiteSpace: 'nowrap', fontSize: '11px' }}>
                    {ev.createdAt ? new Date(ev.createdAt).toLocaleString('zh-CN') : '-'}
                  </td>
                  <td style={{ padding: '7px 10px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '3px', fontSize: '10px', fontWeight: 600,
                      background: ls.bg, color: ls.color, textShadow: `0 0 4px ${ls.color}40` }}>
                      {ls.icon} {ev.level}
                    </span>
                  </td>
                  <td style={{ padding: '7px 10px', color: '#4a6a80', fontSize: '11px' }}>
                    {SOURCE_LABEL[ev.source] || ev.source}
                  </td>
                  <td style={{ padding: '7px 10px', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev.message}
                  </td>
                  <td style={{ padding: '7px 10px', color: '#4a6a80', textAlign: 'center' }}>
                    {ev.pid || '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 分页 + 统计 */}
      <div style={{ padding: '6px 12px', borderTop: '1px solid rgba(0,240,255,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)' }}>
        <span style={{ color: '#4a6a80', fontSize: '11px' }}>共 {totalElements} 条日志</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button disabled={page <= 0} onClick={() => setPage(p => p - 1)}
            style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '3px', color: page <= 0 ? '#333' : '#4a6a80', cursor: page <= 0 ? 'default' : 'pointer', fontSize: '11px' }}>◀</button>
          <span style={{ color: '#4a6a80', fontSize: '11px' }}>{page + 1} / {totalPages || 1}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
            style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '3px', color: page >= totalPages - 1 ? '#333' : '#4a6a80', cursor: page >= totalPages - 1 ? 'default' : 'pointer', fontSize: '11px' }}>▶</button>
        </div>
      </div>
    </div>
  )
}

export default SystemLogViewer
