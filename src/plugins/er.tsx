// ER 图插件（SPEC §3.3）：实体=表头+字段行（pk/fk 标记、名称、类型），
// 连线带两端基数（工具条依 edgeFields='cardinality' 渲染基数选择），dagre 布局。
import type { ReactNode } from 'react'
import { Rows3 } from 'lucide-react'
import { dagreLayout } from '@/core/layout/dagre'
import type { DiagramPlugin, ShapeDef } from '@/core/plugin'
import { zh } from '@/i18n/zh'
import { entityRender } from './erEntity'
import { addFieldCommand, entityHeight } from './erFields'
import { createId } from '@/core/model/factories'
import { erTemplate } from './erTemplate'
import { shapeIcons } from './shapeIcons'

const sh = zh.plugins.shapes

/** 新实体预置一个 id 主键字段，开箱即像一张表 */
const starterFields = () => ({ fields: [{ id: createId(), name: 'id', type: 'int', pk: true }] })
const ENTITY_SIZE = { w: 210, h: entityHeight([{ id: '', name: '', type: '' }]) }

export const erShapes: ShapeDef<ReactNode>[] = [
  {
    kind: 'entity',
    name: sh.entity,
    icon: shapeIcons.entity,
    defaultSize: ENTITY_SIZE,
    defaultText: sh.entity,
    defaultData: starterFields,
    render: (n, ctx) => entityRender(n, ctx),
  },
  {
    kind: 'weakEntity',
    name: sh.weakEntity,
    icon: shapeIcons.weakEntity,
    defaultSize: ENTITY_SIZE,
    defaultText: sh.weakEntity,
    defaultData: starterFields,
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
    cardinality: { source: '1', target: '0..N' },
    style: { stroke: 'ink-2', strokeWidth: 1.5, dash: 'solid' },
  },
  edgeFields: 'cardinality',
  layout: dagreLayout,
  nodeActions: [
    {
      id: 'addField',
      label: zh.plugins.er.addField,
      icon: <Rows3 size={16} />,
      run: (ctx) => {
        const node = ctx.doc.nodes[ctx.selection.nodeIds[0] ?? '']
        return node ? addFieldCommand(node) : null
      },
    },
  ],
  tips: zh.plugins.tips.er,
  templates: [erTemplate()],
}
