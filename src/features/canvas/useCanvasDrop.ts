// 形状进入画布的三条路：拖入（dataTransfer 约定见 dnd.ts）、双击空白、形状坞点击（EV.ADD_SHAPE）。
// 插件可接管放置（placeFromPalette，如思维导图挂到所选主题下）；否则落点/视口中心建节点，
// 之后选中并进入文字编辑。
import {
  useCallback,
  useEffect,
  useRef,
  type DragEvent,
  type MouseEvent,
  type RefObject,
} from 'react'
import { useReactFlow } from '@xyflow/react'
import { addNode } from '@/core/commands/ops'
import { EV } from '@/core/events'
import type { DiagramPlugin } from '@/core/plugin'
import type { DiagramDoc, DiagramNode, Point } from '@/core/model/types'
import { useUiStore } from '@/store/uiStore'
import { getShapeDragData, DND_SHAPE_MIME } from './dnd'
import { executeAndFocus } from './focus'
import { createShapeNode } from './nodeFactory'

const CASCADE = 32

function overlaps(a: DiagramNode, doc: DiagramDoc): boolean {
  return Object.values(doc.nodes).some(
    (b) =>
      a.position.x < b.position.x + b.size.w &&
      a.position.x + a.size.w > b.position.x &&
      a.position.y < b.position.y + b.size.h &&
      a.position.y + a.size.h > b.position.y,
  )
}

/** 视口中心放置：与已有节点重叠时沿对角线错开，最多 12 次 */
function placeFree(plugin: DiagramPlugin, doc: DiagramDoc, kind: string, center: Point) {
  let node = createShapeNode(plugin, kind, center, doc.settings.snap)
  for (let i = 1; node && i <= 12 && overlaps(node, doc); i++) {
    node = createShapeNode(
      plugin,
      kind,
      { x: center.x + i * CASCADE, y: center.y + i * CASCADE },
      doc.settings.snap,
    )
  }
  return node
}

export function useCanvasDrop(
  doc: DiagramDoc,
  plugin: DiagramPlugin,
  containerRef: RefObject<HTMLDivElement | null>,
) {
  const rf = useReactFlow()
  const docRef = useRef(doc)
  const pluginRef = useRef(plugin)
  docRef.current = doc
  pluginRef.current = plugin

  /** 统一入口：screen=null 表示放到视口中心（形状坞） */
  const addShape = useCallback(
    (kind: string | null, screen: Point | null, free: boolean) => {
      const p = pluginRef.current
      const d = docRef.current
      const k = kind ?? p.shapes.find((s) => !s.paletteHidden)?.kind ?? null
      if (!k) return
      const delegated = p.placeFromPalette?.(d, k, useUiStore.getState().selection)
      if (delegated) {
        executeAndFocus(delegated)
        return
      }
      const rect = containerRef.current?.getBoundingClientRect()
      const at =
        screen ?? (rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null)
      if (!at) return
      const center = rf.screenToFlowPosition(at)
      const node = free
        ? placeFree(p, d, k, center)
        : createShapeNode(p, k, center, d.settings.snap)
      if (node) executeAndFocus(addNode(node), { edit: free })
    },
    [rf, containerRef],
  )

  useEffect(() => {
    const onAdd = (e: Event) =>
      addShape((e as CustomEvent<{ kind: string }>).detail.kind, null, true)
    window.addEventListener(EV.ADD_SHAPE, onAdd)
    return () => window.removeEventListener(EV.ADD_SHAPE, onAdd)
  }, [addShape])

  const onDragOver = useCallback((e: DragEvent) => {
    if (e.dataTransfer.types.includes(DND_SHAPE_MIME)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const onDrop = useCallback(
    (e: DragEvent) => {
      const kind = getShapeDragData(e.dataTransfer)
      if (!kind) return
      e.preventDefault()
      addShape(kind, { x: e.clientX, y: e.clientY }, false)
    },
    [addShape],
  )

  // 双击空白放一个默认形状节点并直接编辑文字（RF 的双击缩放已关闭，见 useCanvasWiring）
  const onDoubleClick = useCallback(
    (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!t.closest('.react-flow__pane')) return
      if (t.closest('.react-flow__node') || t.closest('.ds-connect-menu')) return
      const p = pluginRef.current
      const kind = p.shapes.find((s) => !s.paletteHidden)?.kind ?? null
      const delegated = kind ? p.placeFromPalette?.(docRef.current, kind, { nodeIds: [] }) : null
      if (delegated) executeAndFocus(delegated)
      else if (kind) {
        const node = createShapeNode(
          p,
          kind,
          rf.screenToFlowPosition({ x: e.clientX, y: e.clientY }),
          docRef.current.settings.snap,
        )
        if (node) executeAndFocus(addNode(node))
      }
    },
    [rf],
  )

  return { onDragOver, onDrop, onDoubleClick }
}
