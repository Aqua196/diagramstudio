// Mermaid 子集导入导出（SPEC §5）：手写解析器，不认识的语句跳过并计数。
// 支持：graph/flowchart [TD/TB/LR/RL/BT]；A[]、A()、A{}、A([])、A[()]、A[[]]、A[/]、A(()）
// 连线：-->、---、-.->、==>、<--、<-->；标签 -->|文字| 与 -- 文字 -->；链式 A --> B --> C
// 语句可用分号分隔；引号内的文字可含括号、连接器与 #quot; 等实体；subgraph / end 跳过（子图内节点照常导入）
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

const HEADER = /^(?:graph|flowchart)(?:\s+(TB|TD|LR|RL|BT))?$/i
const NODE_ID = /^[A-Za-z0-9_一-龥]+/
/** 行首的连接器，可带 |标签|；标签可以用引号包住以容纳竖线 */
const CONNECTOR = /^(<-->|<--|-->|-\.->|==>|---)(?:\|("[^"]*"|[^|]*)\|)?/
const ANY_CONNECTOR = /<-->|<--|-->|-\.->|==>|---/g
/** 结构语句：子图不支持（其中的节点按普通节点导入），end 不能被当成名为 end 的节点 */
const STRUCTURE = /^(?:end|subgraph\b.*)$/

/** 每个位置是否在引号与括号之外：分语句、找连接器时只认外层的符号 */
function outerMask(line: string): boolean[] {
  const mask: boolean[] = []
  let quoted = false
  let depth = 0
  for (const ch of line.split('')) {
    if (ch === '"') quoted = !quoted
    else if (!quoted && '[({'.includes(ch)) depth += 1
    else if (!quoted && '])}'.includes(ch)) depth = Math.max(0, depth - 1)
    mask.push(!quoted && depth === 0 && ch !== '"')
  }
  return mask
}

/** 按外层的分号切分语句：Mermaid 允许 `graph TD;`、`A --> B;` 与一行多条语句 */
function splitStatements(line: string): string[] {
  const mask = outerMask(line)
  const parts: string[] = []
  let start = 0
  mask.forEach((outer, i) => {
    if (outer && line[i] === ';') {
      parts.push(line.slice(start, i))
      start = i + 1
    }
  })
  parts.push(line.slice(start))
  return parts.map((p) => p.trim()).filter(Boolean)
}

/** 第一个位于引号与括号之外的连接器位置；没有返回 -1 */
function findConnector(s: string): number {
  const mask = outerMask(s)
  for (const m of s.matchAll(ANY_CONNECTOR)) if (mask[m.index]) return m.index
  return -1
}

/** 把 `-- 文字 -->` 形式统一改写成 `-->|文字|`，便于链式切分 */
function normalizeInlineLabel(line: string): string {
  return line.replace(
    /--\s+([^-|][^-]*?)\s+(---|-->|<--|<-->)/g,
    (_m, label: string, conn: string) => {
      return `${conn}|${label.trim()}|`
    },
  )
}

/** 去掉外层引号，并还原 Mermaid 的实体写法 #quot; 与 #数字; */
function unquote(s: string): { text: string; quoted: boolean } {
  const t = s.trim()
  const quoted = t.length >= 2 && t.startsWith('"') && t.endsWith('"')
  const inner = quoted ? t.slice(1, -1) : t
  const text = inner
    .replace(/#quot;/g, '"')
    .replace(/#(\d+);/g, (_m, code: string) => String.fromCharCode(Number(code)))
  return { text, quoted }
}

/** 节点记号的括号形式 → 形状；顺序有意义：先匹配两个字符的括号 */
const SHAPE_PAIRS: Array<[open: string, close: string, kind: string]> = [
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

/** 解析 `A[文字]` / `A([起止])` 等节点记号；返回 null 表示该行看不懂 */
function parseNodeToken(raw: string): ParsedNode | null {
  const s = raw.trim()
  if (!s) return null
  const idMatch = s.match(NODE_ID)
  if (!idMatch) return null
  const id = idMatch[0]
  const rest = s.slice(id.length).trim()
  if (!rest) return { id, text: id, kind: 'process' }

  const pair = SHAPE_PAIRS.find(
    ([open, close]) =>
      rest.startsWith(open) && rest.endsWith(close) && rest.length >= open.length + close.length,
  )
  if (!pair) return null
  const [open, close, kind] = pair
  const { text, quoted } = unquote(rest.slice(open.length, rest.length - close.length))
  // A[] 显示 id；A[""] 是有意留空的文字
  return { id, text: text || (quoted ? '' : id), kind }
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

/** 把一行切成「节点记号」与「连接器」两组，二者应交错出现：token, conn, token, … */
function tokenize(line: string): {
  tokens: string[]
  conns: Array<{ raw: string; label?: string }>
} {
  const tokens: string[] = []
  const conns: Array<{ raw: string; label?: string }> = []
  let rest = line
  while (rest.length > 0) {
    const connMatch = rest.match(CONNECTOR)
    if (connMatch) {
      conns.push({ raw: connMatch[1], label: connMatch[2] })
      rest = rest.slice(connMatch[0].length)
      continue
    }
    const nextConn = findConnector(rest)
    const end = nextConn === -1 ? rest.length : nextConn
    tokens.push(rest.slice(0, end))
    rest = rest.slice(end)
  }
  return { tokens: tokens.map((t) => t.trim()).filter(Boolean), conns }
}

/** 第 i 个连接器连起第 i 与第 i+1 个节点 */
function toEdge(c: { raw: string; label?: string }, i: number, nodes: ParsedNode[]): ParsedEdge {
  return {
    source: nodes[i],
    target: nodes[i + 1],
    arrowStart: c.raw.startsWith('<') ? 'arrow' : 'none',
    arrowEnd: c.raw.includes('>') ? 'arrow' : 'none',
    dash: c.raw === '-.->' ? 'dashed' : 'solid',
    thick: c.raw === '==>',
    label: c.label === undefined ? undefined : unquote(c.label).text || undefined,
  }
}

function parseChain(line: string): { nodes: ParsedNode[]; edges: ParsedEdge[] } | null {
  const { tokens, conns } = tokenize(line)
  // 无连接器的单行（如 `A[文本]`）是合法的节点声明
  if (tokens.length === 1 && conns.length === 0) {
    const single = parseNodeToken(tokens[0])
    return single ? { nodes: [single], edges: [] } : null
  }
  if (tokens.length < 2 || conns.length !== tokens.length - 1) return null
  const nodes = tokens.map(parseNodeToken)
  if (nodes.some((n) => n === null)) return null
  const typed = nodes as ParsedNode[]
  return { nodes: typed, edges: conns.map((c, i) => toEdge(c, i, typed)) }
}

/** 解析过程中的累积状态：Mermaid 记号 id → 文档节点 id 的映射、已建好的节点与连线、方向与跳过数 */
interface ParseState {
  nodes: Record<string, DiagramNode>
  edges: Record<string, DiagramEdge>
  idMap: Map<string, string>
  direction: 'TB' | 'LR'
  /** 是否已读到 graph / flowchart 声明；之前的语句都不属于流程图 */
  header: boolean
  skipped: number
}

function nodeIdOf(st: ParseState, mermaidId: string): string {
  let id = st.idMap.get(mermaidId)
  if (!id) {
    id = `m_${createId().slice(0, 8)}`
    st.idMap.set(mermaidId, id)
  }
  return id
}

/** 把一行解析出的节点与连线并入文档；同一记号 id 只建一个节点（先出现的文字与形状为准） */
function addChain(st: ParseState, chain: { nodes: ParsedNode[]; edges: ParsedEdge[] }): void {
  for (const pn of chain.nodes) {
    const id = nodeIdOf(st, pn.id)
    if (st.nodes[id]) continue
    const n = createNode(pn.kind, { x: 0, y: 0 }, kindDefaultSize(pn.kind), pn.text)
    n.id = id
    st.nodes[id] = n
  }
  for (const pe of chain.edges) {
    const e = createEdge(nodeIdOf(st, pe.source.id), nodeIdOf(st, pe.target.id), {
      routing: 'bezier' as EdgeRouting,
      arrowStart: pe.arrowStart,
      arrowEnd: pe.arrowEnd,
      label: pe.label,
      style: { stroke: 'ink', strokeWidth: pe.thick ? 2.5 : 1.5, dash: pe.dash },
    })
    st.edges[e.id] = e
  }
}

/** 处理一条语句：方向声明、结构语句、节点与连线；看不懂的计入跳过数 */
function parseStatement(st: ParseState, stmt: string): void {
  const header = stmt.match(HEADER)
  if (header) {
    st.header = true
    st.direction = /^(LR|RL)$/i.test(header[1] ?? '') ? 'LR' : 'TB'
    return
  }
  const chain = st.header && !STRUCTURE.test(stmt) ? parseChain(normalizeInlineLabel(stmt)) : null
  if (chain) addChain(st, chain)
  else st.skipped += 1
}

export function parseMermaid(text: string): MermaidImport {
  const st: ParseState = {
    nodes: {},
    edges: {},
    idMap: new Map(),
    direction: 'TB',
    header: false,
    skipped: 0,
  }
  const statements = text
    .split('\n')
    .map((raw) => raw.trim())
    .filter((line) => line && !line.startsWith('%%'))
    .flatMap(splitStatements)
  for (const stmt of statements) parseStatement(st, stmt)
  return { nodes: st.nodes, edges: st.edges, direction: st.direction, skipped: st.skipped }
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

/** 含括号、竖线、尖括号、引号或分号的文字用引号包住，内部的引号写成 #quot; */
function esc(text: string): string {
  return /[[\]{}()|<>";]/.test(text) ? `"${text.replace(/"/g, '#quot;')}"` : text
}

/** 连线 → Mermaid 连接器：双向 / 反向 / 无箭头 / 虚线 / 粗线 / 普通，按此优先级取第一个符合的 */
function connectorOf(edge: DiagramEdge): string {
  const both = edge.arrowStart === 'arrow' && edge.arrowEnd === 'arrow'
  const rules: Array<[boolean, string]> = [
    [both, '<-->'],
    [edge.arrowStart === 'arrow', '<--'],
    [edge.arrowEnd === 'none', '---'],
    [edge.style.dash === 'dashed', '-.->'],
    [edge.style.strokeWidth > 2, '==>'],
  ]
  return rules.find(([hit]) => hit)?.[1] ?? '-->'
}

export function docToMermaid(doc: DiagramDoc): string {
  const lines: string[] = [`graph ${doc.settings.layoutDirection === 'LR' ? 'LR' : 'TD'}`]
  // 文档 id 是 UUID，导出时按叠放顺序换成 N0、N1… 的短记号
  const idOf = new Map(doc.zOrder.map((id, i) => [id, `N${i}`]))
  for (const id of doc.zOrder) {
    const node = doc.nodes[id]
    if (!node) continue
    const shape = KIND_TO_SHAPE[node.kind] ?? KIND_TO_SHAPE.process
    // 没有文字的节点导出为 ""，不能用形状名顶替（否则读回后凭空多出 process 等文字）
    const label = node.text ? esc(node.text) : '""'
    lines.push(`  ${idOf.get(id)}${shape.open}${label}${shape.close}`)
  }
  for (const edge of Object.values(doc.edges)) {
    const s = idOf.get(edge.source)
    const t = idOf.get(edge.target)
    if (!s || !t) continue
    const label = edge.label ? `|${esc(edge.label)}|` : ''
    lines.push(`  ${s} ${connectorOf(edge)}${label} ${t}`)
  }
  return lines.join('\n')
}
