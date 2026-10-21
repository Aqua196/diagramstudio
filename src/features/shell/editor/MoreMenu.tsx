// 右上「更多」菜单：导入 · 主题 · 快捷键 · 返回首页。低频操作都收在这里，主界面保持清爽。
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, FileJson, Home, Keyboard, MoreHorizontal, Workflow } from 'lucide-react'
import { emit, EV } from '@/core/events'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'
import { Tip } from '@/components/Tip'

const e = zh.editor
const THEMES = [
  ['light', e.themeLight],
  ['dark', e.themeDark],
  ['system', e.themeSystem],
] as const

function Item({
  icon,
  label,
  kbd,
  onSelect,
}: {
  icon: React.ReactNode
  label: string
  kbd?: string
  onSelect: () => void
}) {
  return (
    <DropdownMenu.Item className="ds-menu-item" onSelect={onSelect}>
      {icon}
      {label}
      {kbd && <span className="ds-menu-kbd">{kbd}</span>}
    </DropdownMenu.Item>
  )
}

export function MoreMenu() {
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)
  const ui = useUiStore.getState
  return (
    <DropdownMenu.Root>
      <Tip label={e.more}>
        <DropdownMenu.Trigger asChild>
          <button type="button" className="ds-icon-btn" aria-label={e.more}>
            <MoreHorizontal size={18} />
          </button>
        </DropdownMenu.Trigger>
      </Tip>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="ds-menu" align="end" sideOffset={10}>
          <Item
            icon={<FileJson size={16} />}
            label={e.importJson}
            onSelect={() => emit(EV.IMPORT_JSON)}
          />
          <Item
            icon={<Workflow size={16} />}
            label={e.importMermaid}
            onSelect={() => emit(EV.IMPORT_MERMAID)}
          />
          <DropdownMenu.Separator className="ds-menu-sep" />
          <DropdownMenu.Label className="ds-menu-label">{e.theme}</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
            {THEMES.map(([v, label]) => (
              <DropdownMenu.RadioItem key={v} value={v} className="ds-menu-item">
                <span className="ds-menu-check-slot">
                  <DropdownMenu.ItemIndicator>
                    <Check size={14} className="ds-menu-check" />
                  </DropdownMenu.ItemIndicator>
                </span>
                {label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator className="ds-menu-sep" />
          <Item
            icon={<Keyboard size={16} />}
            label={e.shortcuts}
            kbd="?"
            onSelect={() => ui().setShortcutsHelpOpen(true)}
          />
          <Item icon={<Home size={16} />} label={e.home} onSelect={() => ui().setRoute('home')} />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
