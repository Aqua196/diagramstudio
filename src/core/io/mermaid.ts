// Mermaid 子集导入导出（SPEC §5）：手写解析器，不认识的行跳过并计数。
// 支持：graph/flowchart + TD/TB/LR/RL/BT；A[]、A()、A{}、A([])、A[()]、A[[]]、A[/]、A(()）
// 连线：-->、---、-.->、==>、<--、<-->；标签 -->|文字| 与 -- 文字 -->；链式 A --> B --> C
import { createEdge, createId, createNode } from '../model/factories'
import type { DiagramDoc, DiagramEdge, DiagramNode, EdgeArrow, EdgeRouting } from '../model/types'

export interface MermaidImport {
  nodes: Record<string, DiagramNode>
  edges: Record<string, DiagramEdge>
  direction: 'TB' | 'LR'
  skipped: number
}

interface ParsedNode {
  id: string
  text: string
  kind: string
}

const KIND_TO_SHAPE: Record<string, { open: string; close: string }> = {
  process: { open: '[', close: ']' },
  terminator: { open: '([', close: '])' },
  decision: { open: '{', close: '}' },
  database: { open: '[(', close: ')]' },
  io: { open: '[/', close: '/]' },
  subprocess: { open: '[[', close: ']]' },
  connector: { open: '((', close: '))' },
  document: { open: '[', close: ']' },
  note: { open: '[', close: ']' },
}

const HEADER = /^(?:graph|flowchart)\s+(TB|TD|LR|RL|BT)\s*$/i
const NODE_ID = /^[A-Za-z0-9_一-龥]+/
const CONNECTOR = /^(<-->|<--|-->|-\.->|==>|---)(?:\|([^|]*)\|)?/

/** 把 `-- 文字 -->` 形式统一改写成 `-->|文字|`，便于链式切分 */
function normalizeInlineLabel(line: string): string {
  return line.replace(
    /--\s+([^-|][^-]*?)\s+(---|-->|<--|<-->)/g,
    (_m, label: string, conn: string) => {
      return `${conn}|${label.trim()}|`
    },
  )
}

function stripQuotes(s: string): string {
  const t = s.trim()
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1)
  return t
}

/** 解析 `A[文字]` / `A([起止])` 等节点记号；返回 null 表示该行看不懂 */
function parseNodeToken(raw: string): ParsedNode | null {
  const s = raw.trim()
  if (!s) return null
  const idMatch = s.match(NODE_ID)
  if (!idMatch) return null
  const id = idMatch[0]
  const rest = s.slice(id.length).trim()
  if (!rest) return { id, text: id, kind: 'process' }

  const pairs: Array<[string, string, string]> = [
    ['[(', ')]', 'database'],
    ['[[', ']]', 'subprocess'],
    ['[/', '/]', 'io'],
    ['[\\', '\\]', 'io'],
    ['[/', '\\]', 'io'],
    ['[\\', '/]', 'io'],
    ['([', '])', 'terminator'],
    ['((', '))', 'connector'],
    ['{', '}', 'decision'],
    ['(', ')', 'process'],
    ['[', ']', 'process'],
  ]
  for (const [open, close, kind] of pairs) {
    if (
      rest.startsWith(open) &&
      rest.endsWith(close) &&
      rest.length >= open.length + close.length
    ) {
      const text = stripQuotes(rest.slice(open.length, rest.length - close.length))
      return { id, text: text || id, kind }
    }
  }
  return null
}

interface ParsedEdge {
  source: ParsedNode
  target: ParsedNode
  arrowStart: EdgeArrow
  arrowEnd: EdgeArrow
  dash: 'solid' | 'dashed'
  thick: boolean
  label?: string
}

function parseChain(line: string): { nodes: ParsedNode[]; edges: ParsedEdge[] } | null {
  const tokens: string[] = []
  const conns: Array<{ raw: string; label?: string }> = []
  let rest = line
  while (rest.length > 0) {
    const connMatch = rest.match(CONNECTOR)
    if (connMatch && connMatch.index !== undefined) {
      const before = rest.slice(0, connMatch.index)
      if (before.trim()) tokens.push(before)
      conns.push({ raw: connMatch[1], label: connMatch[2] })
      rest = rest.slice(connMatch.index + connMatch[0].length)
    } else {
      const nextConn = rest.search(/<-->|<--|-->|-\.->|==>|---/)
      if (nextConn === -1) {
        tokens.push(rest)
        rest = ''
      } else {
        tokens.push(rest.slice(0, nextConn))
        rest = rest.slice(nextConn)
      }
    }
  }
  // tokens 与 conns 应呈 token, conn, token, conn, token 交错；
  // 无连接器的单行（如 `A[文本]`）是合法的节点声明
  const nodeTokens = tokens.map((t) => t.trim()).filter(Boolean)
  if (nodeTokens.length === 1 && conns.length === 0) {
    const single = parseNodeToken(nodeTokens[0])
    if (!single) return null
    return { nodes: [single], edges: [] }
  }
  if (nodeTokens.length < 2 || conns.length !== nodeTokens.length - 1) return null
  const nodes = nodeTokens.map(parseNodeToken)
  if (nodes.some((n) => n === null)) return null
  const typed = nodes as ParsedNode[]
  const edges: ParsedEdge[] = conns.map((c, i) => {
    const dash: ParsedEdge['dash'] = c.raw === '-.->' ? 'dashed' : 'solid'
    return {
      source: typed[i],
      target: typed[i + 1],
      arrowStart: c.raw.startsWith('<') ? 'arrow' : 'none',
      arrowEnd: c.raw.includes('>') ? 'arrow' : 'none',
      dash,
      thick: c.raw === '==>',
      label: c.label?.trim() || undefined,
    }
  })
  return { nodes: typed, edges }
}

export function parseMermaid(text: string): MermaidImport {
  const nodes: Record<string, DiagramNode> = {}
  const edges: Record<string, DiagramEdge> = {}
  const idMap = new Map<string, string>()
  let direction: 'TB' | 'LR' = 'TB'
  let skipped = 0

  const nodeId = (mermaidId: string): string => {
    let id = idMap.get(mermaidId)
    if (!id) {
      id = `m_${createId().slice(0, 8)}`
      idMap.set(mermaidId, id)
    }
    return id
  }

  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('%%')) continue
    const header = line.match(HEADER)
    if (header) {
      const d = header[1].toUpperCase()
      direction = d === 'LR' || d === 'RL' ? 'LR' : 'TB'
      continue
    }
    const chain = parseChain(normalizeInlineLabel(line))
    if (!chain) {
      skipped += 1
      continue
    }
    for (const pn of chain.nodes) {
      const id = nodeId(pn.id)
      if (!nodes[id]) {
        const n = createNode(pn.kind, { x: 0, y: 0 }, kindDefaultSize(pn.kind), pn.text)
        n.id = id
        nodes[id] = n
      }
    }
    for (const pe of chain.edges) {
      const e = createEdge(nodeId(pe.source.id), nodeId(pe.target.id), {
        routing: 'bezier' as EdgeRouting,
        arrowStart: pe.arrowStart,
        arrowEnd: pe.arrowEnd,
        label: pe.label,
        style: {
          stroke: 'ink',
          strokeWidth: pe.thick ? 2.5 : 1.5,
          dash: pe.dash,
        },
      })
      edges[e.id] = e
    }
  }
  return { nodes, edges, direction, skipped }
}

function kindDefaultSize(kind: string): { w: number; h: number } {
  switch (kind) {
    case 'decision':
      return { w: 140, h: 80 }
    case 'terminator':
      return { w: 140, h: 48 }
    case 'database':
      return { w: 120, h: 72 }
    case 'connector':
      return { w: 32, h: 32 }
    case 'note':
      return { w: 140, h: 80 }
    default:
      return { w: 140, h: 56 }
  }
}

function esc(text: string): string {
  return /[[\]{}()|<>]/.test(text) ? `"${text.replace(/"/g, '#quot;')}"` : text
}

export function docToMermaid(doc: DiagramDoc): string {
  const lines: string[] = [`graph ${doc.settings.layoutDirection === 'LR' ? 'LR' : 'TD'}`]
  const idOf = new Map<string, string>()
  let counter = 0
  for (const id of doc.zOrder) idOf.set(id, `N${counter++}`)

  for (const id of doc.zOrder) {
    const node = doc.nodes[id]
    if (!node) continue
    const shape = KIND_TO_SHAPE[node.kind] ?? KIND_TO_SHAPE.process
    lines.push(`  ${idOf.get(id)}${shape.open}${esc(node.text || node.kind)}${shape.close}`)
  }
  for (const edge of Object.values(doc.edges)) {
    const s = idOf.get(edge.source)
    const t = idOf.get(edge.target)
    if (!s || !t) continue
    let conn = '-->'
    if (edge.arrowStart === 'arrow' && edge.arrowEnd === 'arrow') conn = '<-->'
    else if (edge.arrowStart === 'arrow') conn = '<--'
    else if (edge.arrowEnd === 'none') conn = '---'
    else if (edge.style.dash === 'dashed') conn = '-.->'
    else if (edge.style.strokeWidth > 2) conn = '==>'
    const label = edge.label ? `|${esc(edge.label)}|` : ''
    lines.push(`  ${s} ${conn}${label} ${t}`)
  }
  return lines.join('\n')
}
