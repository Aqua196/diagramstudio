// 对齐参考线渲染：1px accent 直线，流程坐标 → 屏幕坐标换算用当前视口。
import { useViewport } from '@xyflow/react'
import { useCanvasStore } from './canvasStore'

export function AlignmentGuides() {
  const guides = useCanvasStore((s) => s.guides)
  const { x, y, zoom } = useViewport()
  if (guides.v.length === 0 && guides.h.length === 0) return null
  return (
    <div className="ds-guides" aria-hidden>
      {guides.v.map((gx) => (
        <div key={`v${gx}`} className="ds-guide ds-guide-v" style={{ left: gx * zoom + x }} />
      ))}
      {guides.h.map((gy) => (
        <div key={`h${gy}`} className="ds-guide ds-guide-h" style={{ top: gy * zoom + y }} />
      ))}
    </div>
  )
}
