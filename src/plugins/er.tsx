// ER 图插件（SPEC §3.3）：实体=表头+字段行（pk/fk 标记、名称、类型），
// 连线带两端基数（inspector 依 edgeFields='cardinality' 渲染下拉），dagre 布局。
import type { ReactNode } from 'react'
import { dagreLayout } from '@/core/layout/dagre'
import type { DiagramPlugin, ShapeDef } from '@/core/plugin'
import { zh } from '@/i18n/zh'
import { entityRender } from './erEntity'
import { erTemplate } from './erTemplate'

const sh = zh.plugins.shapes

export const erShapes: ShapeDef<ReactNode>[] = [
  {
    kind: 'entity',
    name: sh.entity,
    defaultSize: { w: 210, h: 108 },
    render: (n, ctx) => entityRender(n, ctx),
  },
  {
    kind: 'weakEntity',
    name: sh.weakEntity,
    defaultSize: { w: 210, h: 108 },
    render: (n, ctx) => entityRender(n, ctx, { weak: true }),
  },
]

export const erPlugin: DiagramPlugin<ReactNode> = {
  type: 'er',
  shapes: erShapes,
  edgeDefaults: {
    routing: 'step',
    arrowStart: 'none',
    arrowEnd: 'none',
    style: { stroke: 'ink-2', strokeWidth: 1.5, dash: 'solid' },
  },
  edgeFields: 'cardinality',
  layout: dagreLayout,
  templates: [erTemplate()],
}
