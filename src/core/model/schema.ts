// zod 校验：导入的 JSON 只有过 schema 才允许进系统；错误信息转成中文可读原因。
// 用 zod/mini（函数式写法、可摇树）：校验能力相同，体积只有完整版的一小部分，而它在首屏就要用（读本地文档）。
import { z } from 'zod/mini'
import type { DiagramDoc } from './types'

const positive = () => z.number().check(z.positive())
const nonEmpty = () => z.string().check(z.minLength(1))
const dash = z.enum(['solid', 'dashed'])

const pointSchema = z.object({ x: z.number(), y: z.number() })
const sizeSchema = z.object({ w: positive(), h: positive() })

const nodeStyleSchema = z.object({
  fill: z.string(),
  stroke: z.string(),
  strokeWidth: positive(),
  dash,
  fontSize: positive(),
  bold: z.boolean(),
  align: z.enum(['left', 'center', 'right']),
})

const edgeStyleSchema = z.object({
  stroke: z.string(),
  strokeWidth: positive(),
  dash,
})

const cardinalitySchema = z.enum(['1', '0..1', 'N', '0..N'])

const nodeSchema = z.object({
  id: nonEmpty(),
  kind: nonEmpty(),
  position: pointSchema,
  size: sizeSchema,
  text: z.string(),
  style: nodeStyleSchema,
  data: z.record(z.string(), z.unknown()),
})

const edgeSchema = z.object({
  id: nonEmpty(),
  source: nonEmpty(),
  target: nonEmpty(),
  sourceHandle: z.optional(z.string()),
  targetHandle: z.optional(z.string()),
  routing: z.enum(['bezier', 'step', 'straight']),
  arrowStart: z.enum(['none', 'arrow']),
  arrowEnd: z.enum(['none', 'arrow']),
  label: z.optional(z.string()),
  style: edgeStyleSchema,
  cardinality: z.optional(z.object({ source: cardinalitySchema, target: cardinalitySchema })),
})

export const docSchema = z.object({
  schemaVersion: z.literal(1),
  id: nonEmpty(),
  title: z.string(),
  type: z.enum(['flowchart', 'mindmap', 'er']),
  nodes: z.record(z.string(), nodeSchema),
  edges: z.record(z.string(), edgeSchema),
  zOrder: z.array(z.string()),
  settings: z.object({
    grid: z.boolean(),
    snap: z.boolean(),
    layoutDirection: z.enum(['TB', 'LR']),
  }),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type ValidateResult = { ok: true; doc: DiagramDoc } | { ok: false; errors: string[] }

/** 校验一个已解析的对象；不做 JSON.parse（调用方先 parse 并处理语法错误） */
export function validateDoc(input: unknown): ValidateResult {
  const r = docSchema.safeParse(input)
  if (r.success) {
    const doc = r.data as DiagramDoc
    const extra = semanticCheck(doc)
    if (extra.length > 0) return { ok: false, errors: extra }
    return { ok: true, doc }
  }
  return { ok: false, errors: r.error.issues.map(describeIssue) }
}

/** schema 之外的引用完整性检查 */
function semanticCheck(doc: DiagramDoc): string[] {
  const errors: string[] = []
  for (const edge of Object.values(doc.edges)) {
    if (!doc.nodes[edge.source]) errors.push(`连线 ${edge.id} 的起点 ${edge.source} 不存在`)
    if (!doc.nodes[edge.target]) errors.push(`连线 ${edge.id} 的终点 ${edge.target} 不存在`)
  }
  const seen = new Set<string>()
  for (const id of doc.zOrder) {
    if (seen.has(id)) errors.push(`叠放顺序中的节点 ${id} 重复`)
    seen.add(id)
    if (!doc.nodes[id]) errors.push(`叠放顺序中的节点 ${id} 不存在`)
  }
  for (const id of Object.keys(doc.nodes)) {
    if (!seen.has(id)) errors.push(`节点 ${id} 缺失于叠放顺序`)
  }
  return errors
}

const TYPE_NAMES: Record<string, string> = {
  string: '文本',
  number: '数字',
  boolean: '布尔值',
  object: '对象',
  array: '数组',
}

function describeIssue(issue: z.core.$ZodIssue): string {
  const path = issue.path.length > 0 ? issue.path.join('.') : '根节点'
  switch (issue.code) {
    case 'invalid_type': {
      const got = issue.input === undefined ? '缺失' : `类型是 ${typeof issue.input}`
      const want = TYPE_NAMES[String(issue.expected)] ?? String(issue.expected)
      return `字段 ${path} 应为${want}，当前${got}`
    }
    case 'invalid_value':
      return `字段 ${path} 的取值不在允许范围内`
    case 'too_small':
      return `字段 ${path} 太小（最小 ${String(issue.minimum)}）`
    case 'too_big':
      return `字段 ${path} 太大（最大 ${String(issue.maximum)}）`
    case 'unrecognized_keys':
      return `对象 ${path} 包含不认识的字段：${issue.keys.join('、')}`
    default:
      return `字段 ${path}：${issue.message}`
  }
}
