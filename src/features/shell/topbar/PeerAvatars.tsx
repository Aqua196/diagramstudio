// 协作状态与在线头像（A2）：连接状态圆点 + 成员首字彩色圆（aria-label=昵称）。
import { useCollabStore } from '@/store/collabStore'
import { zh } from '@/i18n/zh'

const STATUS_TEXT = {
  off: '',
  connecting: zh.collab.connecting,
  connected: zh.collab.connected,
  offline: zh.collab.offline,
} as const

export function PeerAvatars() {
  const status = useCollabStore((s) => s.status)
  const peers = useCollabStore((s) => s.peers)
  if (status === 'off') return null
  return (
    <div className="ds-peers" role="group" aria-label={zh.collab.group}>
      <span className={`ds-peer-status is-${status}`}>{STATUS_TEXT[status]}</span>
      {peers.map((p) => (
        <span
          key={p.clientId}
          className="ds-peer-avatar"
          style={{ background: p.color }}
          aria-label={p.name}
          title={p.name}
        >
          {p.name.slice(0, 1)}
        </span>
      ))}
    </div>
  )
}
