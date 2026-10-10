// 流程图插件（SPEC §3.1）：11 种形状 + dagre 布局 + 内置模板。
import type { ReactNode } from 'react'
import { dagreLayout } from '@/core/layout/dagre'
import { createDoc, createEdge, createNode } from '@/core/model/factories'
import type { DiagramDoc } from '@/core/model/types'
import type { DiagramPlugin, ShapeDef } from '@/core/plugin'
import { zh } from '@/i18n/zh'
import { shapePaths } from './shapekit'

const sh = zh.plugins.shapes

export const flowchartShapes: ShapeDef<ReactNode>[] = [
  { kind: 'process', name: sh.process, defaultSize: { w: 140, h: 56 }, render: shapePaths.rect },
  { kind: 'terminator', name: sh.terminator, defaultSize: { w: 140, h: 48 }, render: shapePaths.rounded },
  { kind: 'decision', name: sh.decision, defaultSize: { w: 140, h: 84 }, render: shapePaths.diamond },
  { kind: 'io', name: sh.io, defaultSize: { w: 140, h: 56 }, render: shapePaths.parallelogram },
  { kind: 'subprocess', name: sh.subprocess, defaultSize: { w: 150, h: 56 }, render: shapePaths.subprocess },
  { kind: 'database', name: sh.database, defaultSize: { w: 120, h: 76 }, render: shapePaths.cylinder },
  { kind: 'document', name: sh.document, defaultSize: { w: 140, h: 64 }, render: shapePaths.document },
  { kind: 'connector', name: sh.connector, defaultSize: { w: 36, h: 36 }, render: shapePaths.circle },
  { kind: 'terminator2', name: `${sh.terminator}（双圈）`, defaultSize: { w: 140, h: 48 }, render: shapePaths.doubleCircle },
  { kind: 'note', name: sh.note, defaultSize: { w: 150, h: 80 }, render: shapePaths.note },
]

function loginTemplate(): DiagramDoc {
  const doc = createDoc('flowchart', '登录流程')
  const mk = (kind: string, text: string, x: number, y: number) =>
    createNode(kind, { x, y }, flowchartShapes.find((s) => s.kind === kind)?.defaultSize ?? { w: 140, h: 56 }, text)
  const start = mk('terminator', '开始', 80, 40)
  const input = mk('io', '输入账号密码', 80, 140)
  const check = mk('decision', '校验通过？', 80, 260)
  const home = mk('process', '进入主页', 330, 272)
  const err = mk('process', '提示错误', -160, 330)
  const end = mk('terminator', '结束', 330, 420)
  const nodes = [start, input, check, home, err, end]
  for (const n of nodes) doc.nodes[n.id] = n
  doc.zOrder = nodes.map((n) => n.id)
  const edges = [
    createEdge(start.id, input.id),
    createEdge(input.id, check.id),
    createEdge(check.id, home.id, { label: '是' }),
    createEdge(check.id, err.id, { label: '否' }),
    createEdge(err.id, input.id),
    createEdge(home.id, end.id),
  ]
  for (const e of edges) doc.edges[e.id] = e
  return doc
}

export const flowchartPlugin: DiagramPlugin<ReactNode> = {
  type: 'flowchart',
  shapes: flowchartShapes,
  edgeDefaults: {
    routing: 'bezier',
    arrowStart: 'none',
    arrowEnd: 'arrow',
    style: { stroke: 'ink-2', strokeWidth: 1.5, dash: 'solid' },
  },
  layout: dagreLayout,
  templates: [loginTemplate()],
}
