import { describe, expect, it } from 'vitest'
import { docToMermaid, parseMermaid } from './mermaid'
import { createDoc } from '../model/factories'

const SAMPLE = `graph TD
  A([开始]) --> B[输入账号密码]
  B --> C{校验通过?}
  C -->|是| D[进入主页]
  C -->|否| E[提示错误]
  E --> B
  style A fill:#fff
`

describe('Mermaid 导入', () => {
  it('解析节点形状、连线、标签与链式', () => {
    const r = parseMermaid(SAMPLE)
    expect(r.direction).toBe('TB')
    expect(Object.keys(r.nodes).length).toBe(5)
    expect(Object.values(r.nodes).map((n) => n.kind)).toContain('decision')
    expect(Object.values(r.edges).some((e) => e.label === '是')).toBe(true)
    expect(r.skipped).toBe(1) // style 行不认识 → 计数跳过
  })

  it('支持 LR 方向、虚线、链式 A-->B-->C、无箭头与粗线', () => {
    const r = parseMermaid('graph LR\nA --> B --> C\nC -.-> D\nD --- E\nE ==> F')
    expect(r.direction).toBe('LR')
    expect(Object.keys(r.edges).length).toBe(5)
    const styles = Object.values(r.edges).map((e) => `${e.style.dash}:${e.arrowEnd}:${e.style.strokeWidth}`)
    expect(styles).toContain('dashed:arrow:1.5')
    expect(styles).toContain('solid:none:1.5')
    expect(styles).toContain('solid:arrow:2.5')
  })

  it('支持 -- 文字 --> 标签形式与数据库/平行四边形', () => {
    const r = parseMermaid('graph TD\nA -- 写入 --> B[(订单库)]\nB --> C[/打印/]')
    expect(Object.values(r.nodes).some((n) => n.kind === 'database')).toBe(true)
    expect(Object.values(r.nodes).some((n) => n.kind === 'io')).toBe(true)
    expect(Object.values(r.edges)[0].label).toBe('写入')
  })
})

describe('Mermaid 导出与往返', () => {
  it('导出可被自身解析器读回（节点/连线/标签一致）', () => {
    const src = parseMermaid(SAMPLE)
    const doc = createDoc('flowchart')
    doc.nodes = src.nodes
    doc.edges = src.edges
    doc.zOrder = Object.keys(src.nodes)
    doc.settings.layoutDirection = src.direction
    const text = docToMermaid(doc)
    const back = parseMermaid(text)
    expect(back.skipped).toBe(0)
    expect(Object.keys(back.nodes).length).toBe(Object.keys(src.nodes).length)
    expect(Object.keys(back.edges).length).toBe(Object.keys(src.edges).length)
    const srcTexts = Object.values(src.nodes).map((n) => n.text).sort()
    const backTexts = Object.values(back.nodes).map((n) => n.text).sort()
    expect(backTexts).toEqual(srcTexts)
  })
})
