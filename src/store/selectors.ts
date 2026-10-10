// 派生选择器（IMPL_CONTRACT §3）：React Flow 用的 nodes/edges 由文档派生，不单独保存。
// 隐藏逻辑（折叠子树）由插件 hiddenNodeIds 提供，这里不判断图类型。
import type { Edge, Node } from '@xyflow/react'
import type { DiagramPlugin } from '@/core/plugin'
import type { DiagramDoc, DiagramEdge, DiagramNode } from '@/core/model/types'
import type { Selection } from './uiStore'

export type FlowNodeData = { node: DiagramNode; plugin: DiagramPlugin }
export type FlowEdgeData = { edge: DiagramEdge }

/** 文档 → React Flow nodes：按 zOrder 排序，后者在上 */
export function selectFlowNodes(doc: DiagramDoc, plugin: DiagramPlugin): Node<FlowNodeData>[] {
  const hidden = plugin.hiddenNodeIds?.(doc) ?? new Set<string>()
  const out: Node<FlowNodeData>[] = []
  let z = 0
  for (const id of doc.zOrder) {
    const node = doc.nodes[id]
    if (!node || hidden.has(id)) continue
    out.push({
      id,
      type: 'dsShape',
      position: { x: node.position.x, y: node.position.y },
      data: { node, plugin },
      zIndex: z++,
      width: node.size.w,
      height: node.size.h,
      selectable: true,
      draggable: true,
    })
  }
  return out
}

export type EdgeSide = 'top' | 'right' | 'bottom' | 'left'

/** 未显式记录锚点时按两节点中心连线选边：水平占优→左右，否则上下（R1，通用不分图类型） */
export function pickEdgeSides(
  s: { x: number; y: number; w: number; h: number },
  t: { x: number; y: number; w: number; h: number },
): { source: EdgeSide; target: EdgeSide } {
  const dx = t.x + t.w / 2 - (s.x + s.w / 2)
  const dy = t.y + t.h / 2 - (s.y + s.h / 2)
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? { source: 'right', target: 'left' } : { source: 'left', target: 'right' }
  }
  return dy >= 0 ? { source: 'bottom', target: 'top' } : { source: 'top', target: 'bottom' }
}

/** 文档边 → RF 边：显式锚点原样使用，缺省按节点中心自动选边 */
function edgeHandles(
  doc: DiagramDoc,
  edge: DiagramEdge,
): { sourceHandle?: string; targetHandle?: string } {
  if (edge.sourceHandle && edge.targetHandle) {
    return { sourceHandle: edge.sourceHandle, targetHandle: edge.targetHandle }
  }
  const s = doc.nodes[edge.source]
  const t = doc.nodes[edge.target]
  if (!s || !t) return {}
  const sides = pickEdgeSides(
    { x: s.position.x, y: s.position.y, w: s.size.w, h: s.size.h },
    { x: t.position.x, y: t.position.y, w: t.size.w, h: t.size.h },
  )
  return {
    sourceHandle: edge.sourceHandle ?? sides.source,
    targetHandle: edge.targetHandle ?? sides.target,
  }
}

export function selectFlowEdges(doc: DiagramDoc, plugin: DiagramPlugin): Edge<FlowEdgeData>[] {
  const hidden = plugin.hiddenNodeIds?.(doc) ?? new Set<string>()
  const out: Edge<FlowEdgeData>[] = []
  for (const edge of Object.values(doc.edges)) {
    if (hidden.has(edge.source) || hidden.has(edge.target)) continue
    out.push({
      id: edge.id,
      type: 'dsEdge',
      source: edge.source,
      target: edge.target,
      ...edgeHandles(doc, edge),
      data: { edge },
      zIndex: 1000,
    })
  }
  // 思维导图等以 node.data.parentId 表达父子关系的插件：派生只读连接线
  const d = plugin.edgeDefaults
  for (const id of doc.zOrder) {
    const node = doc.nodes[id]
    const parentId = node?.data?.parentId
    if (!node || typeof parentId !== 'string' || !doc.nodes[parentId]) continue
    if (hidden.has(id) || hidden.has(parentId)) continue
    const edge: DiagramEdge = {
      id: `__parent_${id}`,
      source: parentId,
      target: id,
      routing: d?.routing ?? 'bezier',
      arrowStart: 'none',
      arrowEnd: 'none',
      style: d?.style ?? { stroke: 'ink-2', strokeWidth: 1.5, dash: 'solid' },
    }
    out.push({
      id: edge.id,
      type: 'dsEdge',
      source: edge.source,
      target: edge.target,
      ...edgeHandles(doc, edge),
      data: { edge },
      selectable: false,
      focusable: false,
      zIndex: 999,
    })
  }
  return out
}

export function selectSelectedNodes(doc: DiagramDoc, sel: Selection): DiagramNode[] {
  return sel.nodeIds.map((id) => doc.nodes[id]).filter((n): n is DiagramNode => !!n)
}

export function selectSelectedEdges(doc: DiagramDoc, sel: Selection): DiagramEdge[] {
  return sel.edgeIds.map((id) => doc.edges[id]).filter((e): e is DiagramEdge => !!e)
}
