// 画布本地命令工厂：core/ops 未覆盖的画布专属命令（方向键合并、多选改样式）。
import type { Command } from '@/core/commands/command'
import type { NodeStyle } from '@/core/model/types'

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

/** 多选统一改样式（颜色/字号/加粗）：一条历史，撤销一次全部还原 */
export function patchNodesStyle(ids: string[], patch: Partial<NodeStyle>, label: string): Command {
  return {
    label,
    apply(draft) {
      for (const id of ids) {
        const n = draft.nodes[id]
        if (n) Object.assign(n.style, patch)
      }
    },
  }
}
