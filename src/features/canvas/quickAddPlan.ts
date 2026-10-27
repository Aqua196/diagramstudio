// 快捷加号的纯逻辑：已连线的边、新节点落点（避让已有节点）、建「新节点 + 连线」命令。
import { insertElements } from '@/core/commands/ops'
import type { DiagramDoc, DiagramNode, Point } from '@/core/model/types'
import type { DiagramPlugin, NodeSide } from '@/core/plugin'
import { pickEdgeSides } from '@/features/canvas/selectors'
import { zh } from '@/i18n/zh'
import { createPluginEdge, createShapeNode } from './nodeFactory'

export const ALL_SIDES: NodeSide[] = ['top', 'right', 'bottom', 'left']
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

/** 规划「新节点 + 连线」：该方向已被占用时继续往外找空位（最多 6 格）；悬停预览与点击共用 */
export function planQuickAdd(
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
  return node ? { from, node, edge: createPluginEdge(plugin, from.id, node.id) } : null
}

export function buildQuickAdd(
  doc: DiagramDoc,
  plugin: DiagramPlugin,
  fromId: string,
  side: NodeSide,
) {
  const plan = planQuickAdd(doc, plugin, fromId, side)
  return plan ? insertElements([plan.node], [plan.edge], zh.canvas.quickAdd) : null
}
