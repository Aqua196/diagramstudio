// 最近文档卡：缩略图 + 标题 + 类型与相对时间；右上菜单（打开/重命名/副本/删除确认）。
import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Copy, FolderOpen, MoreHorizontal, PencilLine, Trash2 } from 'lucide-react'
import { emit, EV } from '@/core/events'
import type { DiagramDoc } from '@/core/model/types'
import { fmt, zh } from '@/i18n/zh'
import { ActionDialog } from './ActionDialog'
import { MiniDiagram } from './MiniDiagram'
import { relativeTime } from './time'
import { markSharedSource } from '../transition'

function DocMenu({
  doc,
  onChanged,
  onRename,
  onDelete,
}: {
  doc: DiagramDoc
  onChanged: () => void
  onRename: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="ds-icon-btn ds-icon-btn-sm ds-doc-menu"
          aria-label={zh.home.docActions}
        >
          <MoreHorizontal size={16} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="ds-menu" align="end" sideOffset={6}>
          <DropdownMenu.Item
            className="ds-menu-item"
            onSelect={() => {
              markSharedSource(
                document.querySelector(`[data-doc-id="${CSS.escape(doc.id)}"] .ds-doc-thumb`),
              )
              emit(EV.OPEN_DOC, { id: doc.id })
            }}
          >
            <FolderOpen size={16} /> {zh.home.open}
          </DropdownMenu.Item>
          <DropdownMenu.Item className="ds-menu-item" onSelect={onRename}>
            <PencilLine size={16} /> {zh.common.rename}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="ds-menu-item"
            onSelect={() => {
              emit(EV.DUPLICATE_DOC, { id: doc.id })
              onChanged()
            }}
          >
            <Copy size={16} /> {zh.common.duplicate}
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="ds-menu-sep" />
          <DropdownMenu.Item className="ds-menu-item is-danger" onSelect={onDelete}>
            <Trash2 size={16} /> {zh.common.delete}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function CardDialogs({
  doc,
  onChanged,
  renaming,
  setRenaming,
  confirmDel,
  setConfirmDel,
}: {
  doc: DiagramDoc
  onChanged: () => void
  renaming: boolean
  setRenaming: (v: boolean) => void
  confirmDel: boolean
  setConfirmDel: (v: boolean) => void
}) {
  const [name, setName] = useState(doc.title)
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
            aria-label={zh.editor.docTitle}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
        }
        onConfirm={() => {
          if (name.trim()) emit(EV.RENAME_DOC, { id: doc.id, title: name.trim() })
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
        body={<p className="ds-muted">{fmt(zh.home.deleteConfirm, { name: doc.title })}</p>}
        onConfirm={() => {
          emit(EV.DELETE_DOC, { id: doc.id })
          setConfirmDel(false)
          onChanged()
        }}
      />
    </>
  )
}

export function DocCard({ doc, onChanged }: { doc: DiagramDoc; onChanged: () => void }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const [renaming, setRenaming] = useState(false)
  return (
    <article className="ds-doc-card" data-doc-id={doc.id}>
      <button
        type="button"
        className="ds-doc-open"
        onClick={(e) => {
          // 缩略图将「长成」编辑器画布（返回首页时再形变回这里）
          markSharedSource(e.currentTarget.querySelector('.ds-doc-thumb'))
          emit(EV.OPEN_DOC, { id: doc.id })
        }}
      >
        <span className="ds-doc-thumb">
          <MiniDiagram doc={doc} className="ds-doc-mini" />
        </span>
        <span className="ds-doc-info">
          <span className="ds-doc-title">{doc.title || zh.editor.docTitle}</span>
          <span className="ds-doc-sub">
            <span className={`ds-type-badge is-${doc.type}`}>{zh.plugins.typeNames[doc.type]}</span>
            {relativeTime(doc.updatedAt)}
          </span>
        </span>
      </button>
      <DocMenu
        doc={doc}
        onChanged={onChanged}
        onRename={() => setRenaming(true)}
        onDelete={() => setConfirmDel(true)}
      />
      <CardDialogs
        doc={doc}
        onChanged={onChanged}
        renaming={renaming}
        setRenaming={setRenaming}
        confirmDel={confirmDel}
        setConfirmDel={setConfirmDel}
      />
    </article>
  )
}
