// 节点四周的「+」快捷添加（选中单个节点时出现，已连线的那一侧不显示）：点一下就在该方向接一个相连的新节点，
// 新节点形状由插件 nextKind 决定，随后直接进入文字编辑。悬停/键盘聚焦「+」时先在落点画出新节点的虚影，
// 点下去新节点从当前节点飞出、正好落进虚影的位置。拖动「+」旁的圆点仍是普通连线。
import { memo, useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import type { NodeSide } from '@/core/plugin'
import type { ReactPlugin } from '@/plugins/registry'
import { useDocumentStore } from '@/store/documentStore'
import { zh } from '@/i18n/zh'
import { executeAndFocus } from './focus'
import { QuickAddPreview } from './QuickAddPreview'
import { ALL_SIDES, buildQuickAdd, planQuickAdd, usedSides } from './quickAddPlan'

export { buildQuickAdd, planQuickAdd, usedSides } from './quickAddPlan'

/** 指针在几个「+」之间滑过时不闪：停留这么久才出预览 */
const INTENT_MS = 60

function QuickAddInner({ nodeId, plugin }: { nodeId: string; plugin: ReactPlugin }) {
  const used = useDocumentStore((s) => [...usedSides(s.doc, nodeId)].sort().join(','))
  const [hover, setHover] = useState<NodeSide | null>(null)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const sides = (plugin.quickAddSides ?? ALL_SIDES).filter(
    (side) => !used.split(',').includes(side),
  )
  if (sides.length === 0) return null

  const preview = (side: NodeSide | null, delay = 0) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setHover(side), delay)
  }
  const add = (side: NodeSide) => {
    preview(null)
    const cmd = buildQuickAdd(useDocumentStore.getState().doc, plugin, nodeId, side)
    if (cmd) executeAndFocus(cmd)
  }
  const plan = hover ? planQuickAdd(useDocumentStore.getState().doc, plugin, nodeId, hover) : null
  return (
    <>
      {plan && hover && <QuickAddPreview plan={plan} side={hover} plugin={plugin} />}
      {sides.map((side) => (
        <button
          key={side}
          type="button"
          className={`ds-quick ds-quick-${side} nodrag nopan ds-export-exclude`}
          aria-label={zh.canvas.quickAddSide[side]}
          title={zh.canvas.quickAdd}
          onPointerEnter={() => preview(side, INTENT_MS)}
          onPointerLeave={() => preview(null)}
          onFocus={(e) => e.currentTarget.matches(':focus-visible') && preview(side)}
          onBlur={() => preview(null)}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            add(side)
          }}
        >
          <Plus size={12} strokeWidth={2.5} />
        </button>
      ))}
    </>
  )
}

export const QuickAdd = memo(QuickAddInner)
