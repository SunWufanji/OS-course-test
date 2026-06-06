import React, { useState, useEffect, useRef, useCallback } from 'react'

const PROMPT = 'user@processos:~$ '

const STATE_CN = { RUNNING: '运行', READY: '就绪', BLOCKED: '阻塞', SUSPENDED: '挂起', TERMINATED: '结束', CREATED: '创建' }
const STATE_COLOR = { RUNNING: '#00ff88', READY: '#00f0ff', BLOCKED: '#ff2d7b', SUSPENDED: '#f59e0b', TERMINATED: '#555', CREATED: '#8b5cf6' }

const BANNER = [
  '  ██████╗ ██████╗  ██████╗  ██████╗███████╗███████╗███████╗ ██████╗ ███████╗',
  '  ██╔══██╗██╔══██╗██╔═══██╗██╔════╝██╔════╝██╔════╝██╔════╝██╔═══██╗██╔════╝',
  '  ██████╔╝██████╔╝██║   ██║██║     █████╗  ███████╗███████╗██║   ██║███████╗',
  '  ██╔═══╝ ██╔══██╗██║   ██║██║     ██╔══╝  ╚════██║╚════██║██║   ██║╚════██║',
  '  ██║     ██║  ██║╚██████╔╝╚██████╗███████╗███████║███████║╚██████╔╝███████║',
  '  ╚═╝     ╚═╝  ╚═╝ ╚═════╝  ╚═════╝╚══════╝╚══════╝╚══════╝ ╚═════╝ ╚══════╝',
  '',
  '  ProcessOS Terminal v1.0  —  输入 help 查看可用命令',
  '─'.repeat(74),
]

/**
 * 左对齐填充
 */
function padEnd(str, len) {
  const s = String(str)
  return s.length >= len ? s : s + ' '.repeat(len - s.length)
}

/**
 * 终端窗口组件
 */
function TerminalWindow({ sandboxProcesses = [], onLaunchApp, onTerminate, onSuspend, onResume }) {
  const [lines, setLines] = useState(() =>
    BANNER.map(t => ({ type: 'banner', text: t }))
  )
  const [input, setInput] = useState('')
  const [cmdHistory, setCmdHistory] = useState([])
  const [historyIdx, setHistoryIdx] = useState(-1)

  const outputRef = useRef(null)
  const inputRef = useRef(null)

  // 滚动到底部
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [lines])

  // 聚焦输入框
  useEffect(() => { inputRef.current?.focus() }, [])

  const addLines = useCallback((newLines) => {
    setLines(prev => [...prev, ...newLines])
  }, [])

  const addLine = useCallback((type, text) => {
    setLines(prev => [...prev, { type, text }])
  }, [])

  // =========================================================================
  //  命令处理器
  // =========================================================================
  const runCommand = useCallback(async (raw) => {
    const trimmed = raw.trim()
    if (!trimmed) return

    // 回显命令
    addLine('cmd', PROMPT + trimmed)

    // 更新历史
    setCmdHistory(prev => [trimmed, ...prev.slice(0, 49)])
    setHistoryIdx(-1)

    const parts = trimmed.split(/\s+/)
    const cmd = parts[0].toLowerCase()
    const args = parts.slice(1)

    try {
      switch (cmd) {

        case 'help': {
          addLines([
            { type: 'info', text: '可用命令：' },
            { type: 'info', text: '  ps                    — 列出所有进程' },
            { type: 'info', text: '  ls apps               — 列出可启动的应用' },
            { type: 'info', text: '  launch <应用名>        — 启动应用（如: launch 记事本）' },
            { type: 'info', text: '  kill <pid>            — 结束进程' },
            { type: 'info', text: '  suspend <pid>         — 挂起进程' },
            { type: 'info', text: '  resume <pid>          — 恢复挂起的进程' },
            { type: 'info', text: '  status                — 调度器状态（tick / 队列 / 暂停）' },
            { type: 'info', text: '  pause                 — 切换调度器暂停/运行' },
            { type: 'info', text: '  step                  — 单步执行一个 tick（需先暂停）' },
            { type: 'info', text: '  autopause             — 切换单步模式' },
            { type: 'info', text: '  clear                 — 清空终端' },
            { type: 'info', text: '  help                  — 显示本帮助' },
          ])
          break
        }

        case 'clear': {
          setLines([])
          break
        }

        case 'ps': {
          const res = await fetch('/api/process/sandbox')
          const procs = await res.json()
          if (!procs.length) {
            addLine('info', '（无活跃进程）')
          } else {
            addLine('info', `${padEnd('PID', 6)}${padEnd('名称', 18)}${padEnd('状态', 8)}${padEnd('内存', 8)}PC`)
            addLine('info', '─'.repeat(56))
            procs
              .filter(p => p.state !== 'TERMINATED')
              .forEach(p => {
                addLines([{
                  type: 'ps',
                  pid: p.pid,
                  name: p.name,
                  state: p.state,
                  mem: p.currentMemoryUsage || 0,
                  pc: p.programCounter ?? 0,
                }])
              })
          }
          break
        }

        case 'ls': {
          if (args[0] === 'apps') {
            const res = await fetch('/api/system/apps')
            const apps = await res.json()
            addLine('info', '可启动的应用：')
            const names = apps.map(a => a.name)
            // 每行4个
            for (let i = 0; i < names.length; i += 4) {
              addLine('info', '  ' + names.slice(i, i + 4).map(n => padEnd(n, 12)).join('  '))
            }
          } else {
            addLine('err', `未知参数: ${args.join(' ')}  提示: ls apps`)
          }
          break
        }

        case 'launch': {
          const appName = args.join(' ')
          if (!appName) { addLine('err', '用法: launch <应用名>'); break }
          const res = await fetch('/api/process/launch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appName }),
          })
          const data = await res.json()
          if (data.success) {
            addLine('ok', `✓ 已启动 ${appName}  PID: ${data.pid}`)
            // 触发桌面窗口
            if (onLaunchApp) onLaunchApp(appName)
          } else if (data.alreadyRunning) {
            addLine('warn', `⚠ ${appName} 已在运行 (PID: ${data.existingPid})`)
          } else {
            addLine('err', `✗ 启动失败: ${data.error || '未知错误'}`)
          }
          break
        }

        case 'kill': {
          const pid = parseInt(args[0])
          if (isNaN(pid)) { addLine('err', '用法: kill <pid>'); break }
          const res = await fetch(`/api/process/${pid}/terminate`, { method: 'POST' })
          const data = await res.json()
          if (data.success) {
            addLine('ok', `✓ 进程 ${pid} 已结束`)
            if (onTerminate) onTerminate(pid)
          } else {
            addLine('err', `✗ 找不到 PID ${pid}`)
          }
          break
        }

        case 'suspend': {
          const pid = parseInt(args[0])
          if (isNaN(pid)) { addLine('err', '用法: suspend <pid>'); break }
          const res = await fetch(`/api/process/${pid}/suspend`, { method: 'POST' })
          const data = await res.json()
          if (data.success) {
            addLine('ok', `✓ 进程 ${pid} 已挂起`)
            if (onSuspend) onSuspend(pid)
          } else {
            addLine('err', `✗ 找不到 PID ${pid} 或无法挂起`)
          }
          break
        }

        case 'resume': {
          const pid = parseInt(args[0])
          if (isNaN(pid)) { addLine('err', '用法: resume <pid>'); break }
          const res = await fetch(`/api/process/${pid}/resume`, { method: 'POST' })
          const data = await res.json()
          if (data.success) {
            addLine('ok', `✓ 进程 ${pid} 已恢复`)
            if (onResume) onResume(pid)
          } else {
            addLine('err', `✗ 找不到 PID ${pid} 或无法恢复`)
          }
          break
        }

        case 'status': {
          const res = await fetch('/api/system/scheduler')
          const d = await res.json()
          const q0 = (d.q0 || []).length
          const q1 = (d.q1 || []).length
          const q2 = (d.q2 || []).length
          const running = d.runningProcess
          addLines([
            { type: 'info', text: `时钟 Tick : ${d.clockTick ?? 0}` },
            { type: 'info', text: `调度器    : ${d.paused ? '⏸ 已暂停' : '▶ 运行中'}` },
            { type: 'info', text: `CPU       : ${running ? `PID:${running.pid} ${running.name}` : '空闲'}` },
            { type: 'info', text: `队列      : Q0(高)=${q0}  Q1(中)=${q1}  Q2(低)=${q2}` },
          ])
          break
        }

        case 'pause': {
          const res = await fetch('/api/system/pause', { method: 'POST' })
          const data = await res.json()
          addLine('ok', data.paused ? '⏸ 调度器已暂停' : '▶ 调度器已恢复运行')
          break
        }

        case 'step': {
          const res = await fetch('/api/system/step', { method: 'POST' })
          const data = await res.json()
          addLine('ok', `⏭ 单步执行完成  Tick: ${data.clockTick}`)
          break
        }

        case 'autopause': {
          const res = await fetch('/api/system/auto-pause', { method: 'POST' })
          const data = await res.json()
          addLine('ok', data.autoPause ? '📍 单步模式已开启（每步暂停）' : '📍 单步模式已关闭')
          break
        }

        default:
          addLine('err', `命令未找到: ${cmd}  输入 help 查看可用命令`)
      }
    } catch (e) {
      addLine('err', `请求失败: ${e.message}`)
    }
  }, [addLine, addLines, onLaunchApp, onTerminate, onSuspend, onResume])

  // =========================================================================
  //  键盘事件
  // =========================================================================
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      runCommand(input)
      setInput('')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHistoryIdx(prev => {
        const next = Math.min(prev + 1, cmdHistory.length - 1)
        if (cmdHistory[next] !== undefined) setInput(cmdHistory[next])
        return next
      })
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHistoryIdx(prev => {
        const next = prev - 1
        if (next < 0) { setInput(''); return -1 }
        if (cmdHistory[next] !== undefined) setInput(cmdHistory[next])
        return next
      })
    }
  }

  // =========================================================================
  //  渲染
  // =========================================================================
  const lineColor = (type) => {
    switch (type) {
      case 'banner': return '#00f0ff'
      case 'cmd':    return '#e2e8f0'
      case 'ok':     return '#00ff88'
      case 'err':    return '#ff2d7b'
      case 'warn':   return '#f59e0b'
      case 'info':   return '#94a3b8'
      default:       return '#94a3b8'
    }
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0f1a', fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace' }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* 输出区 */}
      <div
        ref={outputRef}
        style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', lineHeight: 1.55, fontSize: '12.5px' }}
      >
        {lines.map((line, i) => {
          // 进程列表专用渲染
          if (line.type === 'ps') {
            return (
              <div key={i} style={{ display: 'flex', gap: 0, whiteSpace: 'pre' }}>
                <span style={{ color: '#64748b', minWidth: '48px' }}>{padEnd(line.pid, 6)}</span>
                <span style={{ color: '#e2e8f0', minWidth: '144px' }}>{padEnd(line.name, 18)}</span>
                <span style={{ color: STATE_COLOR[line.state] || '#94a3b8', minWidth: '64px' }}>{padEnd(STATE_CN[line.state] || line.state, 8)}</span>
                <span style={{ color: '#94a3b8', minWidth: '64px' }}>{padEnd(line.mem + 'MB', 8)}</span>
                <span style={{ color: '#64748b' }}>{line.pc}</span>
              </div>
            )
          }
          return (
            <div key={i} style={{ color: lineColor(line.type), whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {line.text}
            </div>
          )
        })}
      </div>

      {/* 分隔线 */}
      <div style={{ height: '1px', background: 'rgba(0,240,255,0.12)' }} />

      {/* 输入行 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '7px 14px', background: '#060e17' }}>
        <span style={{ color: '#00f0ff', fontSize: '12.5px', whiteSpace: 'nowrap', userSelect: 'none' }}>
          {PROMPT}
        </span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: '#e2e8f0', fontSize: '12.5px', fontFamily: 'inherit', caretColor: '#00f0ff',
          }}
          spellCheck={false}
          autoComplete="off"
          aria-label="终端输入"
        />
        <span style={{ color: '#00f0ff', animation: 'blink 1s step-end infinite', fontSize: '14px' }}>▋</span>
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: rgba(0,240,255,0.2); border-radius: 2px }
      `}</style>
    </div>
  )
}

export default TerminalWindow
