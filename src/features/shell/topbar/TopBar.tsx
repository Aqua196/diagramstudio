// 顶栏 48px：产品名/可编辑文档名｜撤销重做·缩放·自动布局｜
// 面板开关·小地图·主题·保存状态·导出菜单·分享·快捷键。
import { useEffect, useState } from 'react'
import {
  Download,
  Maximize,
  Minus,
  Moon,
  MoreHorizontal,
  Plus,
  Redo2,
  Sun,
  Undo2,
} from 'lucide-react'
import { useReactFlow } from '@xyflow/react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { emit, EV } from '@/core/events'
import { setDocTitle } from '@/core/commands/ops'
import type { DiagramType } from '@/core/model/types'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'
import { IconButton } from '@/components/IconButton'
import { setDocType } from '@/features/canvas/commands'
import { ExportDialog, type ExportFormat } from './ExportDialog'
import { PeerAvatars } from './PeerAvatars'

const TYPES: DiagramType[] = ['flowchart', 'mindmap', 'er']

function DocTitle() {
  const title = useDocumentStore((s) => s.doc.title)
  const execute = useDocumentStore((s) => s.execute)
  const [draft, setDraft] = useState<string | null>(null)
  return draft === null ? (
    <button
      type="button"
      className="ds-title"
      aria-label={zh.topbar.docTitle}
      onClick={() => setDraft(title)}
    >
      {title || zh.topbar.docTitle}
    </button>
  ) : (
    <input
      className="ds-input ds-title-input"
      value={draft}
      autoFocus
      aria-label={zh.topbar.docTitle}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft.trim() && draft !== title) execute(setDocTitle(draft.trim()))
        setDraft(null)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') setDraft(null)
        e.stopPropagation()
      }}
    />
  )
}

function SaveStatus() {
  const lastSavedAt = useUiStore((s) => s.lastSavedAt)
  if (!lastSavedAt) return null
  const t = new Date(lastSavedAt)
  const hh = String(t.getHours()).padStart(2, '0')
  const mm = String(t.getMinutes()).padStart(2, '0')
  return (
    <span className="ds-save-status" aria-live="polite">
      {zh.topbar.savedPrefix} {hh}:{mm}
    </span>
  )
}

export function TopBar() {
  const doc = useDocumentStore((s) => s.doc)
  const execute = useDocumentStore((s) => s.execute)
  const canUndo = useDocumentStore((s) => s.canUndo)
  const canRedo = useDocumentStore((s) => s.canRedo)
  const undoLabel = useDocumentStore((s) => s.undoLabel)
  const redoLabel = useDocumentStore((s) => s.redoLabel)
  const undo = useDocumentStore((s) => s.undo)
  const redo = useDocumentStore((s) => s.redo)
  const ui = useUiStore()
  const rf = useReactFlow()
  const zoom = useUiStore((s) => s.zoom)
  const [, force] = useState(0)
  useEffect(() => useUiStore.subscribe(() => force((n) => n + 1)), [])
  const [exportDlg, setExportDlg] = useState<ExportFormat | null>(null)

  return (
    <header className="ds-topbar">
      <div className="ds-topbar-left">
        <button
          type="button"
          className="ds-logo"
          aria-label={zh.topbar.home}
          onClick={() => ui.setRoute('home')}
        >
          {zh.app.name}
        </button>
        <DocTitle />
      </div>

      <div className="ds-topbar-center">
        <div className="ds-segment" role="group" aria-label={zh.topbar.docType}>
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={`ds-segment-btn${doc.type === t ? ' is-active' : ''}`}
              onClick={() => doc.type !== t && execute(setDocType(t))}
            >
              {zh.plugins.typeNames[t]}
            </button>
          ))}
        </div>
        <IconButton
          icon={<Undo2 size={15} />}
          aria-label={zh.common.undo}
          title={undoLabel ? `${zh.common.undo}：${undoLabel}` : zh.topbar.undoEmpty}
          disabled={!canUndo}
          onClick={undo}
        />
        <IconButton
          icon={<Redo2 size={15} />}
          aria-label={zh.common.redo}
          title={redoLabel ? `${zh.common.redo}：${redoLabel}` : zh.topbar.redoEmpty}
          disabled={!canRedo}
          onClick={redo}
        />
        <div className="ds-zoom-group" role="group" aria-label={zh.topbar.zoomReset}>
          <button
            type="button"
            className="ds-icon-btn"
            aria-label={zh.topbar.zoomOut}
            onClick={() => rf.zoomOut({ duration: 120 })}
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            className="ds-zoom-val"
            aria-label={zh.topbar.zoomReset}
            title={zh.topbar.zoomReset}
            onClick={() => rf.zoomTo(1, { duration: 120 })}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            className="ds-icon-btn"
            aria-label={zh.topbar.zoomIn}
            onClick={() => rf.zoomIn({ duration: 120 })}
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            className="ds-icon-btn"
            aria-label={zh.topbar.fitView}
            title={zh.topbar.fitView}
            onClick={() => rf.fitView({ duration: 200, padding: 0.15 })}
          >
            <Maximize size={14} />
          </button>
        </div>
      </div>

      <div className="ds-topbar-right">
        <PeerAvatars />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="ds-icon-btn"
              aria-label={zh.topbar.theme}
              title={zh.topbar.theme}
            >
              {ui.resolvedTheme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="ds-menu" align="end" sideOffset={4}>
              {(['light', 'dark', 'system'] as const).map((t) => (
                <DropdownMenu.Item
                  key={t}
                  className={`ds-menu-item${ui.theme === t ? ' is-active' : ''}`}
                  onSelect={() => ui.setTheme(t)}
                >
                  {t === 'light'
                    ? zh.topbar.themeLight
                    : t === 'dark'
                      ? zh.topbar.themeDark
                      : zh.topbar.themeSystem}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button type="button" className="ds-btn" aria-label={zh.topbar.exportMenu}>
              <Download size={14} /> {zh.topbar.exportMenu}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="ds-menu" align="end" sideOffset={4}>
              <DropdownMenu.Item
                className="ds-menu-item"
                onSelect={() => setExportDlg('png')}
              >
                {zh.topbar.exportPng}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="ds-menu-item"
                onSelect={() => setExportDlg('svg')}
              >
                {zh.topbar.exportSvg}
              </DropdownMenu.Item>
              <DropdownMenu.Item className="ds-menu-item" onSelect={() => emit(EV.EXPORT_JSON)}>
                {zh.topbar.exportJson}
              </DropdownMenu.Item>
              <DropdownMenu.Item className="ds-menu-item" onSelect={() => emit(EV.EXPORT_MERMAID)}>
                {zh.topbar.exportMermaid}
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="ds-menu-sep" />
              <DropdownMenu.Item className="ds-menu-item" onSelect={() => emit(EV.IMPORT_JSON)}>
                {zh.topbar.importJson}
              </DropdownMenu.Item>
              <DropdownMenu.Item className="ds-menu-item" onSelect={() => emit(EV.IMPORT_MERMAID)}>
                {zh.topbar.importMermaid}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="ds-icon-btn"
              aria-label={zh.topbar.more}
              title={zh.topbar.more}
            >
              <MoreHorizontal size={15} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="ds-menu" align="end" sideOffset={4}>
              <DropdownMenu.Label className="ds-menu-label">
                <SaveStatus />
              </DropdownMenu.Label>
              <DropdownMenu.Separator className="ds-menu-sep" />
              <DropdownMenu.Item
                className={`ds-menu-item${ui.tool === 'select' ? ' is-active' : ''}`}
                onSelect={() => ui.setTool('select')}
              >
                {zh.topbar.toolSelect}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className={`ds-menu-item${ui.tool === 'hand' ? ' is-active' : ''}`}
                onSelect={() => ui.setTool('hand')}
              >
                {zh.topbar.toolHand}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="ds-menu-item"
                onSelect={() => emit(EV.AUTO_LAYOUT, doc.settings.layoutDirection)}
              >
                {zh.topbar.autoLayout}
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="ds-menu-sep" />
              <DropdownMenu.Item
                className={`ds-menu-item${ui.leftPanelOpen ? ' is-active' : ''}`}
                onSelect={ui.toggleLeftPanel}
              >
                {zh.topbar.leftPanel}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className={`ds-menu-item${ui.rightPanelOpen ? ' is-active' : ''}`}
                onSelect={ui.toggleRightPanel}
              >
                {zh.topbar.rightPanel}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className={`ds-menu-item${ui.minimapVisible ? ' is-active' : ''}`}
                onSelect={() => ui.setMinimapVisible(!ui.minimapVisible)}
              >
                {zh.topbar.minimap}
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="ds-menu-sep" />
              <DropdownMenu.Item className="ds-menu-item" onSelect={() => emit(EV.SHARE)}>
                {zh.topbar.share}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="ds-menu-item"
                onSelect={() => ui.setShortcutsHelpOpen(true)}
              >
                {zh.shortcuts.title}
              </DropdownMenu.Item>
              <DropdownMenu.Item className="ds-menu-item" onSelect={() => ui.setRoute('home')}>
                {zh.topbar.home}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      {exportDlg && <ExportDialog format={exportDlg} onClose={() => setExportDlg(null)} />}
    </header>
  )
}
