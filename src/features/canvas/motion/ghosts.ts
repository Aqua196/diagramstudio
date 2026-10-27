// 退场残影：已删除/已折叠的节点与连线在画面上多留一小会儿播收回/淡出，然后由 CanvasMotion 移除。
// 残影不可交互、不进读屏（aria-hidden + inert）、不进导出，也不计入全选/拖放目标。
import type { Edge, Node } from '@xyflow/react'
import type { FlowEdgeData, FlowNodeData } from '@/features/canvas/selectors'
import type { Pt } from './plan'

type FNode = Node<FlowNodeData>
type FEdge = Edge<FlowEdgeData>

export function ghostNode(n: FNode, position: Pt, folding: boolean): FNode {
  return {
    ...n,
    position,
    data: { ...n.data, ghost: true },
    className: `ds-fx-ghost ds-export-exclude${folding ? ' is-folding' : ''}`,
    style: undefined,
    selected: false,
    dragging: false,
    selectable: false,
    draggable: false,
    connectable: false,
    focusable: false,
    deletable: false,
    zIndex: -1,
    // React 18 不认布尔 inert，传空字符串才会输出属性
    domAttributes: { 'aria-hidden': true, inert: '' } as FNode['domAttributes'],
  }
}

export function ghostEdge(e: FEdge): FEdge {
  return {
    ...e,
    data: { ...(e.data as FlowEdgeData), ghost: true },
    className: 'ds-fx-ghost-edge ds-export-exclude',
    style: undefined,
    selected: false,
    selectable: false,
    focusable: false,
    reconnectable: false,
    deletable: false,
    interactionWidth: 0,
    domAttributes: { 'aria-hidden': true },
  }
}

export const isGhostNode = (n: FNode): boolean => !!n.data.ghost
export const isGhostEdge = (e: FEdge): boolean => !!e.data?.ghost
