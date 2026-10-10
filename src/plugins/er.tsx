// ER 图插件（SPEC §3.3）：实体=表头+字段行（pk/fk 标记、名称、类型），
// 连线带两端基数（inspector 依 edgeFields='cardinality' 渲染下拉），dagre 布局。
import type { ReactNode } from 'react'
import { patchNode } from '@/core/commands/ops'
import { dagreLayout } from '@/core/layout/dagre'
import { createDoc, createEdge, createId, createNode } from '@/core/model/factories'
import type { DiagramDoc, DiagramNode, ErField } from '@/core/model/types'
import type { DiagramPlugin, ShapeDef, ShapeRenderContext } from '@/core/plugin'
import { zh } from '@/i18n/zh'

const sh = zh.plugins.shapes
const ROW_H = 26
const HEAD_H = 30

interface ErData {
  fields?: ErField[]
}

const fieldsOf = (n: DiagramNode): ErField[] => (n.data as ErData).fields ?? []

/** 实体渲染：表头 + 字段行；行内输入 dispatch patchNode 修改 data.fields */
function entityRender(node: DiagramNode, ctx: ShapeRenderContext): ReactNode {
  const { w } = node.size
  const fields = fieldsOf(node)
  const h = Math.max(node.size.h, HEAD_H + Math.max(1, fields.length) * ROW_H + 4)

  const update = (next: ErField[], label = '修改字段') =>
    ctx.dispatch(patchNode(node.id, { data: { ...node.data, fields: next }, size: { w: node.size.w, h } }, label))

  const setField = (id: string, patch: Partial<ErField>) =>
    update(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)))

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }} aria-hidden>
      <rect width={w} height={h} fill="var(--node-fill)" stroke="var(--node-stroke)" strokeWidth={node.style.strokeWidth} />
      <rect width={w} height={HEAD_H} fill="var(--node-stroke)" opacity={0.16} />
      <line x1={0} y1={HEAD_H} x2={w} y2={HEAD_H} stroke="var(--node-stroke)" strokeWidth={node.style.strokeWidth} />
      <foreignObject x={0} y={0} width={w} height={HEAD_H}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: node.style.fontSize, fontWeight: 700, color: 'var(--node-text)', overflow: 'hidden', pointerEvents: 'none' }}>
          {ctx.editing ? '' : node.text}
        </div>
      </foreignObject>
      {fields.map((f, i) => {
        const y = HEAD_H + i * ROW_H
        return (
          <g key={f.id}>
            <line x1={0} y1={y} x2={w} y2={y} stroke="var(--node-stroke)" strokeWidth={0.75} opacity={0.4} />
            <text x={8} y={y + ROW_H / 2} dominantBaseline="central" fontSize={11} fill="var(--accent)" fontWeight={700}>
              {f.pk ? 'PK' : f.fk ? 'FK' : ''}
            </text>
            <foreignObject x={30} y={y} width={w - 110} height={ROW_H}>
              <input
                value={f.name}
                aria-label="字段名"
                onChange={(e) => setField(f.id, { name: e.target.value })}
                onKeyDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', fontSize: 12, color: 'var(--node-text)', fontWeight: f.pk ? 700 : 400, textDecoration: f.pk ? 'underline' : 'none', outline: 'none' }}
              />
            </foreignObject>
            <foreignObject x={w - 78} y={y} width={56} height={ROW_H}>
              <input
                value={f.type}
                aria-label="字段类型"
                onChange={(e) => setField(f.id, { type: e.target.value })}
                onKeyDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', fontSize: 11, color: 'var(--ink-2)', outline: 'none', textAlign: 'right' }}
              />
            </foreignObject>
            <text
              x={w - 14}
              y={y + ROW_H / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={12}
              fill="var(--ink-3)"
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation()
                update(fields.filter((x) => x.id !== f.id), '删除字段')
              }}
            >
              ×
            </text>
          </g>
        )
      })}
      <text
        x={w / 2}
        y={HEAD_H + fields.length * ROW_H + ROW_H / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fill="var(--ink-3)"
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          e.stopPropagation()
          update([...fields, { id: createId(), name: `field_${fields.length + 1}`, type: 'int' }], '添加字段')
        }}
      >
        ＋ 添加字段
      </text>
    </svg>
  )
}

export const erShapes: ShapeDef<ReactNode>[] = [
  { kind: 'entity', name: sh.entity, defaultSize: { w: 200, h: 108 }, render: entityRender },
  { kind: 'weakEntity', name: '弱实体', defaultSize: { w: 200, h: 108 }, render: (n, ctx) => (
    <>
      <rect x={0} y={0} width={n.size.w} height={n.size.h} fill="none" stroke="var(--node-stroke)" strokeWidth={n.style.strokeWidth} strokeDasharray="4 3" />
      {entityRender(n, ctx)}
    </>
  ) },
]

function schoolTemplate(): DiagramDoc {
  const doc = createDoc('er', '选课系统')
  const mk = (text: string, x: number, y: number, fields: ErField[]) => {
    const n = createNode('entity', { x, y }, { w: 200, h: HEAD_H + fields.length * ROW_H + ROW_H }, text)
    n.data = { fields }
    return n
  }
  const student = mk('学生', 60, 60, [
    { id: createId(), name: 'student_id', type: 'int', pk: true },
    { id: createId(), name: 'name', type: 'varchar' },
    { id: createId(), name: 'major', type: 'varchar' },
  ])
  const course = mk('课程', 420, 60, [
    { id: createId(), name: 'course_id', type: 'int', pk: true },
    { id: createId(), name: 'title', type: 'varchar' },
    { id: createId(), name: 'credit', type: 'int' },
  ])
  const enroll = mk('选课记录', 240, 300, [
    { id: createId(), name: 'id', type: 'int', pk: true },
    { id: createId(), name: 'student_id', type: 'int', fk: true },
    { id: createId(), name: 'course_id', type: 'int', fk: true },
    { id: createId(), name: 'grade', type: 'varchar' },
  ])
  for (const n of [student, course, enroll]) doc.nodes[n.id] = n
  doc.zOrder = [student.id, course.id, enroll.id]
  const e1 = createEdge(student.id, enroll.id, { arrowEnd: 'none', cardinality: { source: '1', target: '0..N' } })
  const e2 = createEdge(course.id, enroll.id, { arrowEnd: 'none', cardinality: { source: '1', target: '0..N' } })
  doc.edges[e1.id] = e1
  doc.edges[e2.id] = e2
  return doc
}

export const erPlugin: DiagramPlugin<ReactNode> = {
  type: 'er',
  shapes: erShapes,
  edgeDefaults: {
    routing: 'step',
    arrowStart: 'none',
    arrowEnd: 'none',
    style: { stroke: 'ink', strokeWidth: 1.5, dash: 'solid' },
  },
  edgeFields: 'cardinality',
  layout: dagreLayout,
  templates: [schoolTemplate()],
}
