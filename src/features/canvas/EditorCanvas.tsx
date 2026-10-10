// 画布（IMPL_CONTRACT §6）：默认导出 <EditorCanvas/>，无 props。
// 文档→元素经 store 选择器派生；拖动/框选等瞬态在 RF 内部，松手才提交命令。
// hook 接线在 useCanvasWiring（C1），这里只做 JSX 布局。
import { useMemo } from 'react'
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './canvas.css'

import { getPlugin } from '@/plugins/registry'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'

import DsShapeNode from './DsShapeNode'
import DsEdge from './DsEdge'
import { useCanvasStore } from './canvasStore'
import { useCanvasWiring } from './useCanvasWiring'
import { PeerCursors } from './PeerCursors'
import { CanvasContextMenu } from './CanvasContextMenu'
import { EmptyState } from './EmptyState'
import { AlignmentGuides } from './AlignmentGuides'
import { NodeTextEditor } from './NodeTextEditor'
import { ConnectMenu } from './ConnectMenu'

// 类型表在模块级定义（SPEC §3.4）
const nodeTypes = { dsShape: DsShapeNode }
const edgeTypes = { dsEdge: DsEdge }

function GridLayers() {
  const grid = useDocumentStore((s) => s.doc.settings.grid)
  if (!grid) return null
  return (
    <>
      <Background id="fine" variant={BackgroundVariant.Lines} gap={24} color="var(--grid-fine)" />
      <Background id="coarse" variant={BackgroundVariant.Lines} gap={120} color="var(--grid-coarse)" />
    </>
  )
}

function Overlays() {
  const doc = useDocumentStore((s) => s.doc)
  const plugin = useMemo(() => getPlugin(doc.type), [doc.type])
  const editingNodeId = useCanvasStore((s) => s.editingNodeId)
  const setEditingNode = useCanvasStore((s) => s.setEditingNode)
  const connectMenu = useCanvasStore((s) => s.connectMenu)
  const setConnectMenu = useCanvasStore((s) => s.setConnectMenu)
  const empty = Object.keys(doc.nodes).length === 0
  const editingNode = editingNodeId ? (doc.nodes[editingNodeId] ?? null) : null
  return (
    <>
      <AlignmentGuides />
      {empty && <EmptyState />}
      {editingNode && <NodeTextEditor node={editingNode} onDone={() => setEditingNode(null)} />}
      {connectMenu && (
        <ConnectMenu menu={connectMenu} plugin={plugin} onClose={() => setConnectMenu(null)} />
      )}
    </>
  )
}

function FlowInner() {
  const doc = useDocumentStore((s) => s.doc)
  const plugin = useMemo(() => getPlugin(doc.type), [doc.type])
  const tool = useUiStore((s) => s.tool)
  const minimapVisible = useUiStore((s) => s.minimapVisible)
  const { rfProps, wrapperRef, drop } = useCanvasWiring(doc, plugin)

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
          <ReactFlow {...rfProps} nodeTypes={nodeTypes} edgeTypes={edgeTypes}>
            <GridLayers />
            {minimapVisible && <MiniMap className="ds-minimap" pannable zoomable />}
            <PeerCursors />
          </ReactFlow>
        </div>
      </CanvasContextMenu>
      <Overlays />
    </div>
  )
}

export default function EditorCanvas() {
  return <FlowInner />
}
