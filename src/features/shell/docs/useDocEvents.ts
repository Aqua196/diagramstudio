// 文档管理与 IO 事件监听（IMPL_CONTRACT §5 EV 表 home/io 行）：
// 新建/打开/重命名/副本/删除/保存/导入导出，事件 → localStorage + setDoc。
import { useEffect } from 'react'
import { EV, type EvName } from '@/core/events'
import { docToJson, jsonToDoc } from '@/core/io/serialize'
import { docToMermaid } from '@/core/io/mermaid'
import { importMermaidText } from '@/core/io/importer'
import { createDoc, createId } from '@/core/model/factories'
import type { DiagramDoc, DiagramType } from '@/core/model/types'
import { useDocumentStore } from '@/store/documentStore'
import { useCollabStore } from '@/store/collabStore'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'
import {
  buildNewDoc,
  deleteStoredDoc,
  duplicateStoredDoc,
  importDocJson,
  renameStoredDoc,
  saveDoc,
  setLastOpened,
  getStoredDoc,
} from './docsStore'

const SAVE_DEBOUNCE_MS = 500

function download(filename: string, text: string, mime: string): void {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: mime }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function openDocInEditor(doc: DiagramDoc): void {
  useDocumentStore.getState().setDoc(doc)
  setLastOpened(doc.id)
  useUiStore.getState().setRoute('editor')
  useUiStore.getState().setSelection({ nodeIds: [], edgeIds: [] })
}

function toast(kind: 'info' | 'success' | 'error', text: string): void {
  useUiStore.getState().pushToast(kind, text)
}

async function readFile(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = async () => {
      const f = input.files?.[0]
      resolve(f ? await f.text() : null)
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}

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
    const exportJson = () => {
      const doc = useDocumentStore.getState().doc
      download(`${doc.title || zh.io.fileDiagram}.json`, docToJson(doc), 'application/json')
      toast('success', zh.io.exportedJson)
    }
    const exportMermaid = () => {
      const doc = useDocumentStore.getState().doc
      if (doc.type !== 'flowchart') {
        toast('error', zh.io.mermaidFlowchartOnly)
        return
      }
      download(`${doc.title || zh.io.fileDiagram}.mmd`, docToMermaid(doc), 'text/plain')
      toast('success', zh.io.exportedMermaid)
    }
    const importJson = async () => {
      const text = await readFile('.json,application/json')
      if (text === null) return
      const parsed = jsonToDoc(text)
      if (!parsed.ok) {
        toast('error', `${zh.io.importFailed}：${parsed.errors[0] ?? zh.errors.importInvalid}`)
        return
      }
      const imported = importDocJson(parsed.doc)
      if (!imported.ok) {
        toast('error', `${zh.io.importFailed}：${imported.errors[0]}`)
        return
      }
      saveDoc(imported.doc)
      openDocInEditor(imported.doc)
      toast('success', zh.io.importDone)
    }
    // Mermaid 导入（A3）：走 importer.ts 统一拼 doc（dagre 摆位），这里只管文件与提示
    const importMermaid = async () => {
      const text = await readFile('.mmd,.mermaid,text/plain')
      if (text === null) return
      const r = importMermaidText(text, {
        title: zh.io.importedDocTitle,
        emptyError: zh.errors.importInvalid,
      })
      if (!r.ok || !r.doc) {
        toast('error', `${zh.io.importFailed}：${r.errors[0] ?? zh.errors.importInvalid}`)
        return
      }
      saveDoc(r.doc)
      openDocInEditor(r.doc)
      toast(
        'success',
        r.skipped
          ? `${zh.io.importDone}（${r.skipped} ${zh.io.skippedLines}）`
          : zh.io.importDone,
      )
    }
    // 分享（A2）：share() 建房并把 ?room= 写进地址栏，链接进剪贴板
    const share = async () => {
      const link = useCollabStore.getState().share()
      window.history.replaceState(null, '', link)
      try {
        await navigator.clipboard.writeText(link)
        toast('success', zh.collab.linkCopied)
      } catch {
        toast('info', link)
      }
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
      [EV.SHARE, () => void share()],
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
