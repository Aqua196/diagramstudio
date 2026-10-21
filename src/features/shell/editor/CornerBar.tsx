// 右下：小地图开关 · 画布设置（网格/吸附/整理方向）· 快捷键帮助。
import * as Popover from '@radix-ui/react-popover'
import { CircleHelp, Map as MapIcon, SlidersHorizontal } from 'lucide-react'
import { setSettings } from '@/core/commands/ops'
import { useDocumentStore } from '@/store/documentStore'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'
import { IconButton } from '@/components/IconButton'
import { SwitchRow } from '@/components/Switch'
import { Tip } from '@/components/Tip'

const e = zh.editor

function ViewSettings() {
  const settings = useDocumentStore((s) => s.doc.settings)
  const execute = useDocumentStore((s) => s.execute)
  return (
    <Popover.Root>
      <Tip label={e.viewSettings} side="top">
        <Popover.Trigger asChild>
          <button type="button" className="ds-icon-btn" aria-label={e.viewSettings}>
            <SlidersHorizontal size={16} />
          </button>
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Content className="ds-pop ds-settings" side="top" align="end" sideOffset={10}>
          <p className="ds-pop-title">{e.viewSettings}</p>
          <SwitchRow
            label={e.grid}
            checked={settings.grid}
            onChange={(v) => execute(setSettings({ grid: v }))}
          />
          <SwitchRow
            label={e.snap}
            checked={settings.snap}
            onChange={(v) => execute(setSettings({ snap: v }))}
          />
          <div className="ds-row">
            <span>{e.direction}</span>
            <div className="ds-seg">
              {(['TB', 'LR'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`ds-seg-btn${settings.layoutDirection === d ? ' is-active' : ''}`}
                  onClick={() => execute(setSettings({ layoutDirection: d }, e.direction))}
                >
                  {d === 'TB' ? e.dirTB : e.dirLR}
                </button>
              ))}
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export function CornerBar() {
  const minimap = useUiStore((s) => s.minimapVisible)
  const setMinimap = useUiStore((s) => s.setMinimapVisible)
  const setHelp = useUiStore((s) => s.setShortcutsHelpOpen)
  return (
    <div className="ds-float ds-corner ds-corner-br">
      <IconButton
        icon={<MapIcon size={16} />}
        label={e.minimap}
        tipSide="top"
        active={minimap}
        aria-pressed={minimap}
        onClick={() => setMinimap(!minimap)}
      />
      <ViewSettings />
      <IconButton
        icon={<CircleHelp size={16} />}
        label={e.shortcuts}
        kbd="?"
        tipSide="top"
        onClick={() => setHelp(true)}
      />
    </div>
  )
}
