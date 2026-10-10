// YjsCollabAdapter：用假 WebsocketProvider（真 Y.Doc + 真 Awareness）覆盖
// join/sync 初始化、pushLocal 差异写入、pushCursor 节流、leave 清理。
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Handler = (...args: never[]) => void

// vi.mock 工厂提升到文件顶部执行，类与实例表都经 vi.hoisted 共享
const h = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const state: { instances: any[] } = { instances: [] }
  return { state }
})

vi.mock('y-websocket', async () => {
  const { Awareness: Aw } = await import('y-protocols/awareness')
  class FakeProvider {
    readonly awareness: InstanceType<typeof Aw>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly ydoc: any
    destroyed = false
    private handlers = new Map<string, Handler[]>()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(_url: string, _room: string, ydoc: any, _opts?: unknown) {
      this.ydoc = ydoc
      this.awareness = new Aw(ydoc)
      h.state.instances.push(this)
    }

    on(evt: string, cb: Handler): void {
      this.handlers.set(evt, [...(this.handlers.get(evt) ?? []), cb])
    }

    fire(evt: string, ...args: unknown[]): void {
      for (const cb of this.handlers.get(evt) ?? []) cb(...(args as never[]))
    }

    destroy(): void {
      this.destroyed = true
      this.awareness.destroy()
    }
  }
  return { WebsocketProvider: FakeProvider }
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FakeProvider = any

import { createCollabAdapter } from './yjs'
import { createDoc, createNode } from '../model/factories'

function setup() {
  const doc = createDoc('flowchart', '协作')
  const n = createNode('process', { x: 1, y: 2 })
  doc.nodes[n.id] = n
  doc.zOrder = [n.id]
  const callbacks = {
    onRemoteDoc: vi.fn(),
    onPeers: vi.fn(),
    onStatus: vi.fn(),
  }
  const adapter = createCollabAdapter()
  adapter.join({ room: 'r1', doc, callbacks })
  const provider: FakeProvider = h.state.instances[h.state.instances.length - 1]
  return { adapter, provider, doc, callbacks, n }
}

beforeEach(() => {
  h.state.instances = []
})

describe('YjsCollabAdapter', () => {
  it('join 立刻报 connecting，sync 后房间为空则以本地文档初始化', () => {
    const { provider, callbacks, n } = setup()
    expect(callbacks.onStatus).toHaveBeenCalledWith('connecting')
    provider.fire('sync', true)
    expect(callbacks.onStatus).toHaveBeenLastCalledWith('connected')
    // 本地文档被写入 Y.Map
    const ydoc = provider.ydoc
    expect(ydoc.getMap('nodes').get(n.id)).toBeDefined()
    // 重复 sync 不重复初始化
    provider.fire('sync', true)
    expect(callbacks.onStatus).toHaveBeenCalledTimes(2)
  })

  it('sync 时房间已有文档则回灌 onRemoteDoc', () => {
    const doc = createDoc('flowchart')
    const callbacks = { onRemoteDoc: vi.fn(), onPeers: vi.fn(), onStatus: vi.fn() }
    const adapter = createCollabAdapter()
    adapter.join({ room: 'r2', doc, callbacks })
    const provider: FakeProvider = h.state.instances[0]
    // 模拟远端先行写入
    const remote = createDoc('flowchart', '远端')
    const rn = createNode('process', { x: 9, y: 9 })
    remote.nodes[rn.id] = rn
    remote.zOrder = [rn.id]
    provider.ydoc.getMap('meta').set('doc', { ...remote, nodes: {}, edges: {}, zOrder: [] })
    provider.ydoc.getMap('meta').set('zOrder', remote.zOrder)
    provider.ydoc.getMap('nodes').set(rn.id, rn)
    provider.fire('sync', true)
    expect(callbacks.onRemoteDoc).toHaveBeenCalled()
    // 拿最后一次回调（map 写入过程也会触发 observe 回调，内容随写递增）
    const received = callbacks.onRemoteDoc.mock.calls.at(-1)![0]
    expect(Object.keys(received.nodes)).toContain(rn.id)
    adapter.leave()
  })

  it('pushLocal 把增量写入 nodes/edges/meta', () => {
    const { adapter, provider, doc } = setup()
    provider.fire('sync', true)
    const next = { ...doc, title: '改名' }
    const add = createNode('decision', { x: 5, y: 5 })
    next.nodes = { ...doc.nodes, [add.id]: add }
    next.zOrder = [...doc.zOrder, add.id]
    adapter.pushLocal(next)
    const ydoc = provider.ydoc
    expect(ydoc.getMap('nodes').get(add.id)).toBeDefined()
    // 删除节点同样下沉
    const gone = { ...next, nodes: { [add.id]: add }, zOrder: [add.id] }
    adapter.pushLocal(gone)
    expect(ydoc.getMap('nodes').get(Object.keys(doc.nodes)[0])).toBeUndefined()
  })

  it('远端 map 变更经 observeDeep 回调 onRemoteDoc', () => {
    const { provider, callbacks } = setup()
    provider.fire('sync', true)
    callbacks.onRemoteDoc.mockClear()
    const rn = createNode('process', { x: 0, y: 0 })
    provider.ydoc.getMap('nodes').set(rn.id, rn)
    expect(callbacks.onRemoteDoc).toHaveBeenCalled()
    const received = callbacks.onRemoteDoc.mock.calls.at(-1)![0]
    expect(Object.keys(received.nodes)).toContain(rn.id)
  })

  it('pushCursor 20fps 节流，null 总可通过', () => {
    const { adapter, provider } = setup()
    vi.useFakeTimers()
    adapter.pushCursor({ x: 1, y: 1 })
    adapter.pushCursor({ x: 2, y: 2 }) // 节流窗口内被丢
    expect(provider.awareness.getLocalState()?.cursor).toEqual({ x: 1, y: 1 })
    adapter.pushCursor(null) // 离开总是发送
    expect(provider.awareness.getLocalState()?.cursor).toBeNull()
    vi.advanceTimersByTime(60)
    adapter.pushCursor({ x: 3, y: 3 })
    expect(provider.awareness.getLocalState()?.cursor).toEqual({ x: 3, y: 3 })
    vi.useRealTimers()
  })

  it('awareness update 汇总远端 peers（不含自己）', () => {
    const { provider, callbacks } = setup()
    provider.fire('sync', true)
    provider.awareness.states.set(999, {
      name: '甲',
      color: '#fff',
      cursor: { x: 1, y: 2 },
    })
    provider.awareness.emit('update', [])
    expect(callbacks.onPeers).toHaveBeenCalledWith([
      expect.objectContaining({ clientId: 999, name: '甲', cursor: { x: 1, y: 2 } }),
    ])
  })

  it('leave 销毁 provider 且 pushLocal 静默', () => {
    const { adapter, provider } = setup()
    adapter.leave()
    expect(provider.destroyed).toBe(true)
    adapter.pushLocal(createDoc('mindmap')) // 不抛错
  })
})

