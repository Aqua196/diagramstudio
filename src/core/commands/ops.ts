// 通用命令工厂：画布、右键菜单、快捷键、检查器共用，差异全在这里。
// 每个函数返回一条 Command；apply 内只改 draft，历史层自动收补丁。
import { createId } from '../model/factories'
import type { Command } from './command'
import type { DiagramDoc, DiagramEdge, DiagramNode, Point, Size } from '../model/types'

export function addNode(node: DiagramNode, edges: DiagramEdge[] = []): Command {
  return {
    label: '添加节点',
    apply(draft) {
      draft.nodes[node.id] = node
      draft.zOrder.push(node.id)
      for (const e of edges) draft.edges[e.id] = e
    },
  }
}

export function addEdge(edge: DiagramEdge): Command {
  return {
    label: '连接元素',
    apply(draft) {
      draft.edges[edge.id] = edge
    },
  }
}

/** 删除节点与连线；依附于被删节点的连线一并删除 */
export function deleteElements(nodeIds: string[], edgeIds: string[]): Command {
  const n = nodeIds.length + edgeIds.length
  return {
    label: `删除 ${n} 个元素`,
    apply(draft) {
      const gone = new Set(nodeIds)
      for (const id of nodeIds) delete draft.nodes[id]
      for (const edge of Object.values(draft.edges)) {
        if (edgeIds.includes(edge.id) || gone.has(edge.source) || gone.has(edge.target)) {
          delete draft.edges[edge.id]
        }
      }
      draft.zOrder = draft.zOrder.filter((id) => draft.nodes[id])
    },
  }
}

export function moveNodesBy(ids: string[], dx: number, dy: number): Command {
  return {
    label: ids.length > 1 ? `移动 ${ids.length} 个元素` : '移动元素',
    apply(draft) {
      for (const id of ids) {
        const node = draft.nodes[id]
        if (node) {
          node.position.x += dx
          node.position.y += dy
        }
      }
    },
  }
}

/** 拖动/布局结束时按最终位置提交一条命令 */
export function setNodePositions(positions: Record<string, Point>, label = '移动元素'): Command {
  const count = Object.keys(positions).length
  return {
    label: count > 1 ? `${label}（${count} 个元素）` : label,
    apply(draft) {
      for (const [id, p] of Object.entries(positions)) {
        if (draft.nodes[id]) draft.nodes[id].position = { ...p }
      }
    },
  }
}

export function resizeNode(id: string, position: Point, size: Size): Command {
  return {
    label: '调整大小',
    apply(draft) {
      const node = draft.nodes[id]
      if (node) {
        node.position = { ...position }
        node.size = { ...size }
      }
    },
  }
}

export function updateNodeText(id: string, text: string): Command {
  return {
    label: '编辑文字',
    coalesceKey: `text:${id}`,
    apply(draft) {
      const node = draft.nodes[id]
      if (node) node.text = text
    },
  }
}

export function patchNode(id: string, patch: Partial<DiagramNode>, label = '修改节点'): Command {
  return {
    label,
    apply(draft) {
      const node = draft.nodes[id]
      if (node) Object.assign(node, patch)
    },
  }
}

export function patchNodeStyle(
  id: string,
  style: Partial<DiagramNode['style']>,
  label = '修改样式',
): Command {
  return {
    label,
    apply(draft) {
      const node = draft.nodes[id]
      if (node) Object.assign(node.style, style)
    },
  }
}

export function patchEdge(id: string, patch: Partial<DiagramEdge>, label = '修改连线'): Command {
  return {
    label,
    apply(draft) {
      const edge = draft.edges[id]
      if (edge) Object.assign(edge, patch)
    },
  }
}

export function reconnectEdge(
  id: string,
  conn: Pick<DiagramEdge, 'source' | 'target' | 'sourceHandle' | 'targetHandle'>,
): Command {
  return {
    label: '重新连接',
    apply(draft) {
      const edge = draft.edges[id]
      if (edge) Object.assign(edge, conn)
    },
  }
}

export function bringToFront(ids: string[]): Command {
  return {
    label: '置于顶层',
    apply(draft) {
      const set = new Set(ids)
      const rest = draft.zOrder.filter((id) => !set.has(id))
      const moved = draft.zOrder.filter((id) => set.has(id))
      draft.zOrder = [...rest, ...moved]
    },
  }
}

export function sendToBack(ids: string[]): Command {
  return {
    label: '置于底层',
    apply(draft) {
      const set = new Set(ids)
      const moved = draft.zOrder.filter((id) => set.has(id))
      const rest = draft.zOrder.filter((id) => !set.has(id))
      draft.zOrder = [...moved, ...rest]
    },
  }
}

export type AlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'

/** 对齐计算（纯函数，便于单测）：返回各节点应到的新位置 */
export function alignPositions(doc: DiagramDoc, ids: string[], mode: AlignMode): Record<string, Point> {
  const nodes = ids.map((id) => doc.nodes[id]).filter((n): n is DiagramNode => !!n)
  if (nodes.length < 2) return {}
  const minX = Math.min(...nodes.map((n) => n.position.x))
  const maxX = Math.max(...nodes.map((n) => n.position.x + n.size.w))
  const minY = Math.min(...nodes.map((n) => n.position.y))
  const maxY = Math.max(...nodes.map((n) => n.position.y + n.size.h))
  const out: Record<string, Point> = {}
  for (const n of nodes) {
    const p = { ...n.position }
    if (mode === 'left') p.x = minX
    if (mode === 'right') p.x = maxX - n.size.w
    if (mode === 'center') p.x = (minX + maxX - n.size.w) / 2
    if (mode === 'top') p.y = minY
    if (mode === 'bottom') p.y = maxY - n.size.h
    if (mode === 'middle') p.y = (minY + maxY - n.size.h) / 2
    out[n.id] = p
  }
  return out
}

export function alignNodes(doc: DiagramDoc, ids: string[], mode: AlignMode): Command {
  const label = `对齐（${alignLabel(mode)}）`
  return {
    label,
    apply(draft) {
      const positions = alignPositions(doc, ids, mode)
      for (const [id, p] of Object.entries(positions)) {
        if (draft.nodes[id]) draft.nodes[id].position = p
      }
    },
  }
}

/** 等距分布（纯函数）：按主轴排序后均匀拉开，首尾不动 */
export function distributePositions(
  doc: DiagramDoc,
  ids: string[],
  axis: 'h' | 'v',
): Record<string, Point> {
  const nodes = ids.map((id) => doc.nodes[id]).filter((n): n is DiagramNode => !!n)
  if (nodes.length < 3) return {}
  const key = axis === 'h' ? 'x' : 'y'
  const len = axis === 'h' ? 'w' : 'h'
  const sorted = [...nodes].sort((a, b) => a.position[key] - b.position[key])
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const totalSpan = last.position[key] + last.size[len] - first.position[key]
  const usedSpan = sorted.reduce((s, n) => s + n.size[len], 0)
  const gap = (totalSpan - usedSpan) / (sorted.length - 1)
  const out: Record<string, Point> = {}
  let cursor = first.position[key]
  for (let i = 1; i < sorted.length - 1; i++) {
    cursor += sorted[i - 1].size[len] + gap
    out[sorted[i].id] = { ...sorted[i].position, [key]: cursor }
  }
  return out
}

export function distributeNodes(doc: DiagramDoc, ids: string[], axis: 'h' | 'v'): Command {
  return {
    label: axis === 'h' ? '横向等距分布' : '纵向等距分布',
    apply(draft) {
      const positions = distributePositions(doc, ids, axis)
      for (const [id, p] of Object.entries(positions)) {
        if (draft.nodes[id]) draft.nodes[id].position = p
      }
    },
  }
}

/** 粘贴/副本：调用方先克隆好新 id 的节点与连线（内部连线已重映射），这里整体落盘 */
export function insertElements(nodes: DiagramNode[], edges: DiagramEdge[], label = '粘贴'): Command {
  return {
    label,
    apply(draft) {
      for (const n of nodes) {
        draft.nodes[n.id] = n
        draft.zOrder.push(n.id)
      }
      for (const e of edges) draft.edges[e.id] = e
    },
  }
}

/** 剪贴板克隆（纯函数）：只保留所选节点之间的连线，id 全部换新并整体偏移 */
export function cloneForPaste(
  doc: DiagramDoc,
  nodeIds: string[],
  offset: Point,
): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  const idMap = new Map<string, string>()
  const nodes: DiagramNode[] = []
  for (const id of doc.zOrder) {
    if (!nodeIds.includes(id)) continue
    const src = doc.nodes[id]
    if (!src) continue
    const nid = createId()
    idMap.set(id, nid)
    nodes.push({
      ...src,
      id: nid,
      position: { x: src.position.x + offset.x, y: src.position.y + offset.y },
      style: { ...src.style },
      data: structuredClone(src.data),
    })
  }
  const edges: DiagramEdge[] = []
  for (const e of Object.values(doc.edges)) {
    const s = idMap.get(e.source)
    const t = idMap.get(e.target)
    if (s && t) {
      edges.push({ ...e, id: createId(), source: s, target: t, style: { ...e.style } })
    }
  }
  return { nodes, edges }
}

export function setDocTitle(title: string): Command {
  return {
    label: '重命名',
    coalesceKey: 'doc:title',
    apply(draft) {
      draft.title = title
    },
  }
}

export function setSettings(patch: Partial<DiagramDoc['settings']>, label = '修改画布设置'): Command {
  return {
    label,
    apply(draft) {
      Object.assign(draft.settings, patch)
    },
  }
}

function alignLabel(mode: AlignMode): string {
  return {
    left: '左',
    center: '水平居中',
    right: '右',
    top: '上',
    middle: '垂直居中',
    bottom: '下',
  }[mode]
}
