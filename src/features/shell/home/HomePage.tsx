// 首页：欢迎语 + 三种图的新建卡（真实示例缩略图）+ 最近的图表（缩略图网格）。
import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { FileJson, Moon, Sun, Upload, Workflow } from 'lucide-react'
import { emit, EV } from '@/core/events'
import type { DiagramType } from '@/core/model/types'
import { useUiStore } from '@/store/uiStore'
import { fmt, zh } from '@/i18n/zh'
import { BrandMark } from '@/components/BrandMark'
import { IconButton } from '@/components/IconButton'
import { listStoredDocs } from '../docs/docsStore'
import { DocCard } from './DocCard'
import { NewCard } from './NewCard'

const TYPES: DiagramType[] = ['flowchart', 'mindmap', 'er']

function ImportMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="ds-btn ds-btn-ghost">
          <Upload size={15} /> {zh.home.importFile}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="ds-menu" align="end" sideOffset={6}>
          <DropdownMenu.Item className="ds-menu-item" onSelect={() => emit(EV.IMPORT_JSON)}>
            <FileJson size={16} /> {zh.home.importJson}
          </DropdownMenu.Item>
          <DropdownMenu.Item className="ds-menu-item" onSelect={() => emit(EV.IMPORT_MERMAID)}>
            <Workflow size={16} /> {zh.home.importMermaid}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function Header() {
  const theme = useUiStore((s) => s.resolvedTheme)
  const setTheme = useUiStore((s) => s.setTheme)
  return (
    <header className="ds-home-head">
      <div className="ds-home-brand">
        <BrandMark size={28} />
        <span className="ds-home-name">{zh.app.name}</span>
      </div>
      <div className="ds-home-actions">
        <ImportMenu />
        <IconButton
          icon={theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          label={zh.editor.theme}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        />
      </div>
    </header>
  )
}

export default function HomePage() {
  const [, setTick] = useState(0)
  const refresh = () => setTick((n) => n + 1)
  const docs = listStoredDocs()
  return (
    <div className="ds-home">
      <Header />
      <main className="ds-home-main">
        <section className="ds-hero">
          <h1 className="ds-hero-title">{zh.home.heroTitle}</h1>
          <p className="ds-hero-sub">{zh.home.heroSub}</p>
        </section>
        <section className="ds-new-grid" aria-label={zh.home.newBlank}>
          {TYPES.map((t) => (
            <NewCard key={t} type={t} />
          ))}
        </section>
        <section className="ds-recent">
          <div className="ds-section-head">
            <h2 className="ds-section-title">{zh.home.recent}</h2>
            {docs.length > 0 && (
              <span className="ds-section-count">{fmt(zh.home.docCount, { n: docs.length })}</span>
            )}
          </div>
          {docs.length === 0 ? (
            <p className="ds-recent-empty">{zh.home.empty}</p>
          ) : (
            <div className="ds-doc-grid">
              {docs.map((d) => (
                <DocCard key={d.id} doc={d} onChanged={refresh} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
