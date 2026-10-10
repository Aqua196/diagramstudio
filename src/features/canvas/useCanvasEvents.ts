// EV.* 跨模块事件监听（IMPL_CONTRACT §5）：菜单/顶栏/快捷键只 dispatch，
// 这里统一落成命令或视图操作。所有文档变更一律 execute(command)。
import { useEffect, useRef, type RefObject } from 'react'
import { useReactFlow } from '@xyflow/react'
import { EV } from '@/core/events'
import type { Command } from '@/core/commands/command'
import {
  alignNodes,
  bringToFront,
  deleteElements,
  distributeNodes,
  insertElements,
  sendToBack,
  type AlignMode,
} from '@/core/commands/ops'
import type { DiagramPlugin } from '@/core/plugin'
import type { DiagramDoc } from '@/core/model/types'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { buildDuplicate, buildPaste, copySelection } from './clipboard'
import { animateLayout, buildLayoutCommand } from './layout'

interface Deps {
  containerRef: RefObject<HTMLDivElement | null>
  selectIds: (nodeIds: string[], edgeIds: string[]) => void
  visibleNodeIds: () => string[]
}

export function useCanvasEvents(doc: DiagramDoc, plugin: DiagramPlugin, deps: Deps): void {
  const docRef = useRef(doc)
  const pluginRef = useRef(plugin)
  docRef.current = doc
  pluginRef.current = plugin
  const rf = useReactFlow()
  const rfRef = useRef(rf)
  rfRef.current = rf

  useEffect(() => {
    const execute = (cmd: Command) => useDocumentStore.getState().execute(cmd)
    const sel = () => useUiStore.getState().selection
    const { containerRef, selectIds, visibleNodeIds } = deps

    const handlers: Array<[string, (e: Event) => void]> = [
      [
        EV.SELECT_ALL,
        () => {
          const d = docRef.current
          selectIds(visibleNodeIds(), Object.keys(d.edges))
        },
      ],
      [
        EV.COPY,
        () => {
          copySelection(docRef.current, sel().nodeIds)
        },
      ],
      [
        EV.CUT,
        () => {
          const s = sel()
          const d = docRef.current
          const p = pluginRef.current
          const nodeIds = p.expandDeletion ? p.expandDeletion(d, s.nodeIds) : s.nodeIds
          if (copySelection(d, s.nodeIds)) {
            execute(deleteElements(nodeIds, s.edgeIds))
            selectIds([], [])
          }
        },
      ],
      [
        EV.PASTE,
        () => {
          const payload = buildPaste()
          if (!payload) return
          execute(insertElements(payload.nodes, payload.edges, '粘贴'))
          selectIds(
            payload.nodes.map((n) => n.id),
            payload.edges.map((e) => e.id),
          )
        },
      ],
      [
        EV.DUPLICATE,
        () => {
          const s = sel()
          if (s.nodeIds.length === 0) return
          const { nodes, edges } = buildDuplicate(docRef.current, s.nodeIds)
          execute(insertElements(nodes, edges, '创建副本'))
          selectIds(
            nodes.map((n) => n.id),
            edges.map((e) => e.id),
          )
        },
      ],
      [
        EV.DELETE,
        () => {
          const s = sel()
          const d = docRef.current
          const p = pluginRef.current
          const nodeIds = p.expandDeletion ? p.expandDeletion(d, s.nodeIds) : s.nodeIds
          if (nodeIds.length + s.edgeIds.length === 0) return
          execute(deleteElements(nodeIds, s.edgeIds))
          selectIds([], [])
        },
      ],
      [
        EV.Z_FRONT,
        () => {
          if (sel().nodeIds.length) execute(bringToFront(sel().nodeIds))
        },
      ],
      [
        EV.Z_BACK,
        () => {
          if (sel().nodeIds.length) execute(sendToBack(sel().nodeIds))
        },
      ],
      [
        EV.ALIGN,
        (e) => {
          const mode = (e as CustomEvent).detail as AlignMode
          const s = sel()
          if (s.nodeIds.length >= 2) execute(alignNodes(docRef.current, s.nodeIds, mode))
        },
      ],
      [
        EV.DISTRIBUTE,
        (e) => {
          const axis = (e as CustomEvent).detail as 'h' | 'v'
          const s = sel()
          if (s.nodeIds.length >= 3) execute(distributeNodes(docRef.current, s.nodeIds, axis))
        },
      ],
      [
        EV.AUTO_LAYOUT,
        (e) => {
          const dir = (e as CustomEvent).detail as 'TB' | 'LR' | undefined
          const d = docRef.current
          const cmd = buildLayoutCommand(d, pluginRef.current, dir ?? d.settings.layoutDirection)
          if (cmd) {
            execute(cmd)
            animateLayout(containerRef.current)
          }
        },
      ],
      [EV.FIT, () => rfRef.current.fitView({ duration: 200, padding: 0.15 })],
      [EV.ZOOM_IN, () => rfRef.current.zoomIn({ duration: 120 })],
      [EV.ZOOM_OUT, () => rfRef.current.zoomOut({ duration: 120 })],
      [EV.ZOOM_RESET, () => rfRef.current.zoomTo(1, { duration: 120 })],
    ]

    for (const [name, fn] of handlers) window.addEventListener(name, fn)
    return () => {
      for (const [name, fn] of handlers) window.removeEventListener(name, fn)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 思维导图等 autoLayoutOnChange 插件（B1）：
  // execute（加子/改父级等）→ 布局命令 mergeWithPrevious 并入上一条历史；
  // undo/redo/remote 跳过；'set'（打开/导入/模板）直接写回位置不进历史。
  useEffect(() => {
    const p = pluginRef.current
    if (!p?.autoLayoutOnChange) return
    const d = docRef.current
    if (Object.keys(d.nodes).length === 0) return
    const change = useDocumentStore.getState().lastChange
    if (change === 'undo' || change === 'redo' || change === 'remote') return
    if (change === 'set') {
      // 打开文档/模板时把布局位置直接写回（不进历史，触发的二次 'set' 不会再排）
      const next = p.layout(d, { direction: d.settings.layoutDirection })
      let moved = false
      const nodes = { ...d.nodes }
      for (const [id, pos] of Object.entries(next)) {
        const n = nodes[id]
        if (n && (Math.abs(n.position.x - pos.x) > 0.5 || Math.abs(n.position.y - pos.y) > 0.5)) {
          nodes[id] = { ...n, position: { ...pos } }
          moved = true
        }
      }
      if (moved) {
        useDocumentStore.getState().setDoc({ ...d, nodes }, { resetHistory: false })
      }
      return
    }
    const cmd = buildLayoutCommand(d, p, d.settings.layoutDirection)
    if (cmd) {
      useDocumentStore.getState().execute({ ...cmd, mergeWithPrevious: true })
      animateLayout(deps.containerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc])
}
