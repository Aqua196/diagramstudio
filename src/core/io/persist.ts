// 文档本地持久化（SPEC §5）：全部存 localStorage，完全离线。
// ds.docs.v1 按 id 存整份文档对象，ds.docIndex.v1 存首页列表用的元信息，ds.lastDoc.v1 记最近打开的文档。
// 本模块是唯一的存储实现：外壳层（文档管理、导航、启动）都调这里，不各写一份。
import type { DiagramDoc, DiagramType } from '../model/types'
import { createId } from '../model/factories'

export const DOCS_KEY = 'ds.docs.v1'
export const INDEX_KEY = 'ds.docIndex.v1'
export const LAST_DOC_KEY = 'ds.lastDoc.v1'

export interface DocIndexEntry {
  id: string
  title: string
  type: DiagramType
  updatedAt: number
}

type DocsMap = Record<string, DiagramDoc>

/** 读不出来（被清理、写坏、隐私模式）一律当作空，不抛错 */
function readMap(): DocsMap {
  try {
    const raw = localStorage.getItem(DOCS_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as DocsMap) : {}
  } catch {
    return {}
  }
}

function writeMap(map: DocsMap): void {
  localStorage.setItem(DOCS_KEY, JSON.stringify(map))
  const index: DocIndexEntry[] = Object.values(map)
    .map((d) => ({ id: d.id, title: d.title, type: d.type, updatedAt: d.updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
  localStorage.setItem(INDEX_KEY, JSON.stringify(index))
}

/** 首页列表用的元信息，按最近修改倒序 */
export function listDocs(): DocIndexEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as DocIndexEntry[]) : []
  } catch {
    return []
  }
}

export function getStoredDoc(id: string): DiagramDoc | null {
  return readMap()[id] ?? null
}

/** 全部已存文档，按最近修改倒序（首页缩略图一次读完，避免逐个解析整张表） */
export function listStoredDocs(): DiagramDoc[] {
  return Object.values(readMap()).sort((a, b) => b.updatedAt - a.updatedAt)
}

/** 保存文档并刷新索引 */
export function saveDoc(doc: DiagramDoc): void {
  const map = readMap()
  map[doc.id] = doc
  writeMap(map)
}

export function deleteStoredDoc(id: string): void {
  const map = readMap()
  delete map[id]
  writeMap(map)
  if (localStorage.getItem(LAST_DOC_KEY) === id) localStorage.removeItem(LAST_DOC_KEY)
}

export function renameStoredDoc(id: string, title: string): void {
  const map = readMap()
  const doc = map[id]
  if (!doc) return
  map[id] = { ...doc, title, updatedAt: Date.now() }
  writeMap(map)
}

/** 创建副本：新 id、标题加「副本」；原文档不存在时返回 null */
export function duplicateStoredDoc(id: string): DiagramDoc | null {
  const map = readMap()
  const src = map[id]
  if (!src) return null
  const copy = structuredClone(src)
  copy.id = createId()
  copy.title = `${src.title} 副本`
  copy.createdAt = Date.now()
  copy.updatedAt = Date.now()
  map[copy.id] = copy
  writeMap(map)
  return copy
}

export function lastOpenedId(): string | null {
  return localStorage.getItem(LAST_DOC_KEY)
}

export function setLastOpened(id: string | null): void {
  if (id) localStorage.setItem(LAST_DOC_KEY, id)
  else localStorage.removeItem(LAST_DOC_KEY)
}
