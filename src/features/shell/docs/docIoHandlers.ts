// IO 事件处理器（C1 从 useDocEvents 拆出）：JSON/Mermaid 导入导出、分享。
// 与文档管理解耦：仅依赖 docsStore/序列化/importer + toast/openDocInEditor。
import { docToJson, jsonToDoc } from '@/core/io/serialize'
import { docToMermaid } from '@/core/io/mermaid'
import { importMermaidText } from '@/core/io/importer'
import { useDocumentStore } from '@/store/documentStore'
import { useCollabStore } from '@/store/collabStore'
import { zh } from '@/i18n/zh'
import { openDocInEditor, toast } from './docNav'
import { importDocJson, saveDoc } from './docsStore'

function download(filename: string, text: string, mime: string): void {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: mime }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
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

export function exportJson(): void {
  const doc = useDocumentStore.getState().doc
  download(`${doc.title || zh.io.fileDiagram}.json`, docToJson(doc), 'application/json')
  toast('success', zh.io.exportedJson)
}

export function exportMermaid(): void {
  const doc = useDocumentStore.getState().doc
  if (doc.type !== 'flowchart') {
    toast('error', zh.io.mermaidFlowchartOnly)
    return
  }
  download(`${doc.title || zh.io.fileDiagram}.mmd`, docToMermaid(doc), 'text/plain')
  toast('success', zh.io.exportedMermaid)
}

export async function importJson(): Promise<void> {
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
export async function importMermaid(): Promise<void> {
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
    r.skipped ? `${zh.io.importDone}（${r.skipped} ${zh.io.skippedLines}）` : zh.io.importDone,
  )
}

// 分享（A2）：share() 建房并把 ?room= 写进地址栏，链接进剪贴板
export async function shareDoc(): Promise<void> {
  const link = useCollabStore.getState().share()
  window.history.replaceState(null, '', link)
  try {
    await navigator.clipboard.writeText(link)
    toast('success', zh.collab.linkCopied)
  } catch {
    toast('info', link)
  }
}
