// 顶栏中段：图类型分段 + 撤销/重做 + 缩放组（C1 从 TopBar 拆出）。
import { Maximize, Minus, Plus, Redo2, Undo2 } from 'lucide-react'
import { useReactFlow } from '@xyflow/react'
import type { DiagramType } from '@/core/model/types'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'
import { IconButton } from '@/components/IconButton'
import { setDocType } from '@/features/canvas/commands'

const TYPES: DiagramType[] = ['flowchart', 'mindmap', 'er']

export function TypeSegment() {
  const type = useDocumentStore((s) => s.doc.type)
  const execute = useDocumentStore((s) => s.execute)
  return (
    <div className="ds-segment" role="group" aria-label={zh.topbar.docType}>
      {TYPES.map((t) => (
        <button
          key={t}
          type="button"
          className={`ds-segment-btn${type === t ? ' is-active' : ''}`}
          onClick={() => type !== t && execute(setDocType(t))}
        >
          {zh.plugins.typeNames[t]}
        </button>
      ))}
    </div>
  )
}

export function UndoRedo() {
  const canUndo = useDocumentStore((s) => s.canUndo)
  const canRedo = useDocumentStore((s) => s.canRedo)
  const undoLabel = useDocumentStore((s) => s.undoLabel)
  const redoLabel = useDocumentStore((s) => s.redoLabel)
  const undo = useDocumentStore((s) => s.undo)
  const redo = useDocumentStore((s) => s.redo)
  return (
    <>
      <IconButton
        icon={<Undo2 size={15} />}
        aria-label={zh.common.undo}
        title={undoLabel ? `${zh.common.undo}：${undoLabel}` : zh.topbar.undoEmpty}
        disabled={!canUndo}
        onClick={undo}
      />
      <IconButton
        icon={<Redo2 size={15} />}
        aria-label={zh.common.redo}
        title={redoLabel ? `${zh.common.redo}：${redoLabel}` : zh.topbar.redoEmpty}
        disabled={!canRedo}
        onClick={redo}
      />
    </>
  )
}

export function ZoomGroup() {
  const rf = useReactFlow()
  const zoom = useUiStore((s) => s.zoom)
  return (
    <div className="ds-zoom-group" role="group" aria-label={zh.topbar.zoomReset}>
      <button
        type="button"
        className="ds-icon-btn"
        aria-label={zh.topbar.zoomOut}
        onClick={() => rf.zoomOut({ duration: 120 })}
      >
        <Minus size={14} />
      </button>
      <button
        type="button"
        className="ds-zoom-val"
        aria-label={zh.topbar.zoomReset}
        title={zh.topbar.zoomReset}
        onClick={() => rf.zoomTo(1, { duration: 120 })}
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        className="ds-icon-btn"
        aria-label={zh.topbar.zoomIn}
        onClick={() => rf.zoomIn({ duration: 120 })}
      >
        <Plus size={14} />
      </button>
      <button
        type="button"
        className="ds-icon-btn"
        aria-label={zh.topbar.fitView}
        title={zh.topbar.fitView}
        onClick={() => rf.fitView({ duration: 200, padding: 0.15 })}
      >
        <Maximize size={14} />
      </button>
    </div>
  )
}
