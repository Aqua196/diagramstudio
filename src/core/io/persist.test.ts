// 持久化层：localStorage 读写的全部路径（SPEC §5，离线可用）。
import { beforeEach, describe, expect, it } from 'vitest'
import { createDoc, createNode } from '../model/factories'
import {
  deleteDoc,
  duplicateDoc,
  listDocs,
  loadDoc,
  newDoc,
  renameDoc,
  saveDoc,
} from './persist'

beforeEach(() => {
  localStorage.clear()
})

describe('persist', () => {
  it('newDoc + loadDoc 往返保持内容', () => {
    const doc = newDoc('flowchart', '流程一')
    const n = createNode('process', { x: 10, y: 20 })
    doc.nodes[n.id] = n
    doc.zOrder = [n.id]
    saveDoc(doc)
    const back = loadDoc(doc.id)
    expect(back).not.toBeNull()
    expect(back!.title).toBe('流程一')
    expect(Object.keys(back!.nodes)).toContain(n.id)
    expect(back!.nodes[n.id].position).toEqual({ x: 10, y: 20 })
  })

  it('listDocs 按 updatedAt 倒序，含节点/边数', () => {
    const a = newDoc('flowchart', 'A')
    const b = newDoc('mindmap', 'B')
    saveDoc({ ...b, updatedAt: a.updatedAt + 1 })
    const list = listDocs()
    expect(list[0].id).toBe(b.id)
    expect(list[0].type).toBe('mindmap')
    expect(list[0].nodeCount).toBe(0)
  })

  it('renameDoc / deleteDoc / duplicateDoc', () => {
    const doc = newDoc('er', 'E')
    const renamed = renameDoc(doc.id, 'E2')
    expect(renamed!.title).toBe('E2')
    expect(loadDoc(doc.id)!.title).toBe('E2')

    const copy = duplicateDoc(doc.id)!
    expect(copy.id).not.toBe(doc.id)
    expect(copy.title).toBe('E2 副本')
    expect(listDocs().map((m) => m.id)).toContain(copy.id)

    deleteDoc(doc.id)
    expect(loadDoc(doc.id)).toBeNull()
    expect(listDocs().map((m) => m.id)).not.toContain(doc.id)
    // 不存在的 id 返回 null，不抛错
    expect(renameDoc('nope', 'x')).toBeNull()
    expect(duplicateDoc('nope')).toBeNull()
  })

  it('损坏的 localStorage 数据回退为空而非抛错', () => {
    localStorage.setItem('ds.docs.v1', '{bad json')
    localStorage.setItem('ds.docIndex.v1', 'not json')
    expect(listDocs()).toEqual([])
    expect(loadDoc('x')).toBeNull()
    localStorage.setItem('ds.docs.v1', JSON.stringify({ x: '{"not":"a doc"}' }))
    expect(loadDoc('x')).toBeNull()
  })
})
