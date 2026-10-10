// 形状拖入画布与双击空白放节点：dataTransfer 约定见 dnd.ts，
// 落点经 screenToFlowPosition 换算，吸附开启时对齐 12px 网格。
import { useCallback, useRef, type DragEvent, type MouseEvent } from 'react'
import { useReactFlow } from '@xyflow/react'
import { addNode } from '@/core/commands/ops'
import { createNode } from '@/core/model/factories'
import type { DiagramPlugin } from '@/core/plugin'
import type { DiagramDoc } from '@/core/model/types'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { getShapeDragData, DND_SHAPE_MIME } from './dnd'

const SNAP = 12

export function useCanvasDrop(doc: DiagramDoc, plugin: DiagramPlugin) {
  const rf = useReactFlow()
  const docRef = useRef(doc)
  const pluginRef = useRef(plugin)
  docRef.current = doc
  pluginRef.current = plugin

  const addShapeAt = useCallback(
    (kind: string | null, clientX: number, clientY: number) => {
      const p = pluginRef.current
      const shape = (kind && p.shapes.find((s) => s.kind === kind)) || p.shapes[0]
      if (!shape) return
      const { w, h } = shape.defaultSize
      const snap = docRef.current.settings.snap ? SNAP : 1
      const pos = rf.screenToFlowPosition({ x: clientX, y: clientY })
      const node = createNode(
        shape.kind,
        {
          x: Math.round((pos.x - w / 2) / snap) * snap,
          y: Math.round((pos.y - h / 2) / snap) * snap,
        },
        { w, h },
      )
      useDocumentStore.getState().execute(addNode(node))
      useUiStore.getState().setSelection({ nodeIds: [node.id], edgeIds: [] })
    },
    [rf],
  )

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
      addShapeAt(kind, e.clientX, e.clientY)
    },
    [addShapeAt],
  )

  // 双击空白放一个默认形状节点（SPEC §6 空画布提示的对应行为）
  const onDoubleClick = useCallback(
    (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!t.closest('.react-flow__pane')) return
      if (t.closest('.react-flow__node') || t.closest('.ds-connect-menu')) return
      addShapeAt(null, e.clientX, e.clientY)
    },
    [addShapeAt],
  )

  return { onDragOver, onDrop, onDoubleClick }
}
