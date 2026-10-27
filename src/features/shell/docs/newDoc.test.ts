// 新建文档：模板实例化继承内容并重发 id；无模板时用插件的空白文档。
import { describe, expect, it } from 'vitest'
import { getPlugin } from '@/plugins/registry'
import { buildNewDoc } from './newDoc'

describe('buildNewDoc', () => {
  it('模板实例化：继承模板内容与标题、重发 id', () => {
    const d = buildNewDoc('flowchart', '0')
    const tpl = getPlugin('flowchart').templates[0]
    expect(d.title).toBe(tpl.title)
    expect(Object.keys(d.nodes)).toHaveLength(Object.keys(tpl.nodes).length)
    const again = buildNewDoc('flowchart', '0')
    expect(again.id).not.toBe(d.id)
    expect(again.id).not.toBe(tpl.id)
  })

  it('无模板参数：ER 为空文档，思维导图带插件预置的中心主题', () => {
    expect(Object.keys(buildNewDoc('er').nodes)).toHaveLength(0)
    expect(Object.keys(buildNewDoc('mindmap').nodes)).toHaveLength(1)
  })
})
