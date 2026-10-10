// 快捷键总线：把键盘事件翻译成 EV.* 派发（IMPL_CONTRACT §5）；
// 撤销/重做直接调 store（不在 EV 表中）。文字编辑中让行按键。
import { useEffect } from 'react'
import { emit, EV } from '@/core/events'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'

export interface ShortcutRow {
  keys: string
  label: string
  group: 'tools' | 'edit' | 'view' | 'arrange'
}

/** 快捷键帮助对话框的完整清单（与下方总线一一对应） */
export const SHORTCUT_ROWS: ShortcutRow[] = [
  { keys: 'V', label: zh.shortcuts.selTool, group: 'tools' },
  { keys: 'H', label: zh.shortcuts.handTool, group: 'tools' },
  { keys: 'Space', label: zh.shortcuts.pan, group: 'tools' },
  { keys: 'Enter', label: zh.shortcuts.editText, group: 'edit' },
  { keys: 'Ctrl+A', label: zh.shortcuts.selectAll, group: 'edit' },
  { keys: 'Ctrl+C', label: zh.shortcuts.copy, group: 'edit' },
  { keys: 'Ctrl+X', label: zh.shortcuts.cut, group: 'edit' },
  { keys: 'Ctrl+V', label: zh.shortcuts.paste, group: 'edit' },
  { keys: 'Ctrl+D', label: zh.shortcuts.duplicate, group: 'edit' },
  { keys: 'Delete', label: zh.shortcuts.del, group: 'edit' },
  { keys: 'Ctrl+Z', label: zh.shortcuts.undo, group: 'edit' },
  { keys: 'Ctrl+Shift+Z / Ctrl+Y', label: zh.shortcuts.redo, group: 'edit' },
  { keys: 'Ctrl+S', label: zh.shortcuts.save, group: 'edit' },
  { keys: 'Esc', label: zh.shortcuts.deselect, group: 'edit' },
  { keys: 'Ctrl+0', label: zh.shortcuts.fit, group: 'view' },
  { keys: 'Ctrl+=', label: zh.shortcuts.zoomIn, group: 'view' },
  { keys: 'Ctrl+-', label: zh.shortcuts.zoomOut, group: 'view' },
  { keys: '?', label: zh.shortcuts.help, group: 'view' },
  { keys: 'Shift+L', label: zh.shortcuts.autoLayout, group: 'arrange' },
  { keys: ']', label: zh.shortcuts.zFront, group: 'arrange' },
  { keys: '[', label: zh.shortcuts.zBack, group: 'arrange' },
  { keys: '←→↑↓', label: zh.shortcuts.nudge, group: 'arrange' },
  { keys: 'Shift+←→↑↓', label: zh.shortcuts.nudgeFast, group: 'arrange' },
]

export const SHORTCUT_GROUPS: Record<ShortcutRow['group'], string> = {
  tools: zh.shortcuts.groupTools,
  edit: zh.shortcuts.groupEdit,
  view: zh.shortcuts.groupView,
  arrange: zh.shortcuts.groupArrange,
}

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

export function useGlobalShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUiStore.getState()
      const mod = e.ctrlKey || e.metaKey

      // Ctrl+S 在输入框里也生效（保存不影响输入）
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        emit(EV.SAVE)
        return
      }
      if (ui.textEditing || isTyping(e.target)) return

      if (mod) {
        const k = e.key.toLowerCase()
        const doc = useDocumentStore.getState()
        if (k === 'a') emit(EV.SELECT_ALL)
        else if (k === 'c') emit(EV.COPY)
        else if (k === 'x') emit(EV.CUT)
        else if (k === 'v') emit(EV.PASTE)
        else if (k === 'd') emit(EV.DUPLICATE)
        else if (k === 'z') (e.shiftKey ? doc.redo : doc.undo)()
        else if (k === 'y') doc.redo()
        else if (k === '0') emit(EV.FIT)
        else if (k === '=' || k === '+') emit(EV.ZOOM_IN)
        else if (k === '-') emit(EV.ZOOM_OUT)
        else return
        e.preventDefault()
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        emit(EV.DELETE)
      } else if (e.key === 'v' || e.key === 'V') emit(EV.SET_TOOL, 'select')
      else if (e.key === 'h' || e.key === 'H') emit(EV.SET_TOOL, 'hand')
      else if (e.key === '?') emit(EV.SHOW_SHORTCUTS)
      else if (e.key === '[') emit(EV.Z_BACK)
      else if (e.key === ']') emit(EV.Z_FRONT)
      else if (e.key === 'L' && e.shiftKey) {
        emit(EV.AUTO_LAYOUT, useDocumentStore.getState().doc.settings.layoutDirection)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
