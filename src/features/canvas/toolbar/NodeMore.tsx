// 单节点「更多选项」弹层：位置尺寸、边框粗细与虚线、层级、副本。
import { BringToFront, Copy, MoreHorizontal, SendToBack } from 'lucide-react'
import { patchNode, patchNodeStyle } from '@/core/commands/ops'
import { emit, EV } from '@/core/events'
import type { DiagramNode } from '@/core/model/types'
import { useDocumentStore } from '@/store/documentStore'
import { zh } from '@/i18n/zh'
import { NumberField } from '@/components/NumberField'
import { SwitchRow } from '@/components/Switch'
import { PopButton } from './parts'

const t = zh.toolbar

function Geometry({ node }: { node: DiagramNode }) {
  const execute = useDocumentStore((s) => s.execute)
  const patch = (p: Parameters<typeof patchNode>[1], label: string) =>
    execute(patchNode(node.id, p, label))
  return (
    <div className="ds-grid-2">
      <NumberField
        label={t.posX}
        value={node.position.x}
        onCommit={(v) => patch({ position: { ...node.position, x: v } }, '移动元素')}
      />
      <NumberField
        label={t.posY}
        value={node.position.y}
        onCommit={(v) => patch({ position: { ...node.position, y: v } }, '移动元素')}
      />
      <NumberField
        label={t.sizeW}
        value={node.size.w}
        min={8}
        onCommit={(v) => patch({ size: { ...node.size, w: v } }, '调整大小')}
      />
      <NumberField
        label={t.sizeH}
        value={node.size.h}
        min={8}
        onCommit={(v) => patch({ size: { ...node.size, h: v } }, '调整大小')}
      />
    </div>
  )
}

export function NodeMore({ node }: { node: DiagramNode }) {
  const execute = useDocumentStore((s) => s.execute)
  const style = (p: Parameters<typeof patchNodeStyle>[1], label: string) =>
    execute(patchNodeStyle(node.id, p, label))
  return (
    <PopButton label={t.more} icon={<MoreHorizontal size={16} />}>
      <div className="ds-pop-body">
        <p className="ds-pop-title">{t.geometry}</p>
        <Geometry node={node} />
        <p className="ds-pop-title ds-pop-title-gap">{t.strokeWidth}</p>
        <div className="ds-grid-2">
          <NumberField
            label="px"
            value={node.style.strokeWidth}
            min={0.5}
            max={8}
            step={0.5}
            onCommit={(v) => style({ strokeWidth: v }, '修改描边')}
          />
        </div>
        <SwitchRow
          label={t.dashedBorder}
          checked={node.style.dash === 'dashed'}
          onChange={(v) => style({ dash: v ? 'dashed' : 'solid' }, '修改描边')}
        />
        <div className="ds-pop-actions">
          <button type="button" className="ds-btn ds-btn-sm" onClick={() => emit(EV.Z_FRONT)}>
            <BringToFront size={14} /> {t.zFront}
          </button>
          <button type="button" className="ds-btn ds-btn-sm" onClick={() => emit(EV.Z_BACK)}>
            <SendToBack size={14} /> {t.zBack}
          </button>
          <button type="button" className="ds-btn ds-btn-sm" onClick={() => emit(EV.DUPLICATE)}>
            <Copy size={14} /> {t.duplicate}
          </button>
        </div>
      </div>
    </PopButton>
  )
}
