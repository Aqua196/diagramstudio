// CollabAdapter 的 yjs 实现（SPEC §7）：doc 的 nodes/edges/zOrder/title/settings
// 存进 Y.Map，远端增量一次性回填（不进本地历史）；光标走 awareness。
// 协作文档以「房间里第一份到达的文档」为初始内容，之后以 Y.Doc 为准。
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import type { CollabAdapter, CollabCallbacks, CollabPeer } from './adapter'
import { computeDocDiff } from './diff'
import type { DiagramDoc } from '../model/types'

const SERVER_URL = () =>
  (import.meta.env.VITE_COLLAB_WS as string | undefined) ?? 'ws://127.0.0.1:1234'

const PEER_COLORS = ['#E05D44', '#2E9E8F', '#3D7BE0', '#B8860B', '#8C5BBE', '#C94F7C', '#4C9F70']

interface PeerState {
  name?: string
  color?: string
  cursor?: { x: number; y: number } | null
}

class YjsCollabAdapter implements CollabAdapter {
  private provider: WebsocketProvider | null = null
  private ydoc: Y.Doc | null = null
  private callbacks: CollabCallbacks | null = null
  private applyingRemote = false
  private joined = false
  private lastCursorSent = 0

  join(opts: { room: string; doc: DiagramDoc; callbacks: CollabCallbacks }): void {
    this.leave()
    this.callbacks = opts.callbacks
    this.callbacks.onStatus('connecting')

    const ydoc = new Y.Doc()
    this.ydoc = ydoc
    const provider = new WebsocketProvider(SERVER_URL(), opts.room, ydoc, {
      connect: true,
    })
    this.provider = provider

    const meta = ydoc.getMap<unknown>('meta')
    const nodes = ydoc.getMap<unknown>('nodes')
    const edges = ydoc.getMap<unknown>('edges')

    // 首次同步完成：房间为空则以本地文档初始化；否则采用房间文档
    provider.on('sync', (isSynced: boolean) => {
      if (!isSynced || this.joined) return
      this.joined = true
      const remoteDoc = this.readDoc(ydoc)
      if (!remoteDoc || Object.keys(remoteDoc.nodes).length === 0) {
        this.pushLocal(opts.doc)
      } else {
        this.applyingRemote = true
        this.callbacks?.onRemoteDoc(remoteDoc)
        this.applyingRemote = false
      }
      this.callbacks?.onStatus('connected')
    })

    provider.on('status', ({ status }: { status: string }) => {
      this.callbacks?.onStatus(status === 'connected' ? 'connected' : 'connecting')
    })

    // 远端变更 → 合并回本地（observer 粒度到 key）
    const onChange = () => {
      if (this.applyingRemote) return
      const remote = this.readDoc(ydoc)
      if (remote) {
        this.applyingRemote = true
        this.callbacks?.onRemoteDoc(remote)
        this.applyingRemote = false
      }
    }
    nodes.observeDeep(onChange)
    edges.observeDeep(onChange)
    meta.observeDeep(onChange)

    // awareness：成员昵称/颜色/光标
    const awareness = provider.awareness
    awareness.setLocalStateField('name', `用户${ydoc.clientID % 100}`)
    awareness.setLocalStateField('color', PEER_COLORS[ydoc.clientID % PEER_COLORS.length])
    awareness.on('update', () => {
      const peers: CollabPeer[] = []
      for (const [clientId, st] of awareness.getStates()) {
        if (clientId === ydoc.clientID) continue
        const s = st as PeerState
        peers.push({
          clientId,
          name: s.name ?? `用户${clientId % 100}`,
          color: s.color ?? PEER_COLORS[clientId % PEER_COLORS.length],
          cursor: s.cursor ?? undefined,
        })
      }
      this.callbacks?.onPeers(peers)
    })
  }

  private readDoc(ydoc: Y.Doc): DiagramDoc | null {
    const meta = ydoc.getMap<unknown>('meta')
    const doc = meta.get('doc') as DiagramDoc | undefined
    if (!doc) return null
    const nodes = ydoc.getMap<unknown>('nodes')
    const edges = ydoc.getMap<unknown>('edges')
    const next: DiagramDoc = {
      ...doc,
      nodes: {},
      edges: {},
      zOrder: (meta.get('zOrder') as string[] | undefined) ?? doc.zOrder,
      updatedAt: Date.now(),
    }
    nodes.forEach((v, k) => {
      next.nodes[k] = v as DiagramDoc['nodes'][string]
    })
    edges.forEach((v, k) => {
      next.edges[k] = v as DiagramDoc['edges'][string]
    })
    return next
  }

  pushLocal(doc: DiagramDoc): void {
    const ydoc = this.ydoc
    if (!ydoc || this.applyingRemote) return
    const prev = this.readDoc(ydoc)
    const diff = computeDocDiff(doc, prev)
    const nodes = ydoc.getMap<unknown>('nodes')
    const edges = ydoc.getMap<unknown>('edges')
    const meta = ydoc.getMap<unknown>('meta')
    ydoc.transact(() => {
      if (diff.metaChanged) {
        meta.set('doc', { ...doc, nodes: {}, edges: {}, zOrder: [] })
        meta.set('zOrder', doc.zOrder)
      }
      for (const id of diff.delNodes) nodes.delete(id)
      for (const [id, n] of diff.setNodes) nodes.set(id, n)
      for (const id of diff.delEdges) edges.delete(id)
      for (const [id, e] of diff.setEdges) edges.set(id, e)
    })
  }

  pushCursor(pos: { x: number; y: number } | null): void {
    const now = Date.now()
    if (now - this.lastCursorSent < 50 && pos !== null) return // 20fps 节流
    this.lastCursorSent = now
    this.provider?.awareness.setLocalStateField('cursor', pos)
  }

  leave(): void {
    this.provider?.awareness.setLocalState(null)
    this.provider?.destroy()
    this.ydoc?.destroy()
    this.provider = null
    this.ydoc = null
    this.joined = false
    this.callbacks = null
  }
}

export function createCollabAdapter(): CollabAdapter {
  return new YjsCollabAdapter()
}
