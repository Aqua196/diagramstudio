// ER 实体的纯数据助手：行高常量、字段读取、实体高度、追加字段命令
// （行内按钮与工具条「添加字段」共用；从 erFields 拆出以保持单文件 ≤200 行）。
import { patchNode } from '@/core/commands/ops'
import { createId } from '@/core/model/factories'
import type { DiagramNode, ErField } from '@/core/model/types'
import { zh } from '@/i18n/zh'

const er = zh.plugins.er

export const ROW_H = 26
export const HEAD_H = 30

export const fieldsOf = (n: DiagramNode): ErField[] =>
  (n.data as { fields?: ErField[] }).fields ?? []

/** 实体应有的高度：表头 + 字段行 + 末尾「添加字段」行（锚点位置据此对齐） */
export const entityHeight = (fields: ErField[]): number => HEAD_H + (fields.length + 1) * ROW_H

/** 追加一个字段的命令（行内按钮与工具条「添加字段」共用） */
export function addFieldCommand(node: DiagramNode) {
  const fields = fieldsOf(node)
  const next = [...fields, { id: createId(), name: `field_${fields.length + 1}`, type: 'int' }]
  return patchNode(
    node.id,
    { data: { ...node.data, fields: next }, size: { w: node.size.w, h: entityHeight(next) } },
    er.addField,
  )
}
