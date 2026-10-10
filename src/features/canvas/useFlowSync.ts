// 文档 → React Flow 状态同步：doc 是唯一真相源，本地 nodes/edges
// 承载拖动/选择等瞬态；选择集镜像到 uiStore 供检查器与快捷键使用。
import { useCallback, useEffect, useState } from 'react'
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react'
import type { DiagramPlugin } from '@/core/plugin'
import type { DiagramDoc } from '@/core/model/types'
import {
  selectFlowEdges,
  selectFlowNodes,
  type FlowEdgeData,
  type FlowNodeData,
} from '@/store/selectors'
import { useUiStore } from '@/store/uiStore'

type FNode = Node<FlowNodeData>
type FEdge = Edge<FlowEdgeData>

export function useFlowSync(doc: DiagramDoc, plugin: DiagramPlugin) {
  const [nodes, setNodes] = useState<FNode[]>([])
  const [edges, setEdges] = useState<FEdge[]>([])
  const selection = useUiStore((s) => s.selection)
  const setSelection = useUiStore((s) => s.setSelection)

  // 文档变化 → 重建 RF 元素（选中标记按 uiStore 还原）
  useEffect(() => {
    const sel = useUiStore.getState().selection
    setNodes(
      selectFlowNodes(doc, plugin).map((n) => ({ ...n, selected: sel.nodeIds.includes(n.id) })),
    )
    setEdges(
      selectFlowEdges(doc, plugin).map((e) => ({ ...e, selected: sel.edgeIds.includes(e.id) })),
    )
  }, [doc, plugin])

  // uiStore 选择集（Esc/全选/粘贴等外部来源）→ 本地选中标记
  useEffect(() => {
    setNodes((ns) => ns.map((n) => ({ ...n, selected: selection.nodeIds.includes(n.id) })))
    setEdges((es) => es.map((e) => ({ ...e, selected: selection.edgeIds.includes(e.id) })))
  }, [selection])

  const onNodesChange = useCallback(
    (changes: NodeChange<FNode>[]) => setNodes((ns) => applyNodeChanges(changes, ns)),
    [],
  )
  const onEdgesChange = useCallback(
    (changes: EdgeChange<FEdge>[]) => setEdges((es) => applyEdgeChanges(changes, es)),
    [],
  )

  const onSelectionChange = useCallback(
    ({ nodes: sn, edges: se }: { nodes: Node[]; edges: Edge[] }) => {
      const cur = useUiStore.getState().selection
      const next = { nodeIds: sn.map((n) => n.id), edgeIds: se.map((e) => e.id) }
      if (
        cur.nodeIds.join() !== next.nodeIds.join() ||
        cur.edgeIds.join() !== next.edgeIds.join()
      ) {
        setSelection(next)
      }
    },
    [setSelection],
  )

  /** 外部强制选择（全选/清除/粘贴后选中新元素） */
  const selectIds = useCallback(
    (nodeIds: string[], edgeIds: string[]) => {
      setNodes((ns) => ns.map((n) => ({ ...n, selected: nodeIds.includes(n.id) })))
      setEdges((es) => es.map((e) => ({ ...e, selected: edgeIds.includes(e.id) })))
      setSelection({ nodeIds, edgeIds })
    },
    [setSelection],
  )

  return { nodes, edges, setNodes, onNodesChange, onEdgesChange, onSelectionChange, selectIds }
}
