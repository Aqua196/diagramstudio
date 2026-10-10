// 排列分组：Z 序前置/后置、六向对齐、水平/垂直分布（C1 从 Inspector.tsx 拆出）。
import { emit, EV } from '@/core/events'
import type { AlignMode } from '@/core/commands/ops'
import { zh } from '@/i18n/zh'

const t = zh.inspector

const ALIGNS: Array<[AlignMode, string]> = [
  ['left', t.alignLeft],
  ['center', t.alignHCenter],
  ['right', t.alignRight],
  ['top', t.alignTop],
  ['middle', t.alignVCenter],
  ['bottom', t.alignBottom],
]

function ZRow({ nodeCount }: { nodeCount: number }) {
  return (
    <>
      <div className="ds-field-label ds-group-label">{t.zGroup}</div>
      <div className="ds-btn-row">
        <button type="button" className="ds-btn" disabled={nodeCount === 0} onClick={() => emit(EV.Z_FRONT)}>
          {t.zFront}
        </button>
        <button type="button" className="ds-btn" disabled={nodeCount === 0} onClick={() => emit(EV.Z_BACK)}>
          {t.zBack}
        </button>
      </div>
    </>
  )
}

function AlignGrid({ nodeCount }: { nodeCount: number }) {
  return (
    <>
      <div className="ds-field-label ds-group-label">{t.alignGroup}</div>
      <div className="ds-btn-grid" role="group" aria-label={t.alignGroup}>
        {ALIGNS.map(([m, label]) => (
          <button
            key={m}
            type="button"
            className="ds-btn"
            disabled={nodeCount < 2}
            title={nodeCount < 2 ? t.needTwo : label}
            onClick={() => emit(EV.ALIGN, m)}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  )
}

function DistRow({ nodeCount }: { nodeCount: number }) {
  return (
    <>
      <div className="ds-field-label ds-group-label">{t.distributeGroup}</div>
      <div className="ds-btn-row">
        <button
          type="button"
          className="ds-btn"
          disabled={nodeCount < 3}
          title={nodeCount < 3 ? t.needThree : t.distH}
          onClick={() => emit(EV.DISTRIBUTE, 'h')}
        >
          {t.distH}
        </button>
        <button
          type="button"
          className="ds-btn"
          disabled={nodeCount < 3}
          title={nodeCount < 3 ? t.needThree : t.distV}
          onClick={() => emit(EV.DISTRIBUTE, 'v')}
        >
          {t.distV}
        </button>
      </div>
    </>
  )
}

export function ArrangeSection({ nodeCount }: { nodeCount: number }) {
  return (
    <>
      <ZRow nodeCount={nodeCount} />
      <AlignGrid nodeCount={nodeCount} />
      <DistRow nodeCount={nodeCount} />
    </>
  )
}
