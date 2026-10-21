// ER 模板（B6）：图书管理系统 —— 读者/图书/借阅记录/出版社/分类 + 鸟脚基数。
// 布局：读者—借阅记录—图书—出版社 一行中线对齐，分类在图书正下方，关系线全部横平竖直。
import { createDoc, createEdge, createId, createNode } from '@/core/model/factories'
import type { DiagramDoc, ErField } from '@/core/model/types'
import { zh } from '@/i18n/zh'
import { HEAD_H, ROW_H } from './erEntity'

const ROW_CY = 110

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
  // cy = 实体竖直中心，保证同一行的关系线水平对齐
  const mk = (text: string, x: number, cy: number, fields: F[]) => {
    const h = HEAD_H + fields.length * ROW_H + ROW_H
    const n = createNode('entity', { x, y: cy - h / 2 }, { w: 210, h }, text)
    n.data = { fields: fields.map(field) }
    return n
  }
  const reader = mk('读者', 0, ROW_CY, [
    ['reader_id', 'int', 'pk'],
    ['name', 'varchar'],
    ['phone', 'varchar'],
    ['card_no', 'varchar'],
  ])
  const book = mk('图书', 620, ROW_CY, [
    ['book_id', 'int', 'pk'],
    ['isbn', 'varchar'],
    ['title', 'varchar'],
    ['author', 'varchar'],
    ['publisher_id', 'int', 'fk'],
    ['category_id', 'int', 'fk'],
  ])
  const loan = mk('借阅记录', 310, ROW_CY, [
    ['loan_id', 'int', 'pk'],
    ['reader_id', 'int', 'fk'],
    ['book_id', 'int', 'fk'],
    ['borrow_date', 'date'],
    ['due_date', 'date'],
    ['return_date', 'date'],
  ])
  const publisher = mk('出版社', 930, ROW_CY, [
    ['publisher_id', 'int', 'pk'],
    ['name', 'varchar'],
    ['address', 'varchar'],
  ])
  const category = mk('分类', 620, 400, [
    ['category_id', 'int', 'pk'],
    ['name', 'varchar'],
  ])
  for (const n of [reader, book, loan, publisher, category]) doc.nodes[n.id] = n
  doc.zOrder = [reader.id, book.id, loan.id, publisher.id, category.id]
  const card = { arrowEnd: 'none' as const, routing: 'step' as const }
  const edges = [
    createEdge(reader.id, loan.id, { ...card, cardinality: { source: '1', target: '0..N' } }),
    createEdge(book.id, loan.id, { ...card, cardinality: { source: '1', target: '0..N' } }),
    createEdge(publisher.id, book.id, { ...card, cardinality: { source: '1', target: '0..N' } }),
    createEdge(category.id, book.id, { ...card, cardinality: { source: '1', target: '0..N' } }),
  ]
  for (const e of edges) doc.edges[e.id] = e
  return doc
}
