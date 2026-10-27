// 持久化层：localStorage 读写的全部路径（SPEC §5，离线可用）。
import { beforeEach, describe, expect, it } from 'vitest'
import { createDoc, createNode } from '../model/factories'
import {
  deleteStoredDoc,
  duplicateStoredDoc,
  getStoredDoc,
  lastOpenedId,
  listDocs,
  listStoredDocs,
  renameStoredDoc,
  saveDoc,
  setLastOpened,
} from './persist'

beforeEach(() => localStorage.clear())

describe('persist', () => {
  it('保存后读回内容一致，索引按 updatedAt 倒序', () => {
    const a = createDoc('flowchart', 'A')
    const n = createNode('process', { x: 10, y: 20 })
    a.nodes[n.id] = n
    a.zOrder = [n.id]
    a.updatedAt = 100
    const b = createDoc('mindmap', 'B')
    b.updatedAt = 200
    saveDoc(a)
    saveDoc(b)
    expect(listDocs().map((m) => m.id)).toEqual([b.id, a.id])
    expect(listStoredDocs().map((d) => d.id)).toEqual([b.id, a.id])
    expect(getStoredDoc(a.id)!.nodes[n.id].position).toEqual({ x: 10, y: 20 })
  })

  it('重命名刷新标题与索引', () => {
    const d = createDoc('er', 'old')
    saveDoc(d)
    renameStoredDoc(d.id, 'new')
    expect(getStoredDoc(d.id)?.title).toBe('new')
    expect(listDocs()[0].title).toBe('new')
  })

  it('副本生成新 id 且后缀「副本」；不存在的 id 返回 null', () => {
    const d = createDoc('flowchart', 'F')
    saveDoc(d)
    const copy = duplicateStoredDoc(d.id)!
    expect(copy.id).not.toBe(d.id)
    expect(copy.title).toBe('F 副本')
    expect(listDocs()).toHaveLength(2)
    expect(duplicateStoredDoc('nope')).toBeNull()
  })

  it('删除后文档与索引同时消失，并清掉指向它的「最近打开」', () => {
    const d = createDoc('mindmap')
    saveDoc(d)
    setLastOpened(d.id)
    expect(lastOpenedId()).toBe(d.id)
    deleteStoredDoc(d.id)
    expect(getStoredDoc(d.id)).toBeNull()
    expect(listDocs()).toHaveLength(0)
    expect(lastOpenedId()).toBeNull()
  })

  it('损坏的 localStorage 数据回退为空而非抛错', () => {
    localStorage.setItem('ds.docs.v1', '{bad json')
    localStorage.setItem('ds.docIndex.v1', 'not json')
    expect(listDocs()).toEqual([])
    expect(getStoredDoc('x')).toBeNull()
    expect(listStoredDocs()).toEqual([])
  })
})
