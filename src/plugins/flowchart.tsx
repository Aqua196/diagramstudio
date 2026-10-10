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

/** 模板（B6）：用户登录流程 —— 含失败回环与错误次数锁定 */
function loginTemplate(): DiagramDoc {
  const doc = createDoc('flowchart', zh.templates.flowchart)
  const mk = (kind: string, text: string, x: number, y: number) =>
    createNode(kind, { x, y }, flowchartShapes.find((s) => s.kind === kind)?.defaultSize ?? { w: 140, h: 56 }, text)
  const start = mk('terminator', '开始', 120, 40)
  const input = mk('io', '输入账号密码', 120, 150)
  const format = mk('decision', '校验格式', 120, 270)
  const query = mk('database', '查询用户数据库', 120, 400)
  const pwdOk = mk('decision', '密码正确？', 120, 520)
  const session = mk('process', '生成会话', 120, 650)
  const home = mk('process', '进入主页', 120, 770)
  const end = mk('terminator', '结束', 120, 880)
  const fail = mk('process', '错误次数 +1', -200, 530)
  const lock = mk('decision', '错误 ≥3 次？', -200, 650)
  const locked = mk('terminator', '锁定并结束', -200, 790)
  const nodes = [start, input, format, query, pwdOk, session, home, end, fail, lock, locked]
  for (const n of nodes) doc.nodes[n.id] = n
  doc.zOrder = nodes.map((n) => n.id)
  const edges = [
    createEdge(start.id, input.id),
    createEdge(input.id, format.id),
    createEdge(format.id, query.id, { label: '通过' }),
    createEdge(format.id, fail.id, { label: '不通过' }),
    createEdge(query.id, pwdOk.id),
    createEdge(pwdOk.id, session.id, { label: '正确' }),
    createEdge(pwdOk.id, fail.id, { label: '错误' }),
    createEdge(fail.id, lock.id),
    createEdge(lock.id, input.id, { label: '否，重试' }),
    createEdge(lock.id, locked.id, { label: '是' }),
    createEdge(session.id, home.id),
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
