// 协作状态（SPEC §7）：房间号/连接状态/在线成员。
// 组件用法：useCollabStore(s => s.status)；画布 pointermove → pushCursor(flowPos)；
// 「分享」按钮 → share() 得链接；进入页面 initFromUrl() 自动加入 ?room= 参数的房间。
import { create } from 'zustand'
import type { CollabAdapter, CollabPeer } from '@/core/collab/adapter'
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
let loading: Promise<CollabAdapter> | null = null
/** yjs 只有开启协作时才用到：按需加载，不进首屏（约 90KB） */
const loadAdapter = () =>
  (loading ??= import('@/core/collab/yjs').then((m) => (adapter = m.createCollabAdapter())))

type SetState = (partial: Partial<CollabStore>) => void

/** 协作库加载好后真正建连：远端文档回填（不进本地历史）、成员与连接状态写回，本地改动广播出去 */
function joinRoom(a: CollabAdapter, room: string, set: SetState): void {
  a.join({
    room,
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
  setCollabBroadcast((doc) => a.pushLocal(doc))
}

export const useCollabStore = create<CollabStore>()((set, get) => ({
  status: 'off',
  room: null,
  peers: [],

  join: (room) => {
    const r = room && room.length > 0 ? room : `r-${createId().slice(0, 10)}`
    // StrictMode 双挂载/重复调用不重复建连（避免握手被前一个 provider 销毁打断）
    if (get().room === r) return r
    set({ room: r, status: 'connecting' })
    void loadAdapter().then((a) => {
      if (get().room !== r) return // 加载期间已离开或换了房间
      joinRoom(a, r, set)
    })
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
