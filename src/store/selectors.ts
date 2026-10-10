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
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
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
