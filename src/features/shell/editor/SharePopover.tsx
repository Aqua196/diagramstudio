// 分享弹层（A2）：说明协作是什么 → 一键开启并复制链接 → 显示连接状态与在线成员。
import * as Popover from '@radix-ui/react-popover'
import { Copy, Users } from 'lucide-react'
import { emit, EV } from '@/core/events'
import { useCollabStore } from '@/store/collabStore'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'

const c = zh.collab
const STATUS_TEXT = {
  off: '',
  connecting: c.connecting,
  connected: c.connected,
  offline: c.offline,
} as const

function roomLink(room: string): string {
  const url = new URL(window.location.href)
  url.searchParams.set('room', room)
  return url.toString()
}

function Joined({ room }: { room: string }) {
  const status = useCollabStore((s) => s.status)
  const peers = useCollabStore((s) => s.peers)
  const leave = useCollabStore((s) => s.leave)
  const link = roomLink(room)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      useUiStore.getState().pushToast('success', c.linkCopied)
    } catch {
      useUiStore.getState().pushToast('info', link)
    }
  }
  return (
    <>
      <div className="ds-share-link">
        <input
          className="ds-input"
          readOnly
          value={link}
          aria-label={c.copyLink}
          onFocus={(e) => e.target.select()}
        />
        <button type="button" className="ds-btn" onClick={() => void copy()}>
          <Copy size={14} /> {zh.common.copy}
        </button>
      </div>
      <div className="ds-share-status">
        <span className={`ds-status-dot is-${status}`} />
        {STATUS_TEXT[status]}
        <span className="ds-share-peers">
          {peers.map((p) => (
            <span
              key={p.clientId}
              className="ds-peer-avatar"
              style={{ background: p.color }}
              title={p.name}
            >
              {p.name.slice(0, 1)}
            </span>
          ))}
        </span>
      </div>
      {status !== 'connected' && <p className="ds-share-hint">{c.serverHint}</p>}
      <button
        type="button"
        className="ds-btn ds-btn-ghost ds-btn-sm ds-share-leave"
        onClick={() => {
          leave()
          const url = new URL(window.location.href)
          url.searchParams.delete('room')
          window.history.replaceState(null, '', url.toString())
        }}
      >
        {c.leave}
      </button>
    </>
  )
}

export function SharePopover() {
  const room = useCollabStore((s) => s.room)
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className="ds-btn ds-btn-ghost" aria-label={zh.editor.share}>
          <Users size={16} /> {zh.editor.share}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="ds-pop ds-share"
          align="end"
          sideOffset={10}
          collisionPadding={12}
        >
          <p className="ds-share-title">{c.title}</p>
          <p className="ds-share-desc">{c.desc}</p>
          {room ? (
            <Joined room={room} />
          ) : (
            <button
              type="button"
              className="ds-btn ds-btn-primary ds-btn-block"
              onClick={() => emit(EV.SHARE)}
            >
              {c.start}
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
