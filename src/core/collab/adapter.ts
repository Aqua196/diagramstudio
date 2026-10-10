// 协作适配器接口（SPEC §7）：协作通过 CollabAdapter 接入，不得污染其他模块。
// 实现在 src/core/collab/yjs.ts（阶段7），其余模块只面向本接口。
import type { DiagramDoc } from '../model/types'

export interface CollabPeer {
  clientId: number
  name: string
  color: string
  /** 画布坐标下的光标位置 */
  cursor?: { x: number; y: number }
}

export interface CollabCallbacks {
  /** 远端文档变更（不进历史） */
  onRemoteDoc: (doc: DiagramDoc) => void
  /** 在线成员/光标变化 */
  onPeers: (peers: CollabPeer[]) => void
  /** 连接状态变化 */
  onStatus: (status: 'connecting' | 'connected' | 'offline') => void
}

export interface CollabAdapter {
  /** 加入房间；room 为 null/空时视为未开启协作（产品完全离线可用） */
  join(opts: { room: string; doc: DiagramDoc; callbacks: CollabCallbacks }): void
  /** 本地命令执行后调用：把文档差异在一次事务里写入远端 */
  pushLocal(doc: DiagramDoc): void
  /** 本地光标移动（高频，内部节流） */
  pushCursor(pos: { x: number; y: number } | null): void
  leave(): void
}
