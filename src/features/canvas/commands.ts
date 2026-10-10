// 画布本地命令工厂：core/ops 未覆盖的画布专属命令（方向键合并、切换图类型）。
import type { Command } from '@/core/commands/command'
import type { DiagramType } from '@/core/model/types'

/** 方向键微调：相同选择集 600ms 内的连续按键合并为一条历史 */
export function nudgeNodes(ids: string[], dx: number, dy: number): Command {
  return {
    label: ids.length > 1 ? `移动 ${ids.length} 个元素` : '移动元素',
    coalesceKey: `nudge:${ids.join(',')}`,
    apply(draft) {
      for (const id of ids) {
        const n = draft.nodes[id]
        if (n) {
          n.position.x += dx
          n.position.y += dy
        }
      }
    },
  }
}

/** 顶栏分段控件切换图类型：节点 kind 保留，渲染交给目标插件兜底 */
export function setDocType(type: DiagramType): Command {
  return {
    label: '切换图类型',
    apply(draft) {
      draft.type = type
    },
  }
}
