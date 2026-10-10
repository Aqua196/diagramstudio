// 思维导图布局（d3-hierarchy）：中心主题左右交替展开子树；折叠节点的子树不参与布局。
import { hierarchy, tree } from 'd3-hierarchy'
import type { LayoutOptions } from '../plugin'
import type { DiagramDoc, DiagramNode } from '../model/types'

const LEVEL_GAP = 240 // 相邻两层中心距
const FIRST_GAP = 100 // 根与第一层子节点的边到边距离
const NODE_GAP = 64 // 同级垂直距离

type MindNode = DiagramNode & { data: { parentId?: string | null; collapsed?: boolean } }

function parentIdOf(node: DiagramNode): string | null {
  const p = (node as MindNode).data.parentId
  return typeof p === 'string' ? p : null
}

export function mindmapRootId(doc: DiagramDoc): string | null {
  return (
    doc.zOrder.find((id) => doc.nodes[id] && parentIdOf(doc.nodes[id]) === null) ??
    doc.zOrder[0] ??
    null
  )
}

/** 折叠节点的全部后代：画布据此隐藏子树 */
export function collapsedDescendants(doc: DiagramDoc): Set<string> {
  const hidden = new Set<string>()
  const childrenOf = (id: string) =>
    doc.zOrder.filter((z) => doc.nodes[z] && parentIdOf(doc.nodes[z]) === id)
  const walk = (id: string) => {
    for (const cid of childrenOf(id)) {
      hidden.add(cid)
      walk(cid)
    }
  }
  for (const node of Object.values(doc.nodes)) {
    if ((node as MindNode).data.collapsed === true) walk(node.id)
  }
  return hidden
}

interface TreeData {
  id: string
  children?: TreeData[]
}

export function mindmapLayout(
  doc: DiagramDoc,
  _opts: LayoutOptions,
): Record<string, { x: number; y: number }> {
  const rootId = mindmapRootId(doc)
  if (!rootId) return {}
  const root = doc.nodes[rootId]

  const childrenOf = (id: string): DiagramNode[] =>
    doc.zOrder
      .map((z) => doc.nodes[z])
      .filter((n): n is DiagramNode => !!n && parentIdOf(n) === id)

  const subtree = (n: DiagramNode): TreeData => ({
    id: n.id,
    children: (n as MindNode).data.collapsed === true ? undefined : childrenOf(n.id).map(subtree),
  })

  const direct = childrenOf(rootId)
  // 奇偶分配左右两侧（SPEC：左右展开）
  const right = direct.filter((_, i) => i % 2 === 0)
  const left = direct.filter((_, i) => i % 2 === 1)

  const out: Record<string, { x: number; y: number }> = { [rootId]: { x: 0, y: 0 } }
  const laySide = (kids: DiagramNode[], sign: 1 | -1) => {
    const h = hierarchy<TreeData>({ id: rootId, children: kids.map(subtree) })
    tree<TreeData>().nodeSize([NODE_GAP, LEVEL_GAP])(h)
    for (const d of h.descendants().slice(1)) {
      const node = doc.nodes[d.data.id]
      if (!node) continue
      const depth = Math.max(1, Math.round((d.y ?? 0) / LEVEL_GAP))
      out[d.data.id] = {
        // 根中心为 0：按层级推出水平位置，垂直由 d3 排布
        x: sign * (root.size.w / 2 + FIRST_GAP + (depth - 1) * LEVEL_GAP + node.size.w / 2),
        y: (d.x ?? 0) - node.size.h / 2,
      }
    }
  }
  laySide(right, 1)
  laySide(left, -1)
  return out
}
