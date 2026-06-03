import React from 'react'

/**
 * macOS 极简桌面 — 只有壁纸，没有多余内容
 */
function Desktop({ apps, onLaunchApp, onOpenTaskManager, onOpenKernelLab, onOpenSystemLog }) {
  // 桌面双击留空，所有操作通过 Dock 栏完成
  return (
    <div className="desktop-mac">
      {/* 纯净壁纸，无任何内容 */}
    </div>
  )
}

export default Desktop
