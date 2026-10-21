// 右上：在线成员 · 分享 · 导出（主按钮）· 更多。
import { useState } from 'react'
import { Download } from 'lucide-react'
import { useCollabStore } from '@/store/collabStore'
import { zh } from '@/i18n/zh'
import { ExportDialog } from './ExportDialog'
import { MoreMenu } from './MoreMenu'
import { SharePopover } from './SharePopover'

function PeerAvatars() {
  const peers = useCollabStore((s) => s.peers)
  if (peers.length === 0) return null
  return (
    <div className="ds-peers" role="group" aria-label={zh.collab.group}>
      {peers.slice(0, 4).map((p) => (
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

export function TopRightBar() {
  const [exporting, setExporting] = useState(false)
  return (
    <div className="ds-float ds-corner ds-corner-tr">
      <PeerAvatars />
      <SharePopover />
      <button type="button" className="ds-btn ds-btn-primary" onClick={() => setExporting(true)}>
        <Download size={15} /> {zh.editor.export}
      </button>
      <MoreMenu />
      {exporting && <ExportDialog onClose={() => setExporting(false)} />}
    </div>
  )
}
