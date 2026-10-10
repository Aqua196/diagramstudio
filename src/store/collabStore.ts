// 协作状态（SPEC §7）：房间号/连接状态/在线成员。
// 组件用法：useCollabStore(s => s.status)；画布 pointermove → pushCursor(flowPos)；
// 「分享」按钮 → share() 得链接；进入页面 initFromUrl() 自动加入 ?room= 参数的房间。
import { create } from 'zustand'
import type { CollabAdapter, CollabPeer } from '@/core/collab/adapter'
import { createCollabAdapter } from '@/core/collab/yjs'
import { setCollabBroadcast, useDocumentStore } from './documentStore'
import { createId } from '@/core/model/factories'

export type CollabStatus = 'off' | 'connecting' | 'connected' | 'offline'

export interface CollabStore {
  status: CollabStatus
  room: string | null
  peers: CollabPeer[]
  /** 加入房间；不传 room 则新建一个 */
  join: (room?: string) => string
  leave: () => void
  /** 生成分享链接并加入（供 EV.SHARE） */
  share: () => string
  /** 页面加载时检查 ?room= 参数自动加入 */
  initFromUrl: () => void
  pushCursor: (pos: { x: number; y: number } | null) => void
}

let adapter: CollabAdapter | null = null

export const useCollabStore = create<CollabStore>()((set, get) => ({
  status: 'off',
  room: null,
  peers: [],

  join: (room) => {
    const r = room && room.length > 0 ? room : `r-${createId().slice(0, 10)}`
    // StrictMode 双挂载/重复调用不重复建连（避免握手被前一个 provider 销毁打断）
    if (get().room === r && adapter) return r
    if (!adapter) adapter = createCollabAdapter()
    adapter.join({
      room: r,
      doc: useDocumentStore.getState().doc,
      callbacks: {
        onRemoteDoc: (doc) => {
          useDocumentStore.getState().setDoc(doc, { resetHistory: false, remote: true })
        },
        onPeers: (peers) => set({ peers }),
        onStatus: (status) =>
          set({
            status:
              status === 'connected' ? 'connected' : status === 'offline' ? 'offline' : 'connecting',
          }),
      },
    })
    set({ room: r, status: 'connecting' })
    setCollabBroadcast((doc) => adapter?.pushLocal(doc))
    return r
  },

  leave: () => {
    adapter?.leave()
    setCollabBroadcast(null)
    set({ status: 'off', room: null, peers: [] })
  },

  share: () => {
    const room = get().room ?? get().join()
    const url = new URL(window.location.href)
    url.searchParams.set('room', room)
    return url.toString()
  },

  initFromUrl: () => {
    const room = new URLSearchParams(window.location.search).get('room')
    if (room) get().join(room)
  },

  pushCursor: (pos) => {
    adapter?.pushCursor(pos)
  },
}))
