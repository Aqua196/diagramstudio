// 画布（IMPL_CONTRACT §6）：默认导出 <EditorCanvas/>，无 props。
// 文档→元素经 store 选择器派生；拖动/框选等瞬态在 RF 内部，松手才提交命令。
import { useCallback, useMemo, useRef } from 'react'
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './canvas.css'

import { reconnectEdge } from '@/core/commands/ops'
import { getPlugin } from '@/plugins/registry'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import type { FlowEdgeData, FlowNodeData } from '@/store/selectors'

import DsShapeNode from './DsShapeNode'
import DsEdge from './DsEdge'
import { useCanvasStore } from './canvasStore'
import { useFlowSync } from './useFlowSync'
import { useDragGuards } from './useDragGuards'
import { useConnectFlow } from './useConnectFlow'
import { useCanvasDrop } from './useCanvasDrop'
import { useCanvasEvents } from './useCanvasEvents'
import { useCanvasKeys } from './useCanvasKeys'
import { CanvasContextMenu } from './CanvasContextMenu'
import { ZoomControls } from './ZoomControls'
import { EmptyState } from './EmptyState'
import { AlignmentGuides } from './AlignmentGuides'
import { NodeTextEditor } from './NodeTextEditor'
import { ConnectMenu } from './ConnectMenu'

// 类型表在模块级定义（SPEC §3.4）
const nodeTypes = { dsShape: DsShapeNode }
const edgeTypes = { dsEdge: DsEdge }

type FNode = Node<FlowNodeData>
type FEdge = Edge<FlowEdgeData>

function FlowInner() {
  const doc = useDocumentStore((s) => s.doc)
  const execute = useDocumentStore((s) => s.execute)
  const plugin = useMemo(() => getPlugin(doc.type), [doc.type])
  const theme = useUiStore((s) => s.resolvedTheme)
  const tool = useUiStore((s) => s.tool)
  const minimapVisible = useUiStore((s) => s.minimapVisible)
  const setZoom = useUiStore((s) => s.setZoom)
  const setTextEditing = useUiStore((s) => s.setTextEditing)

  const wrapperRef = useRef<HTMLDivElement>(null)
  const { nodes, edges, setNodes, onNodesChange, onEdgesChange, onSelectionChange, selectIds } =
    useFlowSync(doc, plugin)
  const nodesRef = useRef<FNode[]>(nodes)
  nodesRef.current = nodes
  const visibleNodeIds = useCallback(() => nodesRef.current.map((n) => n.id), [])

  const editingNodeId = useCanvasStore((s) => s.editingNodeId)
  const setEditingNode = useCanvasStore((s) => s.setEditingNode)
  const setEditingEdge = useCanvasStore((s) => s.setEditingEdge)
  const connectMenu = useCanvasStore((s) => s.connectMenu)
  const setConnectMenu = useCanvasStore((s) => s.setConnectMenu)

  const drag = useDragGuards(doc, plugin, setNodes)
  const conn = useConnectFlow(doc, plugin, wrapperRef)
  const drop = useCanvasDrop(doc, plugin)
  useCanvasEvents(doc, plugin, { containerRef: wrapperRef, selectIds, visibleNodeIds })
  useCanvasKeys(doc, plugin, { selectIds })

  const editingNode = editingNodeId ? (doc.nodes[editingNodeId] ?? null) : null

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
    ) => {
      execute(
        reconnectEdge(oldEdge.id, {
          source: c.source,
          target: c.target,
          sourceHandle: c.sourceHandle ?? undefined,
          targetHandle: c.targetHandle ?? undefined,
        }),
      )
    },
    [execute],
  )

  const empty = Object.keys(doc.nodes).length === 0

  return (
    <div
      ref={wrapperRef}
      className="ds-canvas"
      data-tool={tool}
      onDrop={drop.onDrop}
      onDragOver={drop.onDragOver}
      onDoubleClick={drop.onDoubleClick}
    >
      <CanvasContextMenu>
        <div className="ds-canvas-flow">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onSelectionChange={onSelectionChange}
            onConnect={conn.onConnect}
            onConnectEnd={conn.onConnectEnd}
            onNodeDragStart={drag.onNodeDragStart}
            onNodeDrag={drag.onNodeDrag}
            onNodeDragStop={drag.onNodeDragStop}
            onNodeDoubleClick={(_e, n: FNode) => startNodeEdit(n.id)}
            onEdgeDoubleClick={(_e, e2: FEdge) => setEditingEdge(e2.id)}
            onReconnect={onReconnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            colorMode={theme}
            connectionMode={ConnectionMode.Loose}
            isValidConnection={conn.isValidConnection}
            edgesReconnectable
            reconnectRadius={10}
            snapToGrid={doc.settings.snap}
            snapGrid={[12, 12]}
            selectionOnDrag={tool === 'select'}
            panOnDrag={tool === 'hand' ? [0, 1, 2] : [1, 2]}
            panActivationKeyCode="Space"
            panOnScroll
            zoomOnPinch
            zoomOnScroll={false}
            minZoom={0.1}
            maxZoom={4}
            fitView
            fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
            onMove={(_e, vp) => setZoom(vp.zoom)}
            deleteKeyCode={null}
            nodesFocusable
            edgesFocusable
            onlyRenderVisibleElements
            disableKeyboardA11y
          >
            {doc.settings.grid && (
              <Background
                id="fine"
                variant={BackgroundVariant.Lines}
                gap={24}
                color="var(--grid-fine)"
              />
            )}
            {doc.settings.grid && (
              <Background
                id="coarse"
                variant={BackgroundVariant.Lines}
                gap={120}
                color="var(--grid-coarse)"
              />
            )}
            {minimapVisible && <MiniMap className="ds-minimap" pannable zoomable />}
            <ZoomControls />
          </ReactFlow>
        </div>
      </CanvasContextMenu>
      <AlignmentGuides />
      {empty && <EmptyState />}
      {editingNode && <NodeTextEditor node={editingNode} onDone={() => setEditingNode(null)} />}
      {connectMenu && (
        <ConnectMenu
          menu={connectMenu}
          shapes={plugin.shapes}
          onClose={() => setConnectMenu(null)}
        />
      )}
    </div>
  )
}

export default function EditorCanvas() {
  return (
    <ReactFlowProvider>
      <FlowInner />
    </ReactFlowProvider>
  )
}
