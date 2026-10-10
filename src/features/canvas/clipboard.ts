// 画布剪贴板：复制/剪切只保存所选节点与其内部连线（SPEC §5）。
// 粘贴与副本生成全新 id，内部连线端点重映射，整体偏移 24px。
import { cloneForPaste } from '@/core/commands/ops'
import { createId } from '@/core/model/factories'
import type { DiagramDoc, DiagramEdge, DiagramNode } from '@/core/model/types'

export const PASTE_OFFSET = 24

interface ClipboardPayload {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
}

let clipboard: ClipboardPayload | null = null
let pasteSerial = 0

/** 深拷贝所选节点与两端都在选择内的连线 */
export function copySelection(doc: DiagramDoc, nodeIds: string[]): boolean {
  const wanted = new Set(nodeIds)
  const nodes: DiagramNode[] = []
  for (const id of doc.zOrder) {
    const n = doc.nodes[id]
    if (n && wanted.has(id)) nodes.push(structuredClone(n))
  }
  if (nodes.length === 0) return false
  const edges = Object.values(doc.edges)
    .filter((e) => wanted.has(e.source) && wanted.has(e.target))
    .map((e) => structuredClone(e))
  clipboard = { nodes, edges }
  pasteSerial = 0
  return true
}

export function hasClipboard(): boolean {
  return clipboard !== null && clipboard.nodes.length > 0
}

/** 生成粘贴负载：新 id、端点重映射、偏移随粘贴次数递增 */
export function buildPaste(): { nodes: DiagramNode[]; edges: DiagramEdge[] } | null {
  if (!clipboard) return null
  pasteSerial += 1
  const offset = PASTE_OFFSET * pasteSerial
  const idMap = new Map<string, string>()
  const nodes = clipboard.nodes.map((n) => {
    const nid = createId()
    idMap.set(n.id, nid)
    return {
      ...structuredClone(n),
      id: nid,
      position: { x: n.position.x + offset, y: n.position.y + offset },
    }
  })
  const edges: DiagramEdge[] = clipboard.edges
    .map((e) => {
      const s = idMap.get(e.source)
      const t = idMap.get(e.target)
      if (!s || !t) return null
      return { ...structuredClone(e), id: createId(), source: s, target: t }
    })
    .filter((e): e is DiagramEdge => e !== null)
  return { nodes, edges }
}

/** Ctrl+D 副本：直接基于当前文档克隆（复用 core 纯函数） */
export function buildDuplicate(
  doc: DiagramDoc,
  nodeIds: string[],
): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  return cloneForPaste(doc, nodeIds, { x: PASTE_OFFSET, y: PASTE_OFFSET })
}

/** 测试辅助：清空剪贴板状态 */
export function _resetClipboardForTests(): void {
  clipboard = null
  pasteSerial = 0
}
