// 连线交互：onConnect 落一条 addEdge 命令；拖到空白处松手弹形状菜单
// （新节点与连线合成一条命令）；同一节点禁止自连。
import { useCallback, useRef, type RefObject } from 'react'
import { useReactFlow, type Connection, type FinalConnectionState } from '@xyflow/react'
import { addEdge } from '@/core/commands/ops'
import { createEdge } from '@/core/model/factories'
import type { DiagramPlugin } from '@/core/plugin'
import type { DiagramDoc } from '@/core/model/types'
import { useDocumentStore } from '@/store/documentStore'
import { useCanvasStore } from './canvasStore'

export function useConnectFlow(
  doc: DiagramDoc,
  plugin: DiagramPlugin,
  wrapperRef: RefObject<HTMLDivElement | null>,
) {
  const rf = useReactFlow()
  const docRef = useRef(doc)
  const pluginRef = useRef(plugin)
  docRef.current = doc
  pluginRef.current = plugin

  const onConnect = useCallback((conn: Connection) => {
    if (!conn.source || !conn.target || conn.source === conn.target) return
    const p = pluginRef.current
    const edge = createEdge(conn.source, conn.target, {
      sourceHandle: conn.sourceHandle ?? undefined,
      targetHandle: conn.targetHandle ?? undefined,
      routing: p.edgeDefaults.routing,
      arrowStart: p.edgeDefaults.arrowStart,
      arrowEnd: p.edgeDefaults.arrowEnd,
      style: { ...p.edgeDefaults.style },
    })
    useDocumentStore.getState().execute(addEdge(edge))
  }, [])

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, cs: FinalConnectionState) => {
      // 已落到节点/手柄上 → onConnect 已处理；无起点则忽略
      if (cs.toNode || !cs.fromNode) return
      const wrapper = wrapperRef.current
      const point = 'clientX' in event ? event : event.changedTouches[0]
      if (!wrapper || !point) return
      const rect = wrapper.getBoundingClientRect()
      const flow = rf.screenToFlowPosition({ x: point.clientX, y: point.clientY })
      useCanvasStore.getState().setConnectMenu({
        x: point.clientX - rect.left,
        y: point.clientY - rect.top,
        flowX: flow.x,
        flowY: flow.y,
        fromNodeId: cs.fromNode.id,
        fromHandleId: cs.fromHandle?.id ?? null,
        fromIsSource: cs.fromHandle?.type !== 'target',
      })
    },
    [rf, wrapperRef],
  )

  const isValidConnection = useCallback(
    (c: Connection | { source: string | null; target: string | null }) =>
      !!c.source && !!c.target && c.source !== c.target,
    [],
  )

  return { onConnect, onConnectEnd, isValidConnection }
}
