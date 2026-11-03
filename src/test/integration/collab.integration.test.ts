// @vitest-environment node
// 实验 9 集成测试（三）：协作适配器 × y-websocket 协议 × 项目自带的协作服务（server/dev.mjs）。
// 在随机端口启动真实服务，两个真实的 YjsCollabAdapter 经 WebSocket 加入同一房间，不打桩。
import { spawn, type ChildProcess } from 'node:child_process'
import WebSocketImpl from 'ws'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { CollabAdapter, CollabPeer } from '@/core/collab/adapter'
import { createDoc, createNode } from '@/core/model/factories'
import type { DiagramDoc } from '@/core/model/types'

const PORT = 20000 + Math.floor(Math.random() * 20000)
let server: ChildProcess
let createCollabAdapter: () => CollabAdapter

beforeAll(async () => {
  server = spawn(process.execPath, ['server/dev.mjs'], {
    env: { ...process.env, DS_COLLAB_PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  await new Promise<void>((resolve) => server.stdout!.once('data', () => resolve()))
  vi.stubEnv('VITE_COLLAB_WS', `ws://127.0.0.1:${PORT}`)
  // Node.js 22 起才有内置 WebSocket；CI 按 .nvmrc 用 Node.js 20，此时改用协作服务同样依赖的 ws 包
  if (typeof globalThis.WebSocket === 'undefined') vi.stubGlobal('WebSocket', WebSocketImpl)
  ;({ createCollabAdapter } = await import('@/core/collab/yjs'))
}, 15_000)

afterAll(() => {
  server.kill()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

/** 加入房间并记录回调；返回最近一次收到的远端文档与成员 */
function member(room: string, doc: DiagramDoc) {
  const seen = { doc: null as DiagramDoc | null, peers: [] as CollabPeer[], status: '' }
  const adapter = createCollabAdapter()
  adapter.join({
    room,
    doc,
    callbacks: {
      onRemoteDoc: (d) => (seen.doc = d),
      onPeers: (p) => (seen.peers = p),
      onStatus: (s) => (seen.status = s),
    },
  })
  return { adapter, seen }
}

const until = (ok: () => boolean) => vi.waitFor(() => expect(ok()).toBe(true), { timeout: 5000 })

describe('协作适配器 × 协作服务', () => {
  it('I9 A 以本地文档初始化房间；B 加入后收到 A 的文档；B 的修改回到 A', async () => {
    const room = `it-${PORT}-1`
    const docA = createDoc('flowchart', 'A 的图')
    const n1 = createNode('process', { x: 0, y: 0 }, undefined, '甲')
    docA.nodes[n1.id] = n1
    docA.zOrder.push(n1.id)
    const a = member(room, docA)
    await until(() => a.seen.status === 'connected')

    const b = member(room, createDoc('flowchart', 'B 的空白图'))
    await until(() => b.seen.doc !== null)
    expect(b.seen.doc!.title).toBe('A 的图')
    expect(b.seen.doc!.nodes[n1.id].text).toBe('甲')

    const n2 = createNode('process', { x: 200, y: 0 }, undefined, '乙')
    b.adapter.pushLocal({
      ...b.seen.doc!,
      nodes: { ...b.seen.doc!.nodes, [n2.id]: n2 },
      zOrder: [n1.id, n2.id],
    })
    await until(() => a.seen.doc?.nodes[n2.id]?.text === '乙')
    a.adapter.leave()
    b.adapter.leave()
  })

  it('I10 光标位置经 awareness 送达对方，离开后对方的成员列表变空', async () => {
    const room = `it-${PORT}-2`
    const a = member(room, createDoc('flowchart'))
    const b = member(room, createDoc('flowchart'))
    await until(() => a.seen.status === 'connected' && b.seen.status === 'connected')
    a.adapter.pushCursor({ x: 12, y: 34 })
    await until(() => b.seen.peers.some((p) => p.cursor?.x === 12 && p.cursor?.y === 34))
    a.adapter.leave()
    await until(() => b.seen.peers.length === 0)
    b.adapter.leave()
  })

  it('I11 房间里的文档还没有节点时，后加入的成员不会用自己的空白文档覆盖它', async () => {
    const room = `it-${PORT}-3`
    const er = createDoc('er', '订单系统')
    const a = member(room, er)
    await until(() => a.seen.status === 'connected')
    const b = member(room, createDoc('flowchart', '未命名图表'))
    await until(() => b.seen.status === 'connected')
    await new Promise((r) => setTimeout(r, 300))
    // B 应采用房间里的文档；A 这边的文档也不应被改成 B 的
    expect(b.seen.doc?.title).toBe('订单系统')
    expect(b.seen.doc?.type).toBe('er')
    expect(a.seen.doc).toBeNull()
    a.adapter.leave()
    b.adapter.leave()
  })
})
