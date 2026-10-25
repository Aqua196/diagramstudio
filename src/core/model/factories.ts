import type {
  DiagramDoc,
  DiagramEdge,
  DiagramNode,
  DiagramType,
  EdgeRouting,
  NodeStyle,
  Point,
  Size,
} from './types'

/** 随机 UUID v4。crypto.randomUUID 只在安全上下文（https / localhost）里有，
 *  用 http + 局域网 IP 打开（同网协作的典型用法）时没有它，退回 getRandomValues 自己拼 */
export function createId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export const DEFAULT_NODE_STYLE: NodeStyle = {
  fill: 'white',
  stroke: 'ink',
  strokeWidth: 1.5,
  dash: 'solid',
  fontSize: 14,
  bold: false,
  align: 'center',
}

export function createNode(
  kind: string,
  position: Point,
  size: Size = { w: 140, h: 56 },
  text = '',
): DiagramNode {
  return {
    id: createId(),
    kind,
    position,
    size,
    text,
    style: { ...DEFAULT_NODE_STYLE },
    data: {},
  }
}

export function createEdge(
  source: string,
  target: string,
  defaults?: Partial<DiagramEdge>,
): DiagramEdge {
  return {
    id: createId(),
    source,
    target,
    routing: (defaults?.routing ?? 'bezier') as EdgeRouting,
    arrowStart: defaults?.arrowStart ?? 'none',
    arrowEnd: defaults?.arrowEnd ?? 'arrow',
    label: defaults?.label,
    sourceHandle: defaults?.sourceHandle,
    targetHandle: defaults?.targetHandle,
    style: defaults?.style ?? { stroke: 'ink-2', strokeWidth: 1.5, dash: 'solid' },
    cardinality: defaults?.cardinality,
  }
}

export function createDoc(type: DiagramType, title = '未命名图表'): DiagramDoc {
  const now = Date.now()
  return {
    schemaVersion: 1,
    id: createId(),
    title,
    type,
    nodes: {},
    edges: {},
    zOrder: [],
    settings: { grid: true, snap: true, layoutDirection: 'TB' },
    createdAt: now,
    updatedAt: now,
  }
}
