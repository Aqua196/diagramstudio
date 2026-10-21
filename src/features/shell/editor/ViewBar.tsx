// 左下：撤销/重做（提示里带操作名）· 缩放组（−、百分比=回到 100%、+、适应画面）。
import { Maximize, Minus, Plus, Redo2, Undo2 } from 'lucide-react'
import { emit, EV } from '@/core/events'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'
import { IconButton } from '@/components/IconButton'
import { Tip } from '@/components/Tip'
import { keyLabel } from '@/components/kbd'

export function ViewBar() {
  const canUndo = useDocumentStore((s) => s.canUndo)
  const canRedo = useDocumentStore((s) => s.canRedo)
  const undoLabel = useDocumentStore((s) => s.undoLabel)
  const redoLabel = useDocumentStore((s) => s.redoLabel)
  const undo = useDocumentStore((s) => s.undo)
  const redo = useDocumentStore((s) => s.redo)
  const zoom = useUiStore((s) => s.zoom)
  return (
    <div className="ds-float ds-corner ds-corner-bl">
      <IconButton
        icon={<Undo2 size={17} />}
        label={undoLabel ? `${zh.common.undo}：${undoLabel}` : zh.common.undo}
        aria-label={zh.common.undo}
        kbd={keyLabel('Ctrl+Z')}
        tipSide="top"
        disabled={!canUndo}
        onClick={undo}
      />
      <IconButton
        icon={<Redo2 size={17} />}
        label={redoLabel ? `${zh.common.redo}：${redoLabel}` : zh.common.redo}
        aria-label={zh.common.redo}
        kbd={keyLabel('Ctrl+Shift+Z')}
        tipSide="top"
        disabled={!canRedo}
        onClick={redo}
      />
      <span className="ds-sep" />
      <IconButton
        icon={<Minus size={16} />}
        label={zh.editor.zoomOut}
        kbd={keyLabel('Ctrl+-')}
        tipSide="top"
        onClick={() => emit(EV.ZOOM_OUT)}
      />
      <Tip label={zh.editor.zoomReset} side="top">
        <button
          type="button"
          className="ds-zoom-val"
          aria-label={zh.editor.zoomReset}
          onClick={() => emit(EV.ZOOM_RESET)}
        >
          {Math.round(zoom * 100)}%
        </button>
      </Tip>
      <IconButton
        icon={<Plus size={16} />}
        label={zh.editor.zoomIn}
        kbd={keyLabel('Ctrl+=')}
        tipSide="top"
        onClick={() => emit(EV.ZOOM_IN)}
      />
      <IconButton
        icon={<Maximize size={15} />}
        label={zh.editor.fitView}
        kbd={keyLabel('Ctrl+0')}
        tipSide="top"
        onClick={() => emit(EV.FIT)}
      />
    </div>
  )
}
