// 首页「新建」卡：上半部是该类型示例的真实缩略图，下半部是名称、说明与两个入口。
import { ArrowRight } from 'lucide-react'
import { emit, EV } from '@/core/events'
import type { DiagramType } from '@/core/model/types'
import { getPlugin } from '@/plugins/registry'
import { zh } from '@/i18n/zh'
import { MiniDiagram } from './MiniDiagram'
import { markSharedSource } from '../transition'

const DESCS: Record<DiagramType, string> = {
  flowchart: zh.home.flowchartDesc,
  mindmap: zh.home.mindmapDesc,
  er: zh.home.erDesc,
}

/** 新建前登记形变起点：这张卡的缩略图将「长成」编辑器画布 */
function create(e: React.MouseEvent, type: DiagramType, templateId?: string) {
  markSharedSource(e.currentTarget.closest('.ds-new-card')?.querySelector('.ds-new-preview') ?? null)
  emit(EV.NEW_DOC, templateId === undefined ? { type } : { type, templateId })
}

export function NewCard({ type }: { type: DiagramType }) {
  const example = getPlugin(type).templates[0]
  return (
    <article className={`ds-new-card is-${type}`}>
      {/* 整卡可点（大点击区）；键盘/读屏走下方显式按钮，这里不重复暴露 */}
      <button
        type="button"
        className="ds-new-main"
        tabIndex={-1}
        aria-hidden
        onClick={(e) => create(e, type)}
      >
        <span className="ds-new-preview">
          {example && <MiniDiagram doc={example} className="ds-new-mini" />}
        </span>
        <span className="ds-new-text">
          <span className="ds-new-name">{zh.plugins.typeNames[type]}</span>
          <span className="ds-new-desc">{DESCS[type]}</span>
        </span>
      </button>
      <div className="ds-new-actions">
        <button
          type="button"
          className="ds-btn ds-btn-primary ds-btn-sm"
          aria-label={`${zh.home.newBlank}${zh.plugins.typeNames[type]}`}
          onClick={(e) => create(e, type)}
        >
          {zh.home.newBlank}
        </button>
        {example && (
          <button
            type="button"
            className="ds-btn ds-btn-ghost ds-btn-sm"
            onClick={(e) => create(e, type, '0')}
          >
            {zh.home.fromExample}
            <ArrowRight size={13} />
          </button>
        )}
      </div>
    </article>
  )
}
