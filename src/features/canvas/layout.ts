// 自动布局执行器：EV.AUTO_LAYOUT 与 plugin.autoLayoutOnChange 共用。
// 布局是一条可撤销命令；节点滑到新位置的过渡由视图层动效（motion/canvasMotion）统一处理，连线全程跟随。
import { setNodePositions } from '@/core/commands/ops'
import type { Command } from '@/core/commands/command'
import type { DiagramPlugin } from '@/core/plugin'
import type { DiagramDoc, Point } from '@/core/model/types'

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
