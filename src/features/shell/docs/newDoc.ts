// 新建文档：从插件模板实例化，或按插件的空白文档初始内容创建。
// 存储本身在 core/io/persist；这里只做依赖插件注册表的那一步。
import { createDoc, createId } from '@/core/model/factories'
import type { DiagramDoc, DiagramType } from '@/core/model/types'
import { getPlugin } from '@/plugins/registry'

const UNTITLED = '未命名图表'

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
