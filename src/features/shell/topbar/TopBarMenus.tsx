// 顶栏右侧三组下拉菜单：主题 / 导出 / 更多（从 TopBar 拆出，C1）。
import { Download, Moon, MoreHorizontal, Sun } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { emit, EV } from '@/core/events'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'
import { SaveStatus } from './DocTitle'
import type { ExportFormat } from './ExportDialog'

export function ThemeMenu() {
  const ui = useUiStore()
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="ds-icon-btn" aria-label={zh.topbar.theme} title={zh.topbar.theme}>
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
  )
}

export function ExportMenu({ onFormat }: { onFormat: (f: ExportFormat) => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="ds-btn" aria-label={zh.topbar.exportMenu}>
          <Download size={14} /> {zh.topbar.exportMenu}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="ds-menu" align="end" sideOffset={4}>
          <DropdownMenu.Item className="ds-menu-item" onSelect={() => onFormat('png')}>
            {zh.topbar.exportPng}
          </DropdownMenu.Item>
          <DropdownMenu.Item className="ds-menu-item" onSelect={() => onFormat('svg')}>
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
  )
}

export function MoreMenu() {
  const doc = useDocumentStore((s) => s.doc)
  const ui = useUiStore()
  const item = (
    label: string,
    active: boolean,
    onSelect: () => void,
  ) => (
    <DropdownMenu.Item
      className={`ds-menu-item${active ? ' is-active' : ''}`}
      onSelect={onSelect}
    >
      {label}
    </DropdownMenu.Item>
  )
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="ds-icon-btn" aria-label={zh.topbar.more} title={zh.topbar.more}>
          <MoreHorizontal size={15} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="ds-menu" align="end" sideOffset={4}>
          <DropdownMenu.Label className="ds-menu-label">
            <SaveStatus />
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="ds-menu-sep" />
          {item(zh.topbar.toolSelect, ui.tool === 'select', () => ui.setTool('select'))}
          {item(zh.topbar.toolHand, ui.tool === 'hand', () => ui.setTool('hand'))}
          {item(zh.topbar.autoLayout, false, () => emit(EV.AUTO_LAYOUT, doc.settings.layoutDirection))}
          <DropdownMenu.Separator className="ds-menu-sep" />
          {item(zh.topbar.leftPanel, ui.leftPanelOpen, ui.toggleLeftPanel)}
          {item(zh.topbar.rightPanel, ui.rightPanelOpen, ui.toggleRightPanel)}
          {item(zh.topbar.minimap, ui.minimapVisible, () => ui.setMinimapVisible(!ui.minimapVisible))}
          <DropdownMenu.Separator className="ds-menu-sep" />
          {item(zh.topbar.share, false, () => emit(EV.SHARE))}
          {item(zh.shortcuts.title, false, () => ui.setShortcutsHelpOpen(true))}
          {item(zh.topbar.home, false, () => ui.setRoute('home'))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
