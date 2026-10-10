// 左侧面板 240px：形状库（当前插件 shapes，可拖拽）+ 文档区（模板卡片）。
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { emit, EV } from '@/core/events'
import { getPlugin } from '@/plugins/registry'
import { useDocumentStore } from '@/store/documentStore'
import { setShapeDragData } from '@/features/canvas/dnd'
import { zh } from '@/i18n/zh'

const COMMON_SHAPES = 6

export function LeftPanel() {
  const doc = useDocumentStore((s) => s.doc)
  const plugin = getPlugin(doc.type)
  const [expanded, setExpanded] = useState(false)
  const hasMore = plugin.shapes.length > COMMON_SHAPES
  const shapes = expanded ? plugin.shapes : plugin.shapes.slice(0, COMMON_SHAPES)

  return (
    <aside className="ds-panel ds-panel-left" aria-label={zh.topbar.leftPanel}>
      <div className="ds-panel-title">{zh.palettePanel.title}</div>
      <div className="ds-shapes">
        {shapes.map((s) => (
          <button
            key={s.kind}
            type="button"
            className="ds-shape"
            draggable
            title={`${s.name} — ${zh.palettePanel.dragHint}`}
            aria-label={`${s.name}，${zh.palettePanel.dragHint}`}
            onDragStart={(e) => setShapeDragData(e.dataTransfer, s.kind)}
          >
            <ShapeIcon kind={s.kind} />
            <span className="ds-shape-name">{s.name}</span>
          </button>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          className="ds-shapes-toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? zh.palettePanel.fewerShapes : zh.palettePanel.moreShapes}
        </button>
      )}
      <div className="ds-panel-title">{zh.palettePanel.templates}</div>
      <div className="ds-tpl-list">
        {plugin.templates.map((t, i) => (
          <button
            key={t.id}
            type="button"
            className="ds-tpl-card"
            onClick={() => emit(EV.NEW_DOC, { type: doc.type, templateId: String(i) })}
          >
            <span className="ds-tpl-name">{t.title}</span>
            <span className="ds-tpl-meta">{zh.plugins.typeNames[doc.type]}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}

/** 形状库的简易示意图标（与 kind 对应，纯 SVG + 令牌色） */
function ShapeIcon({ kind }: { kind: string }) {
  const common = { fill: 'none', stroke: 'var(--ink-2)', strokeWidth: 1.5 } as const
  return (
    <svg width={28} height={20} viewBox="0 0 28 20" aria-hidden className="ds-shape-icon">
      {kind === 'terminator' || kind === 'connector' ? (
        <ellipse
          cx={14}
          cy={10}
          rx={kind === 'connector' ? 6 : 12}
          ry={kind === 'connector' ? 6 : 8}
          {...common}
        />
      ) : kind === 'decision' ? (
        <polygon points="14,2 26,10 14,18 2,10" {...common} />
      ) : kind === 'database' ? (
        <>
          <ellipse cx={14} cy={5} rx={11} ry={4} {...common} />
          <path d="M3,5 V15 A11,4 0 0 0 25,15 V5" {...common} />
        </>
      ) : kind === 'io' ? (
        <polygon points="6,3 25,3 22,17 3,17" {...common} />
      ) : (
        <rect x={4} y={3} width={20} height={14} {...common} />
      )}
    </svg>
  )
}
