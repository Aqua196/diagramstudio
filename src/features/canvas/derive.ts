// 文档 → React Flow 元素（在 store 选择器之上）：恢复选中标记，并尽量沿用上一帧的对象。
// 沿用的意义：React Flow 对引用不变的节点直接复用内部状态；对「新对象且不带 measured」的节点
// 会清空锚点、整体重测，期间所有连线消失一帧——以前每改一次文档都会闪，大图还白白多一轮测量。
import type { Edge, Node } from '@xyflow/react'
import type { DiagramDoc } from '@/core/model/types'
import type { DiagramPlugin } from '@/core/plugin'
import { selectFlowEdges, selectFlowNodes, type FlowEdgeData, type FlowNodeData } from '@/store/selectors'
import type { Selection } from '@/store/uiStore'

type FNode = Node<FlowNodeData>
type FEdge = Edge<FlowEdgeData>

export function deriveNodes(doc: DiagramDoc, plugin: DiagramPlugin, shown: FNode[], sel: Selection): FNode[] {
  const was = new Map(shown.map((n) => [n.id, n]))
  const picked = new Set(sel.nodeIds)
  return selectFlowNodes(doc, plugin).map((n) => {
    const selected = picked.has(n.id)
    const w = was.get(n.id)
    if (!w || w.data.ghost) return { ...n, selected }
    const same =
      w.data.node === n.data.node &&
      w.data.plugin === n.data.plugin &&
      w.selected === selected &&
      w.zIndex === n.zIndex &&
      !w.className &&
      !w.dragging &&
      w.position.x === n.position.x &&
      w.position.y === n.position.y
    if (same) return w
    const keep = w.measured && w.width === n.width && w.height === n.height
    return { ...n, selected, ...(keep && { measured: w.measured }) }
  })
}

export function deriveEdges(doc: DiagramDoc, plugin: DiagramPlugin, shown: FEdge[], sel: Selection): FEdge[] {
  const was = new Map(shown.map((e) => [e.id, e]))
  const picked = new Set(sel.edgeIds)
  return selectFlowEdges(doc, plugin).map((e) => {
    const selected = picked.has(e.id)
    const w = was.get(e.id)
    const same =
      w &&
      !w.data?.ghost &&
      !w.className &&
      w.data?.edge === e.data?.edge &&
      w.selected === selected &&
      w.source === e.source &&
      w.target === e.target &&
      w.sourceHandle === e.sourceHandle &&
      w.targetHandle === e.targetHandle
    return same ? w : { ...e, selected }
  })
}
