// 节点四周的「+」快捷添加（选中单个节点时出现，已连线的那一侧不显示）：点一下就在该方向接一个相连的新节点，
// 新节点形状由插件 nextKind 决定，随后直接进入文字编辑。拖动「+」旁的圆点仍是普通连线。
import { memo } from 'react'
import { Plus } from 'lucide-react'
import { insertElements } from '@/core/commands/ops'
import type { DiagramDoc, DiagramNode, Point } from '@/core/model/types'
import type { DiagramPlugin, NodeSide } from '@/core/plugin'
import { useDocumentStore } from '@/store/documentStore'
import { pickEdgeSides } from '@/store/selectors'
import { zh } from '@/i18n/zh'
import { executeAndFocus } from './focus'
import { createPluginEdge, createShapeNode } from './nodeFactory'

const ALL: NodeSide[] = ['top', 'right', 'bottom', 'left']
/** 节点间距；连线两端带基数符号（ER）时留宽一些给鸟脚与基数文字 */
const gapFor = (plugin: DiagramPlugin) => (plugin.edgeDefaults.cardinality ? 120 : 72)

const box = (n: DiagramNode) => ({ x: n.position.x, y: n.position.y, w: n.size.w, h: n.size.h })

/** 已被连线占用的边：有显式锚点用锚点，否则按两节点方位推算（与画布选边规则一致） */
export function usedSides(doc: DiagramDoc, id: string): Set<NodeSide> {
  const used = new Set<NodeSide>()
  for (const e of Object.values(doc.edges)) {
    if (e.source !== id && e.target !== id) continue
    const s = doc.nodes[e.source]
    const t = doc.nodes[e.target]
    if (!s || !t) continue
    const auto = pickEdgeSides(box(s), box(t))
    if (e.source === id) used.add((e.sourceHandle as NodeSide | undefined) ?? auto.source)
    if (e.target === id) used.add((e.targetHandle as NodeSide | undefined) ?? auto.target)
  }
  return used
}

function centerFor(
  from: DiagramNode,
  size: { w: number; h: number },
  side: NodeSide,
  step: number,
  gap: number,
): Point {
  const cx = from.position.x + from.size.w / 2
  const cy = from.position.y + from.size.h / 2
  const dx = (from.size.w + size.w) / 2 + gap
  const dy = (from.size.h + size.h) / 2 + gap
  if (side === 'right') return { x: cx + dx * step, y: cy }
  if (side === 'left') return { x: cx - dx * step, y: cy }
  if (side === 'bottom') return { x: cx, y: cy + dy * step }
  return { x: cx, y: cy - dy * step }
}

function occupied(doc: DiagramDoc, n: DiagramNode): boolean {
  return Object.values(doc.nodes).some(
    (b) =>
      n.position.x < b.position.x + b.size.w &&
      n.position.x + n.size.w > b.position.x &&
      n.position.y < b.position.y + b.size.h &&
      n.position.y + n.size.h > b.position.y,
  )
}

/** 建「新节点 + 连线」：该方向已被占用时继续往外找空位（最多 6 格） */
export function buildQuickAdd(
  doc: DiagramDoc,
  plugin: DiagramPlugin,
  fromId: string,
  side: NodeSide,
) {
  const from = doc.nodes[fromId]
  if (!from) return null
  const kind = plugin.nextKind?.(from.kind) ?? from.kind
  const size = plugin.shapes.find((s) => s.kind === kind)?.defaultSize ?? from.size
  let node: DiagramNode | null = null
  for (let step = 1; step <= 6; step++) {
    node = createShapeNode(plugin, kind, centerFor(from, size, side, step, gapFor(plugin)))
    if (node && !occupied(doc, node)) break
  }
  if (!node) return null
  return insertElements([node], [createPluginEdge(plugin, from.id, node.id)], zh.canvas.quickAdd)
}

function QuickAddInner({ nodeId, plugin }: { nodeId: string; plugin: DiagramPlugin }) {
  const used = useDocumentStore((s) => [...usedSides(s.doc, nodeId)].sort().join(','))
  const sides = (plugin.quickAddSides ?? ALL).filter((side) => !used.split(',').includes(side))
  if (sides.length === 0) return null
  const add = (side: NodeSide) => {
    const cmd = buildQuickAdd(useDocumentStore.getState().doc, plugin, nodeId, side)
    if (cmd) executeAndFocus(cmd)
  }
  return (
    <>
      {sides.map((side) => (
        <button
          key={side}
          type="button"
          className={`ds-quick ds-quick-${side} nodrag nopan ds-export-exclude`}
          aria-label={zh.canvas.quickAdd}
          title={zh.canvas.quickAdd}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            add(side)
          }}
        >
          <Plus size={12} strokeWidth={2.5} />
        </button>
      ))}
    </>
  )
}

export const QuickAdd = memo(QuickAddInner)
