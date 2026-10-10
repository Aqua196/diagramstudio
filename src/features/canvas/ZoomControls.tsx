// 画布顶栏浮层：缩放控件（−/百分比/＋/适应画面）。
import { Panel, useReactFlow } from '@xyflow/react'
import { Maximize, Minus, Plus } from 'lucide-react'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'

export function ZoomControls() {
  const zoom = useUiStore((s) => s.zoom)
  const rf = useReactFlow()
  return (
    <Panel position="top-center" className="ds-zoom-controls">
      <button
        type="button"
        className="ds-zoom-btn"
        aria-label={zh.common.zoomOut}
        onClick={() => rf.zoomOut({ duration: 120 })}
      >
        <Minus size={14} />
      </button>
      <button
        type="button"
        className="ds-zoom-value"
        aria-label={zh.canvas.zoomReset}
        title={zh.canvas.zoomReset}
        onClick={() => rf.zoomTo(1, { duration: 120 })}
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        className="ds-zoom-btn"
        aria-label={zh.common.zoomIn}
        onClick={() => rf.zoomIn({ duration: 120 })}
      >
        <Plus size={14} />
      </button>
      <button
        type="button"
        className="ds-zoom-btn"
        aria-label={zh.common.fitView}
        onClick={() => rf.fitView({ duration: 200, padding: 0.15 })}
      >
        <Maximize size={14} />
      </button>
    </Panel>
  )
}
