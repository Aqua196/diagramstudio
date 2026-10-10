// 画布本地按键：方向键微调、Enter 进入文字编辑、Esc 取消选择、插件 keymap。
// EV 表内的快捷键由外壳快捷键总线派发（IMPL_CONTRACT §5）。
import { useEffect, useRef } from 'react'
import { emit, type EvName } from '@/core/events'
import type { DiagramPlugin } from '@/core/plugin'
import type { DiagramDoc } from '@/core/model/types'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { useCanvasStore } from './canvasStore'
import { arrowDelta } from './guides'
import { nudgeNodes } from './commands'

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

interface Deps {
  selectIds: (nodeIds: string[], edgeIds: string[]) => void
}

export function useCanvasKeys(doc: DiagramDoc, plugin: DiagramPlugin, deps: Deps): void {
  const docRef = useRef(doc)
  const pluginRef = useRef(plugin)
  docRef.current = doc
  pluginRef.current = plugin

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUiStore.getState()
      if (ui.textEditing || isTypingTarget(e.target)) return
      const sel = ui.selection
      const d = docRef.current
      const p = pluginRef.current

      // 插件专属按键（思维导图 Tab/Enter 等）优先；返回命令则执行并吞掉按键
      const pluginHandler = p.keymap?.[e.key]
      if (pluginHandler) {
        const cmd = pluginHandler({
          doc: d,
          selection: sel,
          dispatchEvent: (name, detail) => emit(name as EvName, detail),
        })
        if (cmd) {
          e.preventDefault()
          useDocumentStore.getState().execute(cmd)
          return
        }
      }

      const dPos = arrowDelta(e.key, e.shiftKey ? 10 : 1)
      if (dPos && sel.nodeIds.length > 0) {
        e.preventDefault()
        useDocumentStore.getState().execute(nudgeNodes(sel.nodeIds, dPos.x, dPos.y))
        return
      }

      if (e.key === 'Enter' && sel.nodeIds.length === 1 && sel.edgeIds.length === 0) {
        e.preventDefault()
        useCanvasStore.getState().setEditingNode(sel.nodeIds[0])
        ui.setTextEditing(true)
        return
      }

      if (e.key === 'Escape') {
        deps.selectIds([], [])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
