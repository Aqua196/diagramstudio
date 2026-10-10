// 首页：三种图的新建入口卡 + 文档列表（localStorage 索引），
// 每卡带模板缩略示意；文档支持打开/重命名/副本/删除。
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { FilePlus2, MoreVertical, Upload } from 'lucide-react'
import { emit, EV } from '@/core/events'
import type { DiagramType } from '@/core/model/types'
import { getPlugin } from '@/plugins/registry'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'
import { listDocs, type DocIndexEntry } from '../docs/docsStore'

const TYPES: DiagramType[] = ['flowchart', 'mindmap', 'er']
const DESCS = {
  flowchart: zh.home.newFlowchartDesc,
  mindmap: zh.home.newMindmapDesc,
  er: zh.home.newErDesc,
}

/** 模板缩略示意：直接把模板文档的节点/连线缩小画成 SVG（无节点时画形状轮廓） */
function Thumb({ type }: { type: DiagramType }) {
  const doc = getPlugin(type).templates[0]
  const nodes = doc ? Object.values(doc.nodes) : []
  const edges = doc ? Object.values(doc.edges) : []
  const W = 220
  const H = 96
  if (nodes.length === 0) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="ds-thumb" aria-hidden>
        <rect x={16} y={34} width={56} height={26} rx={2} className="ds-thumb-node" />
        <rect x={140} y={18} width={56} height={26} rx={2} className="ds-thumb-node" />
        <polygon points="168,52 192,66 168,80 144,66" className="ds-thumb-node" />
        <line x1={72} y1={44} x2={140} y2={31} className="ds-thumb-edge" />
        <line x1={72} y1={50} x2={144} y2={66} className="ds-thumb-edge" />
      </svg>
    )
  }
  const minX = Math.min(...nodes.map((n) => n.position.x))
  const minY = Math.min(...nodes.map((n) => n.position.y))
  const maxX = Math.max(...nodes.map((n) => n.position.x + n.size.w))
  const maxY = Math.max(...nodes.map((n) => n.position.y + n.size.h))
  const s = Math.min((W - 16) / Math.max(1, maxX - minX), (H - 16) / Math.max(1, maxY - minY))
  const tx = (v: number) => 8 + (v - minX) * s
  const ty = (v: number) => 8 + (v - minY) * s
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ds-thumb" aria-hidden>
      {edges.map((e) => {
        const a = doc!.nodes[e.source]
        const b = doc!.nodes[e.target]
        if (!a || !b) return null
        return (
          <line
            key={e.id}
            x1={tx(a.position.x + a.size.w / 2)}
            y1={ty(a.position.y + a.size.h / 2)}
            x2={tx(b.position.x + b.size.w / 2)}
            y2={ty(b.position.y + b.size.h / 2)}
            className="ds-thumb-edge"
          />
        )
      })}
      {nodes.map((n) => (
        <rect
          key={n.id}
          x={tx(n.position.x)}
          y={ty(n.position.y)}
          width={Math.max(3, n.size.w * s)}
          height={Math.max(3, n.size.h * s)}
          rx={1.5}
          className="ds-thumb-node"
        />
      ))}
    </svg>
  )
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function DocCard({ entry, onChanged }: { entry: DocIndexEntry; onChanged: () => void }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(entry.title)
  return (
    <div className="ds-doc-card">
      <button
        type="button"
        className="ds-doc-open"
        onClick={() => emit(EV.OPEN_DOC, { id: entry.id })}
      >
        <span className="ds-doc-title">{entry.title || zh.topbar.docTitle}</span>
        <span className="ds-doc-meta">
          {zh.plugins.typeNames[entry.type]} · {zh.home.updated} {formatTime(entry.updatedAt)}
        </span>
      </button>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button type="button" className="ds-icon-btn" aria-label={zh.menus.actions}>
            <MoreVertical size={15} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="ds-menu" align="end" sideOffset={4}>
            <DropdownMenu.Item
              className="ds-menu-item"
              onSelect={() => emit(EV.OPEN_DOC, { id: entry.id })}
            >
              {zh.menus.open}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="ds-menu-item"
              onSelect={() => {
                setName(entry.title)
                setRenaming(true)
              }}
            >
              {zh.common.rename}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="ds-menu-item"
              onSelect={() => {
                emit(EV.DUPLICATE_DOC, { id: entry.id })
                onChanged()
              }}
            >
              {zh.common.duplicate}
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="ds-menu-sep" />
            <DropdownMenu.Item
              className="ds-menu-item ds-menu-danger"
              onSelect={() => setConfirmDel(true)}
            >
              {zh.common.delete}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Dialog.Root open={renaming} onOpenChange={setRenaming}>
        <Dialog.Portal>
          <Dialog.Overlay className="ds-overlay" />
          <Dialog.Content className="ds-dialog" aria-describedby={undefined}>
            <Dialog.Title className="ds-dialog-title">{zh.common.rename}</Dialog.Title>
            <input
              className="ds-input"
              value={name}
              autoFocus
              aria-label={zh.topbar.docTitle}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
            <div className="ds-dialog-actions">
              <Dialog.Close asChild>
                <button type="button" className="ds-btn">
                  {zh.common.cancel}
                </button>
              </Dialog.Close>
              <button
                type="button"
                className="ds-btn ds-btn-primary"
                onClick={() => {
                  if (name.trim()) emit(EV.RENAME_DOC, { id: entry.id, title: name.trim() })
                  setRenaming(false)
                  onChanged()
                }}
              >
                {zh.common.confirm}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={confirmDel} onOpenChange={setConfirmDel}>
        <Dialog.Portal>
          <Dialog.Overlay className="ds-overlay" />
          <Dialog.Content className="ds-dialog" aria-describedby={undefined}>
            <Dialog.Title className="ds-dialog-title">{zh.home.deleteTitle}</Dialog.Title>
            <p className="ds-muted">{zh.home.deleteConfirm}</p>
            <div className="ds-dialog-actions">
              <Dialog.Close asChild>
                <button type="button" className="ds-btn">
                  {zh.common.cancel}
                </button>
              </Dialog.Close>
              <button
                type="button"
                className="ds-btn ds-btn-danger"
                onClick={() => {
                  emit(EV.DELETE_DOC, { id: entry.id })
                  setConfirmDel(false)
                  onChanged()
                }}
              >
                {zh.common.delete}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

export default function HomePage() {
  const [, setTick] = useState(0)
  const refresh = () => setTick((n) => n + 1)
  const docs = listDocs()
  const theme = useUiStore((s) => s.resolvedTheme)
  const setTheme = useUiStore((s) => s.setTheme)

  return (
    <main className="ds-home">
      <header className="ds-home-head">
        <h1 className="ds-home-logo">{zh.app.name}</h1>
        <div className="ds-home-actions">
          <button type="button" className="ds-btn" onClick={() => emit(EV.IMPORT_JSON)}>
            <Upload size={14} /> {zh.home.importJson}
          </button>
          <button
            type="button"
            className="ds-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={zh.topbar.theme}
          >
            {theme === 'dark' ? zh.topbar.themeLight : zh.topbar.themeDark}
          </button>
        </div>
      </header>

      <section>
        <h2 className="ds-panel-title">{zh.home.heading}</h2>
        <div className="ds-new-grid">
          {TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className="ds-new-card"
              onClick={() => emit(EV.NEW_DOC, { type })}
            >
              <Thumb type={type} />
              <span className="ds-new-name">
                <FilePlus2 size={14} /> {zh.plugins.typeNames[type]}
              </span>
              <span className="ds-new-desc">{DESCS[type]}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="ds-panel-title">{zh.home.myDocs}</h2>
        {docs.length === 0 ? (
          <p className="ds-muted">{zh.home.empty}</p>
        ) : (
          <div className="ds-doc-grid">
            {docs.map((d) => (
              <DocCard key={d.id} entry={d} onChanged={refresh} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
