// 自定义节点 'dsShape'：形状本体由插件 ShapeDef.render 渲染（策略模式），
// 这里只负责注入主题解析后的 CSS 变量、连接锚点、选中框与 CAD 缩放夹点。
import { memo, useMemo, type CSSProperties } from 'react'
import { NodeResizer, type NodeProps } from '@xyflow/react'
import type { ShapeRenderContext } from '@/core/plugin'
import type { DiagramNode } from '@/core/model/types'
import { resizeNode } from '@/core/commands/ops'
import type { FlowNodeData } from '@/store/selectors'
import type { ReactPlugin } from '@/plugins/registry'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { useCanvasStore } from './canvasStore'
import { nodeTextColor, resolveNodeColor } from './color'
import { ShapeHandles } from './ShapeHandles'

// 交互层最小尺寸（命令层不约束，见 DECISIONS）
const MIN_W = 32
const MIN_H = 24

function DsShapeNode({ id, data, selected, width, height, dragging }: NodeProps) {
  const { node, plugin } = data as FlowNodeData as unknown as {
    node: DiagramNode
    plugin: ReactPlugin
  }
  const theme = useUiStore((s) => s.resolvedTheme)
  const editing = useCanvasStore((s) => s.editingNodeId === id)
  const isDropTarget = useCanvasStore((s) => s.dropTargetId === id)
  const execute = useDocumentStore((s) => s.execute)

  // 渲染期尺寸以 RF 实测为准（resize 拖动中即时反馈），文档尺寸是兜底
  const liveNode: DiagramNode = useMemo(
    () =>
      width && height && (width !== node.size.w || height !== node.size.h)
        ? { ...node, size: { w: width, h: height } }
        : node,
    [node, width, height],
  )

  const ctx: ShapeRenderContext = useMemo(
    () => ({ editing, dispatch: execute }),
    [editing, execute],
  )

  const shape = plugin.shapes.find((s) => s.kind === node.kind)

  const vars = {
    '--node-fill': resolveNodeColor(node.style.fill, theme),
    '--node-stroke': resolveNodeColor(node.style.stroke, theme),
    '--node-text': nodeTextColor(theme),
  } as CSSProperties

  const cls = [
    'ds-node',
    selected ? 'is-selected' : '',
    isDropTarget ? 'is-drop-target' : '',
    dragging ? 'is-dragging' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={cls}
      style={vars}
      role="group"
      aria-label={node.text || shape?.name || node.kind}
    >
      <NodeResizer
        isVisible={!!selected && !editing}
        minWidth={MIN_W}
        minHeight={MIN_H}
        handleClassName="ds-grip"
        lineClassName="ds-resize-line"
        onResizeEnd={(_e, p) =>
          execute(resizeNode(id, { x: p.x, y: p.y }, { w: p.width, h: p.height }))
        }
      />
      <div className="ds-node-body">
        {shape ? shape.render(liveNode, ctx) : <FallbackShape node={liveNode} />}
      </div>
      <ShapeHandles />
    </div>
  )
}

/** 插件中没有对应 kind（例如换插件后残留）时的兜底外观 */
function FallbackShape({ node }: { node: DiagramNode }) {
  return (
    <svg
      width={node.size.w}
      height={node.size.h}
      viewBox={`0 0 ${node.size.w} ${node.size.h}`}
      aria-hidden
    >
      <rect
        width={node.size.w}
        height={node.size.h}
        fill="var(--node-fill)"
        stroke="var(--node-stroke)"
        strokeWidth={node.style.strokeWidth}
      />
      <text
        x={node.size.w / 2}
        y={node.size.h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={node.style.fontSize}
        fill="var(--node-text)"
      >
        {node.text || node.kind}
      </text>
    </svg>
  )
}

// immer 产出的 doc 中未变节点保持引用相等：仅当 node/选中/拖放标记变化才重渲染
export default memo(DsShapeNode, (prev, next) => {
  const a = prev.data as FlowNodeData
  const b = next.data as FlowNodeData
  return (
    a.node === b.node &&
    prev.selected === next.selected &&
    prev.width === next.width &&
    prev.height === next.height &&
    prev.dragging === next.dragging
  )
})
