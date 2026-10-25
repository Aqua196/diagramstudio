// dagre 自动布局（流程图、ER）：dagre 输出节点中心点，换算回左上角坐标。
import dagre from '@dagrejs/dagre'
import type { LayoutOptions } from '../plugin'
import type { DiagramDoc } from '../model/types'

const NODE_SEP = 60
const RANK_SEP = 90

export function dagreLayout(
  doc: DiagramDoc,
  opts: LayoutOptions,
): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: opts.direction === 'LR' ? 'LR' : 'TB',
    nodesep: NODE_SEP,
    ranksep: RANK_SEP,
  })
  g.setDefaultEdgeLabel(() => ({}))

  for (const id of doc.zOrder) {
    const node = doc.nodes[id]
    if (node) g.setNode(id, { width: node.size.w, height: node.size.h })
  }
  for (const edge of Object.values(doc.edges)) {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) g.setEdge(edge.source, edge.target)
  }
  dagre.layout(g)

  const out: Record<string, { x: number; y: number }> = {}
  for (const id of g.nodes()) {
    const n = g.node(id)
    const node = doc.nodes[id]
    if (n && node) out[id] = { x: n.x - node.size.w / 2, y: n.y - node.size.h / 2 }
  }
  return out
}
