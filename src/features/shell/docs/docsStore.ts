// 文档持久化（localStorage）：docs map + 索引 + 最近打开。
// 阶段4 提供文档管理入口；导入导出阶段复用同一存储层。
import { createDoc, createId } from '@/core/model/factories'
import type { DiagramDoc, DiagramType } from '@/core/model/types'
import { validateDoc } from '@/core/model/schema'
import { getPlugin } from '@/plugins/registry'

export const DOCS_KEY = 'ds.docs.v1'
export const INDEX_KEY = 'ds.docIndex.v1'
export const LAST_DOC_KEY = 'ds.lastDoc.v1'
const UNTITLED = '未命名图表'

export interface DocIndexEntry {
  id: string
  title: string
  type: DiagramType
  updatedAt: number
}

type DocsMap = Record<string, DiagramDoc>

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
}

function writeIndex(map: DocsMap): void {
  const index: DocIndexEntry[] = Object.values(map)
    .map((d) => ({ id: d.id, title: d.title, type: d.type, updatedAt: d.updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
  localStorage.setItem(INDEX_KEY, JSON.stringify(index))
}

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

/** 保存文档并刷新索引；返回更新后的索引 */
export function saveDoc(doc: DiagramDoc): void {
  const map = readMap()
  map[doc.id] = doc
  writeMap(map)
  writeIndex(map)
}

export function deleteStoredDoc(id: string): void {
  const map = readMap()
  delete map[id]
  writeMap(map)
  writeIndex(map)
  if (localStorage.getItem(LAST_DOC_KEY) === id) localStorage.removeItem(LAST_DOC_KEY)
}

export function renameStoredDoc(id: string, title: string): void {
  const map = readMap()
  const doc = map[id]
  if (!doc) return
  map[id] = { ...doc, title, updatedAt: Date.now() }
  writeMap(map)
  writeIndex(map)
}

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
  writeIndex(map)
  return copy
}

/**
 * 新建文档：templateId 支持模板索引（"0"）或模板自身 id。
 * 模板实例化时重新生成 id/时间戳，避免与模板撞车。
 */
export function buildNewDoc(type: DiagramType, templateId?: string): DiagramDoc {
  const plugin = getPlugin(type)
  const tpl =
    plugin.templates.find((t) => t.id === templateId) ??
    (templateId !== undefined ? plugin.templates[Number(templateId)] : undefined)
  if (!tpl) return plugin.createBlank?.(UNTITLED) ?? createDoc(type, UNTITLED)
  const doc = structuredClone(tpl)
  doc.id = createId()
  doc.createdAt = Date.now()
  doc.updatedAt = Date.now()
  return doc
}

/** 导入的 JSON 对象 → 校验后的文档（新 id，避免覆盖同名文档） */
export function importDocJson(
  parsed: unknown,
): { ok: true; doc: DiagramDoc } | { ok: false; errors: string[] } {
  const r = validateDoc(parsed)
  if (!r.ok) return { ok: false, errors: r.errors }
  r.doc.id = createId()
  return { ok: true, doc: r.doc }
}

export function lastOpenedId(): string | null {
  return localStorage.getItem(LAST_DOC_KEY)
}

export function setLastOpened(id: string | null): void {
  if (id) localStorage.setItem(LAST_DOC_KEY, id)
  else localStorage.removeItem(LAST_DOC_KEY)
}
