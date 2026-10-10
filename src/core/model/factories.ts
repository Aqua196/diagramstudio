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

export function createId(): string {
  return crypto.randomUUID()
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
    style: defaults?.style ?? { stroke: 'ink', strokeWidth: 1.5, dash: 'solid' },
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
