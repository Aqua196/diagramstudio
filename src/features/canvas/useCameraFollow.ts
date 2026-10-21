// 镜头跟随：内容跑出视野时把它带回来。
// - 开始编辑某个节点（Tab/「+」新加的、Enter 编辑的）而它被浮动条挡住或在视野外：平移到刚好露出
// - 自动布局后整张图超出视野：与节点滑动同时把镜头缩放到新布局
// 只在确有溢出时才动，视野里本来就能看全则镜头不动。
import { useEffect } from 'react'
import type { ReactFlowInstance } from '@xyflow/react'
import { motionAllowed } from '@/components/motion'
import type { DiagramDoc } from '@/core/model/types'
import { useDocumentStore } from '@/store/documentStore'
import { useCanvasStore } from './canvasStore'

type Rect = { x: number; y: number; w: number; h: number }

/** 四周浮动条占掉的屏幕像素（上：顶栏，左：形状坞，下：底栏与提示） */
const SAFE = { top: 72, right: 24, bottom: 76, left: 84 }

/** 当前视野里不被浮动条挡住的区域（流程坐标） */
function safeView(rf: ReactFlowInstance): Rect | null {
  const el = document.querySelector<HTMLElement>('.ds-canvas .react-flow')
  if (!el) return null
  const r = el.getBoundingClientRect()
  const a = rf.screenToFlowPosition({ x: r.left + SAFE.left, y: r.top + SAFE.top })
  const b = rf.screenToFlowPosition({ x: r.right - SAFE.right, y: r.bottom - SAFE.bottom })
  return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y }
}

export function docBounds(doc: DiagramDoc, ids?: string[]): Rect | null {
  const nodes = (ids ?? Object.keys(doc.nodes)).map((id) => doc.nodes[id]).filter(Boolean)
  if (nodes.length === 0) return null
  const x = Math.min(...nodes.map((n) => n.position.x))
  const y = Math.min(...nodes.map((n) => n.position.y))
  const w = Math.max(...nodes.map((n) => n.position.x + n.size.w)) - x
  const h = Math.max(...nodes.map((n) => n.position.y + n.size.h)) - y
  return { x, y, w, h }
}

const overflow = (b: Rect, v: Rect, slack: number) =>
  b.x < v.x - slack || b.y < v.y - slack || b.x + b.w > v.x + v.w + slack || b.y + b.h > v.y + v.h + slack

const duration = (ms: number) => (motionAllowed() ? ms : 0)

/** 自动布局之后调用：新布局溢出视野时把全图放进浮动条之间的安全区（与节点滑动同时进行）。
 *  只缩小或平移，不放大：小图布局后不该突然被放大到几倍 */
export function followLayout(rf: ReactFlowInstance, doc: DiagramDoc): void {
  const b = docBounds(doc)
  const v = safeView(rf)
  const el = document.querySelector<HTMLElement>('.ds-canvas .react-flow')
  if (!b || !v || !el || !overflow(b, v, 24)) return
  const pad = 24
  const availW = el.clientWidth - SAFE.left - SAFE.right - pad * 2
  const availH = el.clientHeight - SAFE.top - SAFE.bottom - pad * 2
  const zoom = Math.max(0.1, Math.min(rf.getZoom(), availW / b.w, availH / b.h))
  const x = SAFE.left + pad + (availW - b.w * zoom) / 2 - b.x * zoom
  const y = SAFE.top + pad + (availH - b.h * zoom) / 2 - b.y * zoom
  void rf.setViewport({ x, y, zoom }, { duration: duration(360) })
}

/** 把 rect 平移进安全区所需的最小位移（流程坐标；放不下时对齐左上） */
function nudgeInto(b: Rect, v: Rect): { dx: number; dy: number } {
  const axis = (lo: number, size: number, vlo: number, vsize: number) => {
    if (size > vsize || lo < vlo) return lo - vlo
    if (lo + size > vlo + vsize) return lo + size - (vlo + vsize)
    return 0
  }
  return { dx: axis(b.x, b.w, v.x, v.w), dy: axis(b.y, b.h, v.y, v.h) }
}

function reveal(rf: ReactFlowInstance, id: string): void {
  const b = docBounds(useDocumentStore.getState().doc, [id])
  const v = safeView(rf)
  if (!b || !v) return
  const pad = 16 / rf.getZoom()
  const { dx, dy } = nudgeInto({ x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 }, v)
  if (dx === 0 && dy === 0) return
  const vp = rf.getViewport()
  void rf.setViewport({ x: vp.x - dx * vp.zoom, y: vp.y - dy * vp.zoom, zoom: vp.zoom }, { duration: duration(280) })
}

/** 开始编辑的节点不在安全区内时平移镜头。稍等一下再算：思维导图加子主题后的自动布局
 *  在下一个 effect 才写回，要用布局后的落点 */
export function useRevealEditing(rf: ReactFlowInstance): void {
  useEffect(() => {
    let t = 0
    const unsub = useCanvasStore.subscribe((s, prev) => {
      const id = s.editingNodeId
      if (!id || id === prev.editingNodeId) return
      window.clearTimeout(t)
      t = window.setTimeout(() => reveal(rf, id), 30)
    })
    return () => {
      unsub()
      window.clearTimeout(t)
    }
  }, [rf])
}
