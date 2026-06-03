import React from 'react';

/**
 * MFQ多级反馈队列面板
 * 显示4个队列的状态和进程分布
 */
const MFQPanel = ({ mfqQueues, processes, runningProcess }) => {
  // 获取每个队列中的进程
  const getProcessesInQueue = (queueIndex) => {
    // 这里需要从后端获取队列信息，暂时返回空
    return [];
  };

  const queueColors = ['#6366f1', '#3b82f6', '#f59e0b', '#71717a'];
  const queueNames = ['队列0', '队列1', '队列2', '队列3'];
  const queueTimeQuantums = ['1', '2', '4', 'FCFS'];
  const queuePriorities = ['最高', '高', '低', '最低'];

  return (
    <div style={{
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '16px',
      marginTop: '12px'
    }}>
      <div style={{
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--text-0)',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>📊</span>
        MFQ 多级反馈队列
      </div>

      {/* 队列可视化 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {queueColors.map((color, index) => (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px',
            background: 'var(--bg-1)',
            borderRadius: '8px',
            border: `1px solid ${color}33`
          }}>
            {/* 队列标识 */}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: `${color}22`,
              border: `2px solid ${color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 600,
              color: color
            }}>
              Q{index}
            </div>

            {/* 队列信息 */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-0)',
                marginBottom: '2px'
              }}>
                {queueNames[index]} ({queuePriorities[index]})
              </div>
              <div style={{
                fontSize: '11px',
                color: 'var(--text-3)'
              }}>
                时间片 = {queueTimeQuantums[index]}
              </div>
            </div>

            {/* 进程数量 */}
            <div style={{
              padding: '4px 10px',
              background: `${color}22`,
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              color: color
            }}>
              {mfqQueues[index]} 个进程
            </div>
          </div>
        ))}
      </div>

      {/* 当前运行信息 */}
      {runningProcess && (
        <div style={{
          marginTop: '12px',
          padding: '10px',
          background: 'var(--green-soft)',
          borderRadius: '8px',
          border: '1px solid rgba(34,197,94,0.3)',
          fontSize: '12px'
        }}>
          <span style={{ color: 'var(--green)' }}>▶ 当前运行: </span>
          <span style={{ fontWeight: 600 }}>{runningProcess.name}</span>
          <span style={{ color: 'var(--text-3)', marginLeft: '8px' }}>
            (剩余 {runningProcess.remainingTime})
          </span>
        </div>
      )}

      {/* 说明 */}
      <div style={{
        marginTop: '12px',
        padding: '10px',
        background: 'var(--bg-1)',
        borderRadius: '8px',
        fontSize: '11px',
        color: 'var(--text-3)',
        lineHeight: 1.6
      }}>
        <div style={{ marginBottom: '4px', fontWeight: 600, color: 'var(--text-2)' }}>MFQ规则:</div>
        <div>1. 新进程进入队列0（最高优先级）</div>
        <div>2. 时间片用完降级到下一级队列</div>
        <div>3. 高优先级队列抢占低优先级进程</div>
      </div>
    </div>
  );
};

export default MFQPanel;
