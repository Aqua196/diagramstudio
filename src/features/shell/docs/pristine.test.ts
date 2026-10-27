// 没动过的空白文档回收：新建后直接离开 → 删除；有过编辑 → 保留。
import { beforeEach, describe, expect, it } from 'vitest'
import { addNode } from '@/core/commands/ops'
import { createDoc, createNode } from '@/core/model/factories'
import { useDocumentStore } from '@/store/documentStore'
import { getStoredDoc, saveDoc } from '@/core/io/persist'
import { discardPristine, markPristine, watchPristine } from './pristine'

beforeEach(() => localStorage.clear())

describe('pristine', () => {
  it('未编辑就离开：从存储中删除', () => {
    const doc = createDoc('flowchart')
    saveDoc(doc)
    useDocumentStore.getState().setDoc(doc)
    markPristine(doc.id)
    discardPristine()
    expect(getStoredDoc(doc.id)).toBeNull()
  })

  it('有过一次编辑：保留', () => {
    const stop = watchPristine()
    const doc = createDoc('flowchart')
    saveDoc(doc)
    useDocumentStore.getState().setDoc(doc)
    markPristine(doc.id)
    useDocumentStore.getState().execute(addNode(createNode('process', { x: 0, y: 0 })))
    discardPristine()
    expect(getStoredDoc(doc.id)).not.toBeNull()
    stop()
  })
})
