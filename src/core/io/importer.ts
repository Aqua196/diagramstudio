// 导入（SPEC §5）：JSON 严格校验；Mermaid 解析后用布局器摆位（默认 dagre）。
import { createDoc } from '../model/factories'
import type { DiagramDoc, DiagramEdge, DiagramNode, EdgeRouting } from '../model/types'
import { dagreLayout } from '../layout/dagre'
import { parseMermaid } from './mermaid'
import { jsonToDoc } from './serialize'

export interface ImportResult {
  ok: boolean
  doc?: DiagramDoc
  errors: string[]
  /** mermaid 特有：解析但跳过的行数 */
  skipped?: number
}

export function importJsonText(text: string): ImportResult {
  const r = jsonToDoc(text)
  if (!r.ok) return { ok: false, errors: r.errors }
  return { ok: true, doc: r.doc, errors: [] }
}

export function importMermaidText(
  text: string,
  opts: {
    /** 文档标题与空内容错误文案由调用方注入（i18n 归外壳层） */
    title?: string
    emptyError?: string
    layout?: (doc: DiagramDoc, o: { direction: 'TB' | 'LR' }) => Record<string, { x: number; y: number }>
    /** 连线路由：由外壳按流程图插件默认值注入（Mermaid 本身不描述路由） */
    edgeRouting?: EdgeRouting
  } = {},
): ImportResult {
  const layout = opts.layout ?? dagreLayout
  const parsed = parseMermaid(text)
  const nodeCount = Object.keys(parsed.nodes).length
  if (nodeCount === 0) {
    return {
      ok: false,
      errors: [opts.emptyError ?? 'mermaid: no recognizable diagram content'],
      skipped: parsed.skipped,
    }
  }
  const doc = createDoc('flowchart', opts.title ?? 'imported diagram')
  doc.settings.layoutDirection = parsed.direction
  const nodes: Record<string, DiagramNode> = {}
  const pos = layout(
    { ...doc, nodes: parsed.nodes, edges: parsed.edges, zOrder: Object.keys(parsed.nodes) },
    { direction: parsed.direction },
  )
  for (const [id, n] of Object.entries(parsed.nodes)) {
    nodes[id] = { ...n, position: pos[id] ?? n.position }
  }
  doc.nodes = nodes
  doc.zOrder = Object.keys(nodes)
  const edges: Record<string, DiagramEdge> = {}
  for (const [id, e] of Object.entries(parsed.edges)) {
    edges[id] = opts.edgeRouting ? { ...e, routing: opts.edgeRouting } : e
  }
  doc.edges = edges
  return { ok: true, doc, errors: [], skipped: parsed.skipped }
}
