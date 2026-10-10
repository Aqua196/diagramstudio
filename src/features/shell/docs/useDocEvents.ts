// 文档管理与 IO 事件监听（IMPL_CONTRACT §5 EV 表 home/io 行）：
// 新建/打开/重命名/副本/删除/保存/导入导出，事件 → localStorage + setDoc。
// IO 处理器在 docIoHandlers.ts，导航/toast 助手在 docNav.ts（C1 拆分）。
import { useEffect } from 'react'
import { EV, type EvName } from '@/core/events'
import { createDoc, createId } from '@/core/model/factories'
import type { DiagramType } from '@/core/model/types'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'
import { openDocInEditor, toast } from './docNav'
import {
  buildNewDoc,
  deleteStoredDoc,
  duplicateStoredDoc,
  getStoredDoc,
  renameStoredDoc,
  saveDoc,
} from './docsStore'
import {
  exportJson,
  exportMermaid,
  importJson,
  importMermaid,
  shareDoc,
} from './docIoHandlers'

const SAVE_DEBOUNCE_MS = 500

/** 挂载一次：文档事件 + 自动保存订阅（防抖 500ms） */
export function useDocEvents(): void {
  useEffect(() => {
    const ui = useUiStore.getState

    const newDoc = (e: Event) => {
      const detail = (e as CustomEvent).detail as { type: DiagramType; templateId?: string }
      const doc = buildNewDoc(detail.type, detail.templateId)
      saveDoc(doc)
      openDocInEditor(doc)
    }
    const openDoc = (e: Event) => {
      const { id } = (e as CustomEvent).detail as { id: string }
      const doc = getStoredDoc(id)
      if (doc) openDocInEditor(doc)
    }
    const renameDoc = (e: Event) => {
      const { id, title } = (e as CustomEvent).detail as { id: string; title: string }
      renameStoredDoc(id, title)
      const cur = useDocumentStore.getState().doc
      if (cur.id === id) useDocumentStore.getState().setDoc({ ...cur, title })
    }
    const dupDoc = (e: Event) => {
      const { id } = (e as CustomEvent).detail as { id: string }
      if (duplicateStoredDoc(id)) toast('success', zh.common.duplicate)
    }
    const delDoc = (e: Event) => {
      const { id } = (e as CustomEvent).detail as { id: string }
      deleteStoredDoc(id)
      if (useDocumentStore.getState().doc.id === id) {
        useDocumentStore.getState().setDoc(createDoc('flowchart'))
      }
    }
    const save = () => {
      const doc = useDocumentStore.getState().doc
      saveDoc(doc)
      ui().setLastSavedAt(Date.now())
      toast('success', zh.io.saved)
    }
    const showShortcuts = () => ui().setShortcutsHelpOpen(true)
    const setTool = (e: Event) => {
      const t = (e as CustomEvent).detail as 'select' | 'hand'
      if (t === 'select' || t === 'hand') ui().setTool(t)
    }

    const handlers: Array<[EvName, (e: Event) => void]> = [
      [EV.NEW_DOC, newDoc],
      [EV.OPEN_DOC, openDoc],
      [EV.RENAME_DOC, renameDoc],
      [EV.DUPLICATE_DOC, dupDoc],
      [EV.DELETE_DOC, delDoc],
      [EV.SAVE, save],
      [EV.EXPORT_JSON, exportJson],
      [EV.EXPORT_MERMAID, exportMermaid],
      [EV.IMPORT_JSON, () => void importJson()],
      [EV.IMPORT_MERMAID, () => void importMermaid()],
      [EV.SHARE, () => void shareDoc()],
      [EV.SHOW_SHORTCUTS, showShortcuts],
      [EV.SET_TOOL, setTool],
    ]
    for (const [n, fn] of handlers) window.addEventListener(n, fn)

    // 自动保存：doc 变化防抖 500ms 落盘（仅编辑器路由下）
    let timer: ReturnType<typeof setTimeout> | null = null
    const unsub = useDocumentStore.subscribe((s, prev) => {
      if (s.doc === prev.doc) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        saveDoc(useDocumentStore.getState().doc)
        useUiStore.getState().setLastSavedAt(Date.now())
      }, SAVE_DEBOUNCE_MS)
    })

    return () => {
      for (const [n, fn] of handlers) window.removeEventListener(n, fn)
      unsub()
      if (timer) clearTimeout(timer)
    }
  }, [])
}

export { createId }
