// ER 模板（B6）：图书管理系统 —— 读者/图书/借阅记录/出版社/分类 + 鸟脚基数。
import { createDoc, createEdge, createId, createNode } from '@/core/model/factories'
import type { DiagramDoc, ErField } from '@/core/model/types'
import { zh } from '@/i18n/zh'
import { HEAD_H, ROW_H } from './erEntity'

type F = [name: string, type: string, key?: 'pk' | 'fk']

const field = ([name, type, key]: F): ErField => ({
  id: createId(),
  name,
  type,
  pk: key === 'pk' || undefined,
  fk: key === 'fk' || undefined,
})

export function erTemplate(): DiagramDoc {
  const doc = createDoc('er', zh.templates.er)
  const mk = (text: string, x: number, y: number, fields: F[]) => {
    const n = createNode(
      'entity',
      { x, y },
      { w: 210, h: HEAD_H + fields.length * ROW_H + ROW_H },
      text,
    )
    n.data = { fields: fields.map(field) }
    return n
  }
  const reader = mk('读者', 40, 60, [
    ['reader_id', 'int', 'pk'],
    ['name', 'varchar'],
    ['phone', 'varchar'],
    ['card_no', 'varchar'],
  ])
  const book = mk('图书', 560, 40, [
    ['book_id', 'int', 'pk'],
    ['isbn', 'varchar'],
    ['title', 'varchar'],
    ['author', 'varchar'],
    ['publisher_id', 'int', 'fk'],
    ['category_id', 'int', 'fk'],
  ])
  const loan = mk('借阅记录', 300, 320, [
    ['loan_id', 'int', 'pk'],
    ['reader_id', 'int', 'fk'],
    ['book_id', 'int', 'fk'],
    ['borrow_date', 'date'],
    ['due_date', 'date'],
    ['return_date', 'date'],
  ])
  const publisher = mk('出版社', 860, 60, [
    ['publisher_id', 'int', 'pk'],
    ['name', 'varchar'],
    ['address', 'varchar'],
  ])
  const category = mk('分类', 860, 300, [
    ['category_id', 'int', 'pk'],
    ['name', 'varchar'],
  ])
  for (const n of [reader, book, loan, publisher, category]) doc.nodes[n.id] = n
  doc.zOrder = [reader.id, book.id, loan.id, publisher.id, category.id]
  const card = { arrowEnd: 'none' as const }
  const edges = [
    createEdge(reader.id, loan.id, { ...card, cardinality: { source: '1', target: '0..N' } }),
    createEdge(book.id, loan.id, { ...card, cardinality: { source: '1', target: '0..N' } }),
    createEdge(publisher.id, book.id, { ...card, cardinality: { source: '1', target: '0..N' } }),
    createEdge(category.id, book.id, { ...card, cardinality: { source: '1', target: '0..N' } }),
  ]
  for (const e of edges) doc.edges[e.id] = e
  return doc
}
