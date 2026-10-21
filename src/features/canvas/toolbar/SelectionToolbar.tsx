// 选中节点时的浮动工具条（React Flow NodeToolbar：屏幕空间、不随缩放变形、拖动时跟随）。
// 单选 → 节点工具条；多选 → 对齐/分布工具条。文字编辑与拖动中隐藏，避免遮挡。
import { NodeToolbar, Position, useStore } from '@xyflow/react'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { getPlugin } from '@/plugins/registry'
import { zh } from '@/i18n/zh'
import { NodeToolbarContent } from './NodeToolbarContent'
import { MultiToolbarContent } from './MultiToolbarContent'

export function SelectionToolbar() {
  const sel = useUiStore((s) => s.selection)
  const textEditing = useUiStore((s) => s.textEditing)
  const node = useDocumentStore((s) =>
    sel.nodeIds.length === 1 ? s.doc.nodes[sel.nodeIds[0]] : undefined,
  )
  const type = useDocumentStore((s) => s.doc.type)
  const dragging = useStore((s) => s.nodes.some((n) => n.dragging))
  const ids = sel.nodeIds
  if (ids.length === 0 || textEditing || dragging) return null
  if (ids.length === 1 && !node) return null
  return (
    <NodeToolbar nodeId={ids} isVisible position={Position.Top} offset={14}>
      <div className="ds-float ds-toolbar" role="toolbar" aria-label={zh.toolbar.label}>
        {node ? (
          <NodeToolbarContent node={node} plugin={getPlugin(type)} />
        ) : (
          <MultiToolbarContent ids={ids} />
        )}
      </div>
    </NodeToolbar>
  )
}
