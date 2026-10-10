// 首页：三种图的新建入口卡 + 文档列表（localStorage 索引），
// 每卡带模板缩略示意；文档支持打开/重命名/副本/删除。
import { useState } from 'react'
import { FilePlus2, Upload } from 'lucide-react'
import { emit, EV } from '@/core/events'
import type { DiagramType } from '@/core/model/types'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'
import { listDocs } from '../docs/docsStore'
import { DocCard } from './DocCard'
import { Thumb } from './Thumb'

const TYPES: DiagramType[] = ['flowchart', 'mindmap', 'er']
const DESCS = {
  flowchart: zh.home.newFlowchartDesc,
  mindmap: zh.home.newMindmapDesc,
  er: zh.home.newErDesc,
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
