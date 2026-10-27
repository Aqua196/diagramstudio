// 画布装配（C1 从 EditorCanvas/FlowInner 拆出）：hook 接线全部收在这里，
// ReactFlow props 以对象形式返回，UI 层只做 JSX 布局。
import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  ConnectionMode,
  useReactFlow,
  type Edge,
  type Node,
  type ReactFlowProps,
} from '@xyflow/react'
import { reconnectEdge } from '@/core/commands/ops'
import type { DiagramDoc } from '@/core/model/types'
import type { DiagramPlugin } from '@/core/plugin'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import type { FlowEdgeData, FlowNodeData } from '@/features/canvas/selectors'
import { useCanvasStore } from './canvasStore'
import { useFlowSync } from './useFlowSync'
import { useDragGuards } from './useDragGuards'
import { useConnectFlow } from './useConnectFlow'
import { useCanvasDrop } from './useCanvasDrop'
import { useCanvasEvents } from './useCanvasEvents'
import { useCanvasKeys } from './useCanvasKeys'
import { useExportEvents } from './useExportEvents'
import { useCollabCursor } from './useCollabCursor'
import { useRevealEditing } from './useCameraFollow'

export type FNode = Node<FlowNodeData>
export type FEdge = Edge<FlowEdgeData>

/** ReactFlow 的 props 袋（除 children 外的全部接线） */
export interface CanvasWiring {
  rfProps: ReactFlowProps<FNode, FEdge>
  /** 画布容器 ref（.ds-canvas），useCanvasEvents 的坐标换算依赖它 */
  wrapperRef: React.RefObject<HTMLDivElement>
  drop: {
    onDrop: React.DragEventHandler
    onDragOver: React.DragEventHandler
    onDoubleClick: React.MouseEventHandler
    onPointerDown: React.PointerEventHandler
  }
  empty: boolean
}

const FIT = { padding: 0.2, maxZoom: 1 }

/** 适应画面只在「打开文档」时做：挂载时已有内容 → RF 初始 fitView；之后换文档 → 手动 fit。
 *  空文档放下第一个节点时不再被初始 fitView 拽到正中（否则第二个落点会叠上去） */
function useFitOnOpen(doc: DiagramDoc, rf: ReturnType<typeof useReactFlow>): boolean {
  const fitOnMount = useRef(Object.keys(doc.nodes).length > 0).current
  const lastId = useRef(doc.id)
  useEffect(() => {
    if (lastId.current === doc.id) return
    lastId.current = doc.id
    if (Object.keys(doc.nodes).length === 0) return
    const t = window.setTimeout(() => void rf.fitView(FIT), 30)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id])
  return fitOnMount
}

export function useCanvasWiring(doc: DiagramDoc, plugin: DiagramPlugin): CanvasWiring {
  const execute = useDocumentStore((s) => s.execute)
  const theme = useUiStore((s) => s.resolvedTheme)
  const tool = useUiStore((s) => s.tool)
  const setZoom = useUiStore((s) => s.setZoom)
  const setTextEditing = useUiStore((s) => s.setTextEditing)

  const wrapperRef = useRef<HTMLDivElement>(null)
  const { nodes, edges, setNodes, onNodesChange, onEdgesChange, onSelectionChange, selectIds } =
    useFlowSync(doc, plugin)
  const nodesRef = useRef<FNode[]>(nodes)
  nodesRef.current = nodes
  const visibleNodeIds = useCallback(
    () => nodesRef.current.filter((n) => !n.data.ghost).map((n) => n.id),
    [],
  )

  const setEditingNode = useCanvasStore((s) => s.setEditingNode)
  const setEditingEdge = useCanvasStore((s) => s.setEditingEdge)

  const drag = useDragGuards(doc, plugin, setNodes)
  const rf = useReactFlow()
  const fitOnMount = useFitOnOpen(doc, rf)
  useRevealEditing(rf)
  useExportEvents()
  const cursor = useCollabCursor(rf)
  const conn = useConnectFlow(doc, plugin, wrapperRef)
  const drop = useCanvasDrop(doc, plugin, wrapperRef)
  useCanvasEvents(doc, plugin, { selectIds, visibleNodeIds })
  useCanvasKeys(doc, plugin, { selectIds })

  const startNodeEdit = useCallback(
    (id: string) => {
      setEditingNode(id)
      setTextEditing(true)
    },
    [setEditingNode, setTextEditing],
  )
  const onReconnect = useCallback(
    (
      oldEdge: FEdge,
      c: {
        source: string
        target: string
        sourceHandle: string | null
        targetHandle: string | null
      },
    ) =>
      execute(
        reconnectEdge(oldEdge.id, {
          source: c.source,
          target: c.target,
          sourceHandle: c.sourceHandle ?? undefined,
          targetHandle: c.targetHandle ?? undefined,
        }),
      ),
    [execute],
  )

  const rfProps = useMemo<ReactFlowProps<FNode, FEdge>>(
    () => ({
      nodes,
      edges,
      onNodesChange,
      onEdgesChange,
      onSelectionChange,
      onConnect: conn.onConnect,
      onConnectEnd: conn.onConnectEnd,
      onNodeDragStart: drag.onNodeDragStart,
      onNodeDrag: drag.onNodeDrag,
      onNodeDragStop: drag.onNodeDragStop,
      onNodeDoubleClick: (_e: unknown, n: FNode) => startNodeEdit(n.id),
      onEdgeDoubleClick: (_e: unknown, e2: FEdge) => setEditingEdge(e2.id),
      onReconnect,
      colorMode: theme,
      connectionMode: ConnectionMode.Loose,
      isValidConnection: conn.isValidConnection,
      edgesReconnectable: true,
      reconnectRadius: 10,
      snapToGrid: doc.settings.snap,
      snapGrid: [12, 12] as [number, number],
      selectionOnDrag: tool === 'select',
      panOnDrag: tool === 'hand' ? [0, 1, 2] : ([1, 2] as number[]),
      panActivationKeyCode: 'Space',
      panOnScroll: true,
      zoomOnPinch: true,
      zoomOnScroll: false,
      zoomOnDoubleClick: false,
      // 遵守 React Flow 开源署名要求：保留署名，移到左下浮动条上方、弱化显示
      attributionPosition: 'bottom-left',
      minZoom: 0.1,
      maxZoom: 4,
      fitView: fitOnMount,
      fitViewOptions: FIT,
      onMove: (_e: unknown, vp: { zoom: number }) => setZoom(vp.zoom),
      onPointerMove: cursor.onPointerMove,
      onPointerLeave: cursor.onPointerLeave,
      deleteKeyCode: null,
      nodesFocusable: true,
      edgesFocusable: true,
      onlyRenderVisibleElements: true,
      disableKeyboardA11y: true,
    }),
    [
      nodes,
      edges,
      onNodesChange,
      onEdgesChange,
      onSelectionChange,
      conn,
      drag,
      startNodeEdit,
      setEditingEdge,
      onReconnect,
      theme,
      doc.settings.snap,
      tool,
      setZoom,
      cursor,
      fitOnMount,
    ],
  )

  return {
    rfProps,
    wrapperRef,
    drop,
    empty: Object.keys(doc.nodes).length === 0,
  }
}
