// 多选工具条：计数 · 统一颜色 · 对齐（6 向）· 等距分布 · 删除。
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  Trash2,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { AlignMode } from '@/core/commands/ops'
import { emit, EV } from '@/core/events'
import { useDocumentStore } from '@/store/documentStore'
import { fmt, zh } from '@/i18n/zh'
import { IconButton } from '@/components/IconButton'
import { patchNodesStyle } from '../commands'
import { ColorDot, ColorGrid, PopButton } from './parts'

const t = zh.toolbar

const ALIGNS: Array<[AlignMode, string, ReactNode]> = [
  ['left', t.alignLeft, <AlignStartVertical key="l" size={16} />],
  ['center', t.alignHCenter, <AlignCenterVertical key="c" size={16} />],
  ['right', t.alignRight, <AlignEndVertical key="r" size={16} />],
  ['top', t.alignTop, <AlignStartHorizontal key="t" size={16} />],
  ['middle', t.alignVCenter, <AlignCenterHorizontal key="m" size={16} />],
  ['bottom', t.alignBottom, <AlignEndHorizontal key="b" size={16} />],
]

export function MultiToolbarContent({ ids }: { ids: string[] }) {
  const execute = useDocumentStore((s) => s.execute)
  const first = useDocumentStore((s) => s.doc.nodes[ids[0]])
  const canDistribute = ids.length >= 3
  return (
    <>
      <span className="ds-toolbar-count">{fmt(t.selected, { n: ids.length })}</span>
      <span className="ds-sep" />
      <PopButton label={t.color} icon={<ColorDot fill={first?.style.fill ?? 'white'} />}>
        <ColorGrid onPick={(k) => execute(patchNodesStyle(ids, { fill: k }, '修改颜色'))} />
      </PopButton>
      <span className="ds-sep" />
      {ALIGNS.map(([mode, label, icon]) => (
        <IconButton
          key={mode}
          icon={icon}
          label={label}
          tipSide="top"
          onClick={() => emit(EV.ALIGN, mode)}
        />
      ))}
      <span className="ds-sep" />
      <IconButton
        icon={<AlignHorizontalDistributeCenter size={16} />}
        label={canDistribute ? t.distH : t.needThree}
        tipSide="top"
        disabled={!canDistribute}
        onClick={() => emit(EV.DISTRIBUTE, 'h')}
      />
      <IconButton
        icon={<AlignVerticalDistributeCenter size={16} />}
        label={canDistribute ? t.distV : t.needThree}
        tipSide="top"
        disabled={!canDistribute}
        onClick={() => emit(EV.DISTRIBUTE, 'v')}
      />
      <span className="ds-sep" />
      <IconButton
        icon={<Trash2 size={16} />}
        label={t.delete}
        kbd="Del"
        tipSide="top"
        danger
        onClick={() => emit(EV.DELETE)}
      />
    </>
  )
}
