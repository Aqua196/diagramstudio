// 本地文档与远端文档的差异计算（纯函数，供 yjs 适配器在事务里应用）
import type { DiagramDoc } from '../model/types'

export interface DocDiff {
  setNodes: [string, DiagramDoc['nodes'][string]][]
  delNodes: string[]
  setEdges: [string, DiagramDoc['edges'][string]][]
  delEdges: string[]
  metaChanged: boolean
}

/** prev 为 null 表示房间尚无文档（首次写入） */
export function computeDocDiff(doc: DiagramDoc, prev: DiagramDoc | null): DocDiff {
  const setNodes: DocDiff['setNodes'] = []
  const delNodes: string[] = []
  const setEdges: DocDiff['setEdges'] = []
  const delEdges: string[] = []
  const prevNodes = prev?.nodes ?? {}
  const prevEdges = prev?.edges ?? {}
  for (const id of Object.keys(prevNodes)) {
    if (!doc.nodes[id]) delNodes.push(id)
  }
  for (const [id, n] of Object.entries(doc.nodes)) {
    if (prevNodes[id] !== n) setNodes.push([id, n])
  }
  for (const id of Object.keys(prevEdges)) {
    if (!doc.edges[id]) delEdges.push(id)
  }
  for (const [id, e] of Object.entries(doc.edges)) {
    if (prevEdges[id] !== e) setEdges.push([id, e])
  }
  const metaChanged =
    !prev ||
    prev.title !== doc.title ||
    prev.settings !== doc.settings ||
    prev.zOrder !== doc.zOrder
  return { setNodes, delNodes, setEdges, delEdges, metaChanged }
}
