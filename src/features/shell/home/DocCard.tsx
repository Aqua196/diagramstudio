// 首页文档卡：打开 / 重命名 / 副本 / 删除（确认对话框）（C1 从 HomePage 拆出）。
import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreVertical } from 'lucide-react'
import { emit, EV } from '@/core/events'
import { zh } from '@/i18n/zh'
import type { DocIndexEntry } from '../docs/docsStore'
import { ActionDialog } from './ActionDialog'

function formatTime(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function DocMenu({
  entry,
  onChanged,
  onRename,
  onDelete,
}: {
  entry: DocIndexEntry
  onChanged: () => void
  onRename: () => void
  onDelete: () => void
}) {
  return (
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
          <DropdownMenu.Item className="ds-menu-item" onSelect={onRename}>
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
          <DropdownMenu.Item className="ds-menu-item ds-menu-danger" onSelect={onDelete}>
            {zh.common.delete}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function OpenButton({ entry }: { entry: DocIndexEntry }) {
  return (
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
  )
}

interface CardDialogsProps {
  entry: DocIndexEntry
  onChanged: () => void
  renaming: boolean
  setRenaming: (v: boolean) => void
  confirmDel: boolean
  setConfirmDel: (v: boolean) => void
}

function CardDialogs({
  entry,
  onChanged,
  renaming,
  setRenaming,
  confirmDel,
  setConfirmDel,
}: CardDialogsProps) {
  const [name, setName] = useState(entry.title)
  return (
    <>
      <ActionDialog
        open={renaming}
        onOpenChange={setRenaming}
        title={zh.common.rename}
        confirmLabel={zh.common.confirm}
        body={
          <input
            className="ds-input"
            value={name}
            autoFocus
            aria-label={zh.topbar.docTitle}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
        }
        onConfirm={() => {
          if (name.trim()) emit(EV.RENAME_DOC, { id: entry.id, title: name.trim() })
          setRenaming(false)
          onChanged()
        }}
      />
      <ActionDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title={zh.home.deleteTitle}
        confirmLabel={zh.common.delete}
        danger
        body={<p className="ds-muted">{zh.home.deleteConfirm}</p>}
        onConfirm={() => {
          emit(EV.DELETE_DOC, { id: entry.id })
          setConfirmDel(false)
          onChanged()
        }}
      />
    </>
  )
}

export function DocCard({ entry, onChanged }: { entry: DocIndexEntry; onChanged: () => void }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const [renaming, setRenaming] = useState(false)
  return (
    <div className="ds-doc-card">
      <OpenButton entry={entry} />
      <DocMenu
        entry={entry}
        onChanged={onChanged}
        onRename={() => setRenaming(true)}
        onDelete={() => setConfirmDel(true)}
      />
      <CardDialogs
        entry={entry}
        onChanged={onChanged}
        renaming={renaming}
        setRenaming={setRenaming}
        confirmDel={confirmDel}
        setConfirmDel={setConfirmDel}
      />
    </div>
  )
}
