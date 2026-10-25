// 首页：欢迎语 + 三种图的新建卡（真实示例缩略图）+ 最近的图表（缩略图网格）。
import { useEffect, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { FileJson, Moon, Sun, Upload, Workflow } from 'lucide-react'
import { emit, EV } from '@/core/events'
import type { DiagramType } from '@/core/model/types'
import { useUiStore } from '@/store/uiStore'
import { fmt, zh } from '@/i18n/zh'
import { BrandMark } from '@/components/BrandMark'
import { IconButton } from '@/components/IconButton'
import { listStoredDocs } from '../docs/docsStore'
import { themeTransition } from '../transition'
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
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            const next = theme === 'dark' ? 'light' : 'dark'
            themeTransition(() => setTheme(next), {
              x: r.left + r.width / 2,
              y: r.top + r.height / 2,
            })
          }}
        />
      </div>
    </header>
  )
}

/** 首页开场动画每次会话只播一次；从编辑器形变回来时不播（卡片正是形变的落点） */
let introPlayed = false
function useIntro(): boolean {
  // 初始化函数保持纯：StrictMode 会调用两次，「已播」标记放到 effect 里写
  const [intro, setIntro] = useState(
    () => !introPlayed && !document.documentElement.classList.contains('ds-vt-page'),
  )
  useEffect(() => {
    introPlayed = true
    if (!intro) return
    const t = window.setTimeout(() => setIntro(false), 1400)
    return () => window.clearTimeout(t)
  }, [intro])
  return intro
}

export default function HomePage() {
  const [, setTick] = useState(0)
  const refresh = () => setTick((n) => n + 1)
  const intro = useIntro()
  const docs = listStoredDocs()
  return (
    <div className="ds-home" data-intro={intro || undefined}>
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
