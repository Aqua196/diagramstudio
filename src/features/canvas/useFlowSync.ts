// 文档 → React Flow 状态同步：doc 是唯一真相源，本地 nodes/edges
// 承载拖动/选择/动效补间等瞬态；选择集镜像到 uiStore 供检查器与快捷键使用。
// 文档变化先交给 CanvasMotion 比对当前画面，决定哪些节点滑动/长出/收回（只改视图，不进历史）。
import { useCallback, useEffect, useRef, useState } from 'react'
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
import type { FlowEdgeData, FlowNodeData } from '@/features/canvas/selectors'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { deriveEdges, deriveNodes } from './derive'
import { CanvasMotion } from './motion/canvasMotion'

type FNode = Node<FlowNodeData>
type FEdge = Edge<FlowEdgeData>

export function useFlowSync(doc: DiagramDoc, plugin: DiagramPlugin) {
  const [nodes, setNodes] = useState<FNode[]>([])
  const [edges, setEdges] = useState<FEdge[]>([])
  const selection = useUiStore((s) => s.selection)
  const setSelection = useUiStore((s) => s.setSelection)
  const [motion] = useState(() => new CanvasMotion(setNodes, setEdges))
  useEffect(() => () => motion.dispose(), [motion])
  const shown = useRef({ nodes, edges })
  shown.current = { nodes, edges }

  // 文档变化 → 重建 RF 元素（选中标记按 uiStore 还原），再由动效层补上过渡
  useEffect(() => {
    const sel = useUiStore.getState().selection
    const next = {
      nodes: deriveNodes(doc, plugin, shown.current.nodes, sel),
      edges: deriveEdges(doc, plugin, shown.current.edges, sel),
    }
    const out = motion.reconcile({
      doc,
      change: useDocumentStore.getState().lastChange,
      shown: shown.current,
      next,
    })
    setNodes(out.nodes)
    setEdges(out.edges)
  }, [doc, plugin, motion])

  // uiStore 选择集（Esc/全选/粘贴等外部来源）→ 本地选中标记（退场残影永不选中）
  useEffect(() => {
    const ns = new Set(selection.nodeIds)
    const es = new Set(selection.edgeIds)
    // 只给选中状态真正翻转的元素换新对象
    setNodes((list) =>
      list.map((n) => {
        const s = !n.data.ghost && ns.has(n.id)
        return n.selected === s ? n : { ...n, selected: s }
      }),
    )
    setEdges((list) =>
      list.map((e) => (e.selected === es.has(e.id) ? e : { ...e, selected: es.has(e.id) })),
    )
  }, [selection])

  const onNodesChange = useCallback(
    (changes: NodeChange<FNode>[]) => {
      // 拖动开始时让补间让位：节点停在当前插值位置，由 React Flow 接着拖
      const grabbed = changes.flatMap((c) => (c.type === 'position' && c.dragging ? [c.id] : []))
      if (grabbed.length) motion.release(grabbed)
      setNodes((ns) => applyNodeChanges(changes, ns))
    },
    [motion],
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
