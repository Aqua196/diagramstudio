// 画布（IMPL_CONTRACT §6）：默认导出 <EditorCanvas/>，无 props。
// 文档→元素经 store 选择器派生；拖动/框选等瞬态在 RF 内部，松手才提交命令。
// hook 接线在 useCanvasWiring（C1），这里只做 JSX 布局。
import { useMemo } from 'react'
import { Background, BackgroundVariant, MiniMap, ReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './canvas.css'

import { getPlugin } from '@/plugins/registry'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'

import DsShapeNode from './DsShapeNode'
import DsEdge from './DsEdge'
import { useCanvasStore } from './canvasStore'
import { useCanvasWiring } from './useCanvasWiring'
import { PeerCursors } from './PeerCursors'
import { CanvasContextMenu } from './CanvasContextMenu'
import { EmptyState } from './EmptyState'
import { AlignmentGuides } from './AlignmentGuides'
import { ConnectMenu } from './ConnectMenu'
import { SelectionToolbar } from './toolbar/SelectionToolbar'

// 类型表在模块级定义（SPEC §3.4）
const nodeTypes = { dsShape: DsShapeNode }
const edgeTypes = { dsEdge: DsEdge }

/** 点阵网格：24px 间距，比方格线安静，吸附仍按 12px */
function GridLayer() {
  const grid = useDocumentStore((s) => s.doc.settings.grid)
  if (!grid) return null
  return (
    <Background id="dots" variant={BackgroundVariant.Dots} gap={24} size={1.6} color="var(--dot)" />
  )
}

function Overlays() {
  const doc = useDocumentStore((s) => s.doc)
  const plugin = useMemo(() => getPlugin(doc.type), [doc.type])
  const connectMenu = useCanvasStore((s) => s.connectMenu)
  const setConnectMenu = useCanvasStore((s) => s.setConnectMenu)
  const empty = Object.keys(doc.nodes).length === 0
  return (
    <>
      <AlignmentGuides />
      {empty && <EmptyState />}
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
  const manySelected = useUiStore((s) => s.selection.nodeIds.length > 30)
  const { rfProps, wrapperRef, drop } = useCanvasWiring(doc, plugin)

  return (
    <div
      ref={wrapperRef}
      className="ds-canvas"
      data-tool={tool}
      data-many-selected={manySelected || undefined}
      onDrop={drop.onDrop}
      onDragOver={drop.onDragOver}
      onDoubleClick={drop.onDoubleClick}
      onPointerDownCapture={drop.onPointerDown}
    >
      <CanvasContextMenu>
        <div className="ds-canvas-flow">
          <ReactFlow {...rfProps} nodeTypes={nodeTypes} edgeTypes={edgeTypes}>
            <GridLayer />
            {minimapVisible && (
              <MiniMap
                className="ds-minimap"
                pannable
                zoomable
                position="bottom-right"
                ariaLabel={zh.editor.minimap}
              />
            )}
            <PeerCursors />
            <SelectionToolbar />
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
