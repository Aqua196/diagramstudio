// 协作光标（A2）：其他成员的画布坐标光标+昵称，渲染进 RF 视口（随缩放平移）。
// 协作者颜色是动态数据，inline style 允许（见 DECISIONS）。
import { ViewportPortal } from '@xyflow/react'
import { useCollabStore } from '@/store/collabStore'
import { zh } from '@/i18n/zh'

export function PeerCursors() {
  const peers = useCollabStore((s) => s.peers)
  const shown = peers.filter((p) => p.cursor)
  if (shown.length === 0) return null
  return (
    <ViewportPortal>
      {shown.map((p) => (
        <div
          key={p.clientId}
          className="ds-peer-cursor ds-export-exclude"
          style={{
            transform: `translate(${p.cursor!.x}px, ${p.cursor!.y}px)`,
          }}
        >
          <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden>
            <path
              d="M1 1 L15 7.5 L8.5 9.5 L12 16.5 L9.5 17.5 L6 10.5 L1 14 Z"
              fill={p.color}
              stroke="var(--panel)"
              strokeWidth={1}
            />
          </svg>
          <span className="ds-peer-name" style={{ background: p.color }}>
            {p.name || zh.collab.peer}
          </span>
        </div>
      ))}
    </ViewportPortal>
  )
}
