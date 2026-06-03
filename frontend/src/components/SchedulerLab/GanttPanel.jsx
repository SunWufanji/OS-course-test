import React, { useState } from 'react'
import MFQPanel from '../MFQPanel'

function GanttPanel({ ganttData, currentTime, stats, currentAlgo, mfqQueues, processes, runningProcess }) {
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)

  return (
    <div className={`gantt-panel-hitbox ${hovered || pinned ? 'reveal' : ''} ${pinned ? 'pinned' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { if (!pinned) setHovered(false) }}>
      <div className="gantt-panel">
        <div className="gantt-header">
          <div className="gantt-title">CPU 调度甘特图</div>
          <button onClick={() => setPinned(!pinned)} style={{
            background: pinned ? 'var(--accent-soft)' : 'transparent',
            border: `1px solid ${pinned ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: '4px', padding: '2px 8px', cursor: 'pointer',
            fontSize: '11px', color: pinned ? 'var(--accent)' : 'var(--text-3)',
            transition: 'all 0.2s'
          }}>{pinned ? '📌 已固定' : '📌 固定'}</button>
          <div className="gantt-legend">
            {[...new Set(ganttData.map(d => d.pid))].map(pid => {
              const d = ganttData.find(x => x.pid === pid)
              return d ? <div key={pid} className="gantt-legend-item"><div className="gantt-legend-dot" style={{ background: d.color }}></div>{d.name}</div> : null
            })}
          </div>
        </div>
        <div className="gantt-chart">
          <div className="gantt-timeline">
            {ganttData.length === 0 || currentTime === 0 ? (
              <div className="gantt-empty">点击"开始模拟"查看</div>
            ) : (
              (() => {
                const blocks = []
                let lastEnd = 0
                const sorted = [...ganttData].sort((a, b) => a.start - b.start)
                sorted.forEach(d => {
                  if (d.start > lastEnd) {
                    blocks.push({ type: 'idle', start: lastEnd, end: d.start, width: ((d.start - lastEnd) / currentTime) * 100 })
                  }
                  blocks.push({ type: 'process', ...d, width: ((d.end - d.start) / currentTime) * 100 })
                  lastEnd = d.end
                })
                return blocks.map((b, i) => (
                  b.type === 'idle' ? (
                    <div key={i} style={{ width: `${b.width}%`, background: 'transparent', borderRight: '1px dashed rgba(255,255,255,0.1)' }}></div>
                  ) : (
                    <div key={i} className="gantt-block" style={{ width: `${b.width}%`, background: b.color }}>{b.name}</div>
                  )
                ))
              })()
            )}
          </div>
          <div className="gantt-axis" style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            {currentTime > 0 && (() => {
              const step = currentTime <= 20 ? 1 : Math.ceil(currentTime / 20)
              const ticks = []
              for (let i = 0; i <= currentTime; i += step) ticks.push(i)
              if (ticks[ticks.length - 1] !== currentTime) ticks.push(currentTime)
              return ticks.map((t, idx) => (
                <span key={idx} className="gantt-tick" style={{ position: 'absolute', left: `${(t / currentTime) * 100}%`, transform: 'translateX(-50%)' }}>{t}</span>
              ))
            })()}
          </div>
        </div>
        {/* 统计信息内联 */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px', justifyContent: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>平均周转: <b style={{ color: 'var(--text-0)' }}>{stats.avgTurnaround || '-'}</b></span>
          <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>平均等待: <b style={{ color: 'var(--text-0)' }}>{stats.avgWaiting || '-'}</b></span>
          <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>已完成: <b style={{ color: 'var(--green)' }}>{stats.completed || 0}</b></span>
          <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>CPU: <b style={{ color: 'var(--cyan)' }}>{stats.cpuUsage || 0}%</b></span>
        </div>
        {/* MFQ 队列状态 */}
        {currentAlgo === 'MFQ' && (
          <div style={{ marginTop: '8px' }}>
            <MFQPanel mfqQueues={mfqQueues} processes={processes} runningProcess={runningProcess} />
          </div>
        )}
      </div>
    </div>
  )
}

export default GanttPanel
