// 调试桥：暴露 window.__ds 供 Playwright 性能/压力测试注入文档与计时。
// 只读引用 + setDoc，不污染业务路径；生产包同样可用（无外部请求）。
import { createDoc, createEdge, createNode } from '@/core/model/factories'
import type { DiagramDoc } from '@/core/model/types'
import { useDocumentStore } from './documentStore'

export interface DsDebug {
  getDoc: () => DiagramDoc
  setDoc: (doc: DiagramDoc) => void
  /** 生成 n 节点 m 连线的压力测试文档（网格散布 + 顺序连线） */
  genDoc: (nodeCount: number, edgeCount: number) => DiagramDoc
  /** 返回当前文档渲染帧计时：requestAnimationFrame 两帧耗时 */
  measureFrame: () => Promise<number>
}

export function genStressDoc(nodeCount: number, edgeCount: number): DiagramDoc {
  const doc = createDoc('flowchart', `压测 ${nodeCount}/${edgeCount}`)
  const cols = Math.ceil(Math.sqrt(nodeCount))
  for (let i = 0; i < nodeCount; i++) {
    const n = createNode(
      'process',
      { x: (i % cols) * 170, y: Math.floor(i / cols) * 100 },
      { w: 140, h: 56 },
      `节点 ${i}`,
    )
    doc.nodes[n.id] = n
    doc.zOrder.push(n.id)
  }
  const ids = doc.zOrder
  for (let i = 0; i < edgeCount; i++) {
    const s = ids[i % nodeCount]
    const t = ids[(i * 7 + 13) % nodeCount]
    if (s === t) continue
    const e = createEdge(s, t)
    doc.edges[e.id] = e
  }
  return doc
}

export function installDebugBridge(): void {
  const dbg: DsDebug = {
    getDoc: () => useDocumentStore.getState().doc,
    setDoc: (doc) => useDocumentStore.getState().setDoc(doc),
    genDoc: genStressDoc,
    measureFrame: () =>
      new Promise((resolve) => {
        const t0 = performance.now()
        requestAnimationFrame(() => resolve(performance.now() - t0))
      }),
  }
  ;(window as unknown as { __ds: DsDebug }).__ds = dbg
}
