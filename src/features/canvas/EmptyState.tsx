// 空画布提示层（IMPL_CONTRACT §6）：doc 无节点时覆盖画布中央，
// 文案按 SPEC §6，三个模板入口派发 EV.NEW_DOC。容器不拦截指针。
import { emit, EV } from '@/core/events'
import { zh } from '@/i18n/zh'

const TYPES = ['flowchart', 'mindmap', 'er'] as const

export function EmptyState() {
  return (
    <div className="ds-empty" aria-hidden={false}>
      <div className="ds-empty-inner">
        <p className="ds-empty-title">{zh.canvas.emptyTitle}</p>
        <p className="ds-empty-hint">{zh.canvas.emptyHint}</p>
        <p className="ds-empty-sub">{zh.canvas.emptyTemplates}</p>
        <div className="ds-empty-templates">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className="ds-empty-tpl"
              onClick={() => emit(EV.NEW_DOC, { type: t, templateId: '0' })}
            >
              {zh.plugins.typeNames[t]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
