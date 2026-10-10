// 自动布局执行器：EV.AUTO_LAYOUT 与 plugin.autoLayoutOnChange 共用。
// 布局是一条可撤销命令；300ms 过渡通过画布容器上的临时 CSS 类实现。
import { setNodePositions } from '@/core/commands/ops'
import type { Command } from '@/core/commands/command'
import type { DiagramPlugin } from '@/core/plugin'
import type { DiagramDoc, Point } from '@/core/model/types'

export const LAYOUT_ANIM_MS = 320

function positionsChanged(current: DiagramDoc, next: Record<string, Point>): boolean {
  for (const [id, p] of Object.entries(next)) {
    const n = current.nodes[id]
    if (!n) continue
    if (Math.abs(n.position.x - p.x) > 0.5 || Math.abs(n.position.y - p.y) > 0.5) return true
  }
  return false
}

/**
 * 计算插件布局并在位置变化时返回待执行命令；无变化返回 null。
 * 调用方负责执行命令与触发动效类名。
 */
export function buildLayoutCommand(
  doc: DiagramDoc,
  plugin: DiagramPlugin,
  direction: 'TB' | 'LR',
): Command | null {
  const next = plugin.layout(doc, { direction })
  if (!positionsChanged(doc, next)) return null
  return setNodePositions(next, '自动布局')
}

/** 在容器元素上加一次性过渡类，让 RF 节点 transform 以 300ms 动画移动 */
export function animateLayout(container: HTMLElement | null): void {
  if (!container) return
  container.classList.add('ds-layout-animating')
  window.setTimeout(() => container.classList.remove('ds-layout-animating'), LAYOUT_ANIM_MS)
}
