// 实验 8：Mermaid 导入导出模块的单元测试用例（编号与实验报告表 8-1 对应）。
// N = 正常输入，E = 异常与边界输入，R = 导出后再导入的往返一致性。
import { describe, expect, it } from 'vitest'
import { docToMermaid, parseMermaid } from './mermaid'
import { importMermaidText } from './importer'
import { createDoc, createEdge, createNode } from '../model/factories'
import type { DiagramDoc } from '../model/types'

const texts = (src: string) =>
  Object.values(parseMermaid(src).nodes)
    .map((n) => n.text)
    .sort()
const kinds = (src: string) => Object.values(parseMermaid(src).nodes).map((n) => n.kind)
const edges = (src: string) => Object.values(parseMermaid(src).edges)

/** 只含给定节点（与可选连线）的流程图文档 */
function docOf(nodeTexts: Array<[kind: string, text: string]>, label?: string): DiagramDoc {
  const doc = createDoc('flowchart', 't')
  for (const [kind, text] of nodeTexts) {
    const n = createNode(kind, { x: 0, y: 0 }, undefined, text)
    doc.nodes[n.id] = n
    doc.zOrder.push(n.id)
  }
  if (label !== undefined && doc.zOrder.length >= 2) {
    const e = createEdge(doc.zOrder[0], doc.zOrder[1], { label })
    doc.edges[e.id] = e
  }
  return doc
}

/** 导出再导入：返回读回的节点文字（按导出顺序）与连线标签 */
function roundTrip(doc: DiagramDoc) {
  const back = parseMermaid(docToMermaid(doc))
  return {
    texts: Object.values(back.nodes).map((n) => n.text),
    kinds: Object.values(back.nodes).map((n) => n.kind),
    labels: Object.values(back.edges).map((e) => e.label),
    skipped: back.skipped,
  }
}

describe('正常输入', () => {
  it('N1 五种方向声明：LR、RL 为横向，TD、TB、BT 为纵向', () => {
    expect(parseMermaid('graph LR\nA').direction).toBe('LR')
    expect(parseMermaid('flowchart RL\nA').direction).toBe('LR')
    for (const d of ['TD', 'TB', 'BT']) expect(parseMermaid(`graph ${d}\nA`).direction).toBe('TB')
  })

  it('N2 九种节点记号对应七种形状', () => {
    const src =
      'graph TD\nA[处理]\nB(圆角)\nC{判断}\nD([起止])\nE[(库)]\nF[[子流程]]\nG[/输入/]\nH[\\输出\\]\nI((连接))'
    expect(kinds(src)).toEqual([
      'process',
      'process',
      'decision',
      'terminator',
      'database',
      'subprocess',
      'io',
      'io',
      'connector',
    ])
  })

  it('N3 六种连接器的箭头、虚线与粗细', () => {
    const e = edges('graph LR\nA --> B\nB --- C\nC -.-> D\nD ==> E\nE <-- F\nF <--> G')
    expect(
      e.map((x) => `${x.arrowStart}/${x.arrowEnd}/${x.style.dash}/${x.style.strokeWidth}`),
    ).toEqual([
      'none/arrow/solid/1.5',
      'none/none/solid/1.5',
      'none/arrow/dashed/1.5',
      'none/arrow/solid/2.5',
      'arrow/none/solid/1.5',
      'arrow/arrow/solid/1.5',
    ])
  })

  it('N4 链式写法 A --> B --> C 生成两条连线', () => {
    expect(edges('graph TD\nA --> B --> C')).toHaveLength(2)
  })

  it('N5 两种标签写法 -->|是| 与 -- 否 -->', () => {
    expect(edges('graph TD\nA -->|是| B\nA -- 否 --> C').map((x) => x.label)).toEqual(['是', '否'])
  })

  it('N6 同一个 id 多次出现只建一个节点，以第一次的文字为准', () => {
    const r = parseMermaid('graph TD\nA[开始] --> B\nB --> A[另一个名字]')
    expect(Object.keys(r.nodes)).toHaveLength(2)
    expect(texts('graph TD\nA[开始] --> B\nB --> A[另一个名字]')).toEqual(['B', '开始'])
  })

  it('N7 中文 id 与引号包住的含括号文字', () => {
    expect(texts('graph TD\n开始 --> 结束["结束 [完成]"]')).toEqual(['开始', '结束 [完成]'])
  })

  it('N8 %% 注释行与空行被忽略，不计入跳过数', () => {
    const r = parseMermaid('graph TD\n%% 注释\n\n  A --> B\n')
    expect(r.skipped).toBe(0)
    expect(Object.keys(r.nodes)).toHaveLength(2)
  })
})

describe('异常与边界输入', () => {
  it('E1 空文本、只有声明或注释：没有节点，导入返回错误', () => {
    for (const src of ['', 'graph TD\n', 'graph TD\n%% 只有注释']) {
      expect(Object.keys(parseMermaid(src).nodes)).toHaveLength(0)
      const r = importMermaidText(src, { emptyError: '没有内容' })
      expect(r.ok).toBe(false)
      expect(r.errors).toEqual(['没有内容'])
    }
  })

  it('E2 不支持的语句（style、classDef、subgraph、click）跳过并计数', () => {
    const r = parseMermaid(
      'graph TD\nA --> B\nstyle A fill:#fff\nclassDef x fill:#f00\nsubgraph S\nend\nclick A cb',
    )
    expect(Object.keys(r.edges)).toHaveLength(1)
    expect(r.skipped).toBe(5)
  })

  it('E3 括号不配对、连接器缺一端：整行跳过，不产生半截节点', () => {
    const r = parseMermaid('graph TD\nA[没有右括号\nB -->\n--> C')
    expect(Object.keys(r.nodes)).toHaveLength(0)
    expect(r.skipped).toBe(3)
  })

  it('E4 Windows 换行（\\r\\n）与行首缩进', () => {
    expect(texts('graph TD\r\n    A[甲] --> B[乙]\r\n')).toEqual(['乙', '甲'])
  })

  it('E5 以分号结尾的语句（Mermaid 允许）', () => {
    const r = parseMermaid('graph LR;\nA[开始] --> B[结束];\nB --> C;')
    expect(r.direction).toBe('LR')
    expect(Object.keys(r.nodes)).toHaveLength(3)
    expect(Object.keys(r.edges)).toHaveLength(2)
    expect(r.skipped).toBe(0)
  })

  it('E6 没有 graph / flowchart 声明的普通文字不当作流程图', () => {
    const r = parseMermaid('hello\nworld')
    expect(Object.keys(r.nodes)).toHaveLength(0)
    expect(r.skipped).toBe(2)
  })

  it('E7 引号里的文字可以含连接器符号', () => {
    const r = parseMermaid('graph TD\nA["x --> y"] --> B')
    expect(Object.keys(r.nodes)).toHaveLength(2)
    expect(texts('graph TD\nA["x --> y"] --> B')).toEqual(['B', 'x --> y'])
  })
})

describe('导出与往返一致性', () => {
  it('R1 七种形状导出后读回，形状与文字不变', () => {
    const shapes: Array<[string, string]> = [
      ['process', '处理'],
      ['terminator', '起止'],
      ['decision', '判断'],
      ['database', '库'],
      ['io', '输入'],
      ['subprocess', '子流程'],
      ['connector', 'C'],
    ]
    const back = roundTrip(docOf(shapes))
    expect(back.kinds).toEqual(shapes.map(([k]) => k))
    expect(back.texts).toEqual(shapes.map(([, t]) => t))
    expect(back.skipped).toBe(0)
  })

  it('R2 含括号的文字自动加引号，读回不变', () => {
    expect(
      roundTrip(
        docOf([
          ['process', '校验 (可选)'],
          ['decision', 'x > 0?'],
        ]),
      ).texts,
    ).toEqual(['校验 (可选)', 'x > 0?'])
  })

  it('R3 同时含双引号和括号的文字读回不变', () => {
    expect(
      roundTrip(
        docOf([
          ['process', '输出 "OK"'],
          ['process', '打印 "OK" (2 份)'],
        ]),
      ).texts,
    ).toEqual(['输出 "OK"', '打印 "OK" (2 份)'])
  })

  it('R4 含竖线的连线标签读回不变', () => {
    const back = roundTrip(
      docOf(
        [
          ['process', 'A'],
          ['process', 'B'],
        ],
        'a|b',
      ),
    )
    expect(back.labels).toEqual(['a|b'])
    expect(back.skipped).toBe(0)
  })

  it('R5 没有文字的节点导出后仍然没有文字', () => {
    expect(
      roundTrip(
        docOf([
          ['process', ''],
          ['decision', ''],
        ]),
      ).texts,
    ).toEqual(['', ''])
  })

  it('R6 指向不存在节点的连线不导出', () => {
    const doc = docOf([['process', 'A']])
    const e = createEdge('ghost', doc.zOrder[0])
    doc.edges[e.id] = e
    expect(docToMermaid(doc)).not.toContain('-->')
  })
})
