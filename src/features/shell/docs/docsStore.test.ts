// 文档持久化：索引排序、改名/副本/删除、模板实例化、导入校验。
import { beforeEach, describe, expect, it } from 'vitest'
import { createDoc } from '@/core/model/factories'
import { docToJson } from '@/core/io/serialize'
import { getPlugin } from '@/plugins/registry'
import {
  buildNewDoc,
  deleteStoredDoc,
  duplicateStoredDoc,
  importDocJson,
  listDocs,
  renameStoredDoc,
  saveDoc,
  getStoredDoc,
} from './docsStore'

beforeEach(() => localStorage.clear())

describe('docsStore', () => {
  it('保存后索引按 updatedAt 降序', () => {
    const a = createDoc('flowchart', 'A')
    const b = createDoc('mindmap', 'B')
    a.updatedAt = 100
    b.updatedAt = 200
    saveDoc(a)
    saveDoc(b)
    const idx = listDocs()
    expect(idx[0].id).toBe(b.id)
    expect(idx[1].id).toBe(a.id)
    expect(getStoredDoc(a.id)?.title).toBe('A')
  })

  it('重命名刷新标题与 updatedAt', () => {
    const d = createDoc('er', 'old')
    saveDoc(d)
    renameStoredDoc(d.id, 'new')
    expect(getStoredDoc(d.id)?.title).toBe('new')
    expect(listDocs()[0].title).toBe('new')
  })

  it('副本生成新 id 且后缀「副本」', () => {
    const d = createDoc('flowchart', 'F')
    saveDoc(d)
    const copy = duplicateStoredDoc(d.id)!
    expect(copy.id).not.toBe(d.id)
    expect(copy.title).toBe('F 副本')
    expect(listDocs()).toHaveLength(2)
  })

  it('删除后文档与索引同时消失', () => {
    const d = createDoc('mindmap')
    saveDoc(d)
    deleteStoredDoc(d.id)
    expect(getStoredDoc(d.id)).toBeNull()
    expect(listDocs()).toHaveLength(0)
  })

  it('buildNewDoc 模板实例化：继承模板内容与标题、重发 id', () => {
    const d = buildNewDoc('flowchart', '0')
    const tpl = getPlugin('flowchart').templates[0]
    expect(d.title).toBe(tpl.title)
    expect(Object.keys(d.nodes)).toHaveLength(Object.keys(tpl.nodes).length)
    const again = buildNewDoc('flowchart', '0')
    expect(again.id).not.toBe(d.id)
    expect(again.id).not.toBe(tpl.id)
    // 无模板参数 → 空文档
    expect(Object.keys(buildNewDoc('er').nodes)).toHaveLength(0)
  })

  it('importDocJson 校验失败给出 errors，成功时重发 id', () => {
    expect(importDocJson({ nope: 1 }).ok).toBe(false)
    const d = createDoc('flowchart', 'X')
    const r = importDocJson(JSON.parse(docToJson(d)))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.doc.id).not.toBe(d.id)
      expect(r.doc.title).toBe('X')
    }
  })
})
