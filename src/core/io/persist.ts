// 文档本地持久化（SPEC §5）：全部存 localStorage，完全离线。
// 索引 ds.docIndex.v1 存元信息，正文 ds.docs.v1 按 id 存 JSON。
import type { DiagramDoc, DiagramType } from '../model/types'
import { createDoc } from '../model/factories'
import { docToJson, jsonToDoc } from './serialize'

const DOCS_KEY = 'ds.docs.v1'
const INDEX_KEY = 'ds.docIndex.v1'

export interface DocMeta {
  id: string
  title: string
  type: DiagramType
  updatedAt: number
  nodeCount: number
  edgeCount: number
}

function readDocs(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(DOCS_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

function readIndex(): DocMeta[] {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]') as DocMeta[]
  } catch {
    return []
  }
}

function writeAll(docs: Record<string, string>, index: DocMeta[]): void {
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs))
  localStorage.setItem(INDEX_KEY, JSON.stringify(index))
}

export function listDocs(): DocMeta[] {
  return readIndex().sort((a, b) => b.updatedAt - a.updatedAt)
}

export function loadDoc(id: string): DiagramDoc | null {
  const raw = readDocs()[id]
  if (!raw) return null
  const r = jsonToDoc(raw)
  return r.ok ? r.doc : null
}

export function saveDoc(doc: DiagramDoc): void {
  const docs = readDocs()
  docs[doc.id] = docToJson(doc)
  const meta: DocMeta = {
    id: doc.id,
    title: doc.title,
    type: doc.type,
    updatedAt: doc.updatedAt,
    nodeCount: Object.keys(doc.nodes).length,
    edgeCount: Object.keys(doc.edges).length,
  }
  const index = readIndex().filter((m) => m.id !== doc.id)
  index.push(meta)
  writeAll(docs, index)
}

export function deleteDoc(id: string): void {
  const docs = readDocs()
  delete docs[id]
  writeAll(docs, readIndex().filter((m) => m.id !== id))
}

export function renameDoc(id: string, title: string): DiagramDoc | null {
  const doc = loadDoc(id)
  if (!doc) return null
  const next = { ...doc, title, updatedAt: Date.now() }
  saveDoc(next)
  return next
}

export function duplicateDoc(id: string): DiagramDoc | null {
  const doc = loadDoc(id)
  if (!doc) return null
  const copy: DiagramDoc = {
    ...doc,
    id: crypto.randomUUID(),
    title: `${doc.title} 副本`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  saveDoc(copy)
  return copy
}

export function newDoc(type: DiagramType, title?: string): DiagramDoc {
  const doc = createDoc(type, title)
  saveDoc(doc)
  return doc
}
