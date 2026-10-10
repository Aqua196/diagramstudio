// 节点拖动：对齐参考线 + 吸附到其它节点边缘/中心（SPEC §5）、
// 拖动改父级（plugin.onDropOnNode）、松手提交一条位置命令。
import { useCallback, useRef } from 'react'
import { useReactFlow, type Node } from '@xyflow/react'
import { setNodePositions } from '@/core/commands/ops'
import type { DiagramPlugin } from '@/core/plugin'
import type { DiagramDoc, Point } from '@/core/model/types'
import { useDocumentStore } from '@/store/documentStore'
import { useCanvasStore } from './canvasStore'
import { computeSnap, type SnapRect } from './guides'
import type { FlowNodeData } from '@/store/selectors'

type SetNodes = (fn: (ns: Node<FlowNodeData>[]) => Node<FlowNodeData>[]) => void

export function useDragGuards(doc: DiagramDoc, plugin: DiagramPlugin, setNodes: SetNodes) {
  const rf = useReactFlow()
  const docRef = useRef(doc)
  const pluginRef = useRef(plugin)
  docRef.current = doc
  pluginRef.current = plugin
  const othersRef = useRef<SnapRect[]>([])

  // 拖动开始时缓存「其它节点」外框，吸附只跟它们对齐（自身除外）
  const onNodeDragStart = useCallback((_e: unknown, _node: Node, dragNodes: Node[]) => {
    const ids = new Set(dragNodes.map((n) => n.id))
    const d = docRef.current
    othersRef.current = d.zOrder
      .filter((id) => !ids.has(id) && d.nodes[id])
      .map((id) => {
        const n = d.nodes[id]
        return { x: n.position.x, y: n.position.y, w: n.size.w, h: n.size.h }
      })
  }, [])

  const onNodeDrag = useCallback(
    (_e: unknown, node: Node, dragNodes: Node[]) => {
      const dn = (node.data as FlowNodeData).node
      const res = computeSnap(
        { x: node.position.x, y: node.position.y, w: dn.size.w, h: dn.size.h },
        othersRef.current,
      )
      if (res.dx !== 0 || res.dy !== 0) {
        const moved = new Set(dragNodes.map((n) => n.id))
        setNodes((ns) =>
          ns.map((n) =>
            moved.has(n.id)
              ? { ...n, position: { x: n.position.x + res.dx, y: n.position.y + res.dy } }
              : n,
          ),
        )
      }
      const cs = useCanvasStore.getState()
      cs.setGuides({ v: res.guidesV, h: res.guidesH })
      if (pluginRef.current.onDropOnNode) {
        const hit = rf.getIntersectingNodes(node).find((n) => n.id !== node.id)
        const target = hit && !dragNodes.some((d) => d.id === hit.id) ? hit.id : null
        if (cs.dropTargetId !== target) cs.setDropTarget(target)
      }
    },
    [rf, setNodes],
  )

  const onNodeDragStop = useCallback((_e: unknown, node: Node, dragNodes: Node[]) => {
    const cs = useCanvasStore.getState()
    cs.setGuides({ v: [], h: [] })
    const target = cs.dropTargetId
    cs.setDropTarget(null)
    const p = pluginRef.current
    // 优先按插件语义处理（思维导图拖到另一节点=改父级），否则提交移动命令
    if (target && p.onDropOnNode) {
      const cmd = p.onDropOnNode(docRef.current, node.id, target)
      if (cmd) {
        useDocumentStore.getState().execute(cmd)
        return
      }
    }
    // RF 上报的 node.position 是未吸附的原始拖拽坐标；与拖动中一致地补算吸附偏移，
    // 否则松手会写回偏一格的位置（视觉位置会往回跳）
    const dn = (node.data as FlowNodeData).node
    const res = computeSnap(
      { x: node.position.x, y: node.position.y, w: dn.size.w, h: dn.size.h },
      othersRef.current,
    )
    const moved = new Set(dragNodes.map((n) => n.id))
    const positions: Record<string, Point> = {}
    for (const n of dragNodes) {
      positions[n.id] = moved.has(n.id)
        ? { x: n.position.x + res.dx, y: n.position.y + res.dy }
        : n.position
    }
    if (res.dx !== 0 || res.dy !== 0) {
      setNodes((ns) =>
        ns.map((n) =>
          moved.has(n.id)
            ? { ...n, position: { x: n.position.x + res.dx, y: n.position.y + res.dy } }
            : n,
        ),
      )
    }
    if (Object.keys(positions).length > 0) {
      useDocumentStore.getState().execute(setNodePositions(positions, '移动元素'))
    }
  }, [setNodes])

  return { onNodeDragStart, onNodeDrag, onNodeDragStop }
}
