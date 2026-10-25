// 把动效账本叠到「由文档派生的元素」上：起始位置覆盖、动画类名/CSS 变量、追加退场残影。
// 空闲时（账本为空、没有覆盖）原样返回派生结果，拖动等高频路径零额外分配。
import type { Edge, Node } from '@xyflow/react'
import type { FlowEdgeData, FlowNodeData } from '@/store/selectors'
import type { FxBook } from './fxBook'
import type { Pt, ViewNode } from './plan'
import type { Tweener } from './tween'

type FNode = Node<FlowNodeData>
type FEdge = Edge<FlowEdgeData>
export type Lists = { nodes: FNode[]; edges: FEdge[] }

export const toView = (n: FNode, position: Pt = n.position): ViewNode => ({
  id: n.id,
  position,
  width: n.width ?? n.measured?.width,
  height: n.height ?? n.measured?.height,
})

/** 摘掉动画类名与 CSS 变量 */
export const plain = <E extends FNode | FEdge>(e: E): E =>
  e.className ? { ...e, className: undefined, style: undefined } : e

export function composeLists(
  book: FxBook,
  tween: Tweener,
  next: Lists,
  pos: Map<string, Pt>,
): Lists {
  if (book.size === 0 && pos.size === 0) return next
  const { nodeFx, edgeFx, ghosts, ghostEdges } = book
  const nodes: FNode[] = next.nodes.map((n) => {
    const p = pos.get(n.id)
    const fx = nodeFx.get(n.id)
    if (!p && !fx) return n
    return { ...n, ...(p && { position: p }), ...(fx && { className: fx.cls, style: fx.style }) }
  })
  const ids = new Set(nodes.map((n) => n.id))
  for (const [id, g] of ghosts) {
    if (ids.has(id)) continue
    nodes.push({ ...g.node, position: tween.at(id) ?? g.node.position })
    ids.add(id)
  }
  const edges: FEdge[] = next.edges.map((e) => {
    const fx = edgeFx.get(e.id)
    return fx ? { ...e, className: fx.cls, style: fx.style } : e
  })
  const edgeIds = new Set(edges.map((e) => e.id))
  for (const [id, g] of ghostEdges) {
    if (!edgeIds.has(id) && ids.has(g.edge.source) && ids.has(g.edge.target)) edges.push(g.edge)
  }
  return { nodes, edges }
}
