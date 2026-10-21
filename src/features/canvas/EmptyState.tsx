// 空画布引导（IMPL_CONTRACT §6）：按图类型给一句话上手提示 + 「载入示例」入口。
// 容器不拦截指针（双击空白放节点照常可用），只有卡片本身可点。
import { MousePointerClick } from 'lucide-react'
import { emit, EV } from '@/core/events'
import { getPlugin } from '@/plugins/registry'
import { useDocumentStore } from '@/store/documentStore'
import { fmt, zh } from '@/i18n/zh'

export function EmptyState() {
  const type = useDocumentStore((s) => s.doc.type)
  const copy = zh.canvas.empty[type]
  const example = getPlugin(type).templates[0]
  return (
    <div className="ds-empty">
      <div className="ds-empty-card">
        <span className="ds-empty-icon" aria-hidden>
          <MousePointerClick size={22} />
        </span>
        <p className="ds-empty-title">{copy.title}</p>
        <p className="ds-empty-hint">{copy.hint}</p>
        {example && (
          <button
            type="button"
            className="ds-btn ds-empty-example"
            onClick={() => emit(EV.NEW_DOC, { type, templateId: '0' })}
          >
            {fmt(zh.canvas.loadExample, { name: example.title })}
          </button>
        )}
      </div>
    </div>
  )
}
