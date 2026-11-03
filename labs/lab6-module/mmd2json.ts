// 实验 6：Mermaid 流程图 → DiagramStudio 工程文件（.json）的命令行工具。
// 直接调用领域层的导入模块 importMermaidText（解析 + dagre 自动布局 + 组装文档），
// 不经过任何界面代码：能在 Node.js 里单独编译、运行，说明 src/core 与浏览器、React 互相独立。
// 构建：pnpm lab6:build    运行：pnpm lab6 <输入.mmd> > 输出.json
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, extname } from 'node:path'
import { parseArgs } from './args'
import { importMermaidText } from '../../src/core/io/importer'
import { docToJson } from '../../src/core/io/serialize'
import type { DiagramDoc } from '../../src/core/model/types'

const USAGE =
  '用法：mmd2json <输入.mmd> [-o 输出.json] [--stats]   （不给 -o 时 JSON 写到标准输出）'
const EMPTY_ERROR = '没有可识别的流程图内容'

/** 流程图插件的默认连线路由；CLI 不加载插件（插件依赖 React），这里与它保持一致 */
const EDGE_ROUTING = 'step'

/** 一行摘要：节点数、连线数、布局方向、跳过的行数 */
export function summarize(doc: DiagramDoc, skipped: number): string {
  const nodes = Object.keys(doc.nodes).length
  const edges = Object.keys(doc.edges).length
  const dir = doc.settings.layoutDirection
  return `节点 ${nodes} 个，连线 ${edges} 条，方向 ${dir}，跳过 ${skipped} 行`
}

/** 形状种类的中文名（与形状坞一致），用于 --stats 统计 */
const KIND_NAMES: Record<string, string> = {
  process: '处理',
  terminator: '起止',
  decision: '判断',
  database: '数据库',
  io: '输入输出',
  subprocess: '子流程',
  connector: '连接点',
}

/** 按形状种类统计节点数，按数量从多到少排列，如「处理 4、判断 2、起止 2」 */
export function shapeStats(doc: DiagramDoc): string {
  const count = new Map<string, number>()
  for (const n of Object.values(doc.nodes)) count.set(n.kind, (count.get(n.kind) ?? 0) + 1)
  return [...count]
    .sort((a, b) => b[1] - a[1])
    .map(([kind, n]) => `${KIND_NAMES[kind] ?? kind} ${n}`)
    .join('、')
}

/** 返回进程退出码：0 成功，1 内容无法导入，2 参数错误 */
export function main(argv: string[]): number {
  const args = parseArgs(argv)
  if (!args) {
    console.error(USAGE)
    return 2
  }
  const { input, output, stats } = args
  const text = readFileSync(input, 'utf8')
  const title = basename(input, extname(input))
  const r = importMermaidText(text, { title, edgeRouting: EDGE_ROUTING, emptyError: EMPTY_ERROR })
  if (!r.ok || !r.doc) {
    console.error(`导入失败：${r.errors.join('；')}`)
    return 1
  }
  const json = `${docToJson(r.doc)}\n`
  if (output) writeFileSync(output, json)
  else process.stdout.write(json)
  console.error(summarize(r.doc, r.skipped ?? 0))
  if (stats) console.error(`形状：${shapeStats(r.doc)}`)
  return 0
}

process.exitCode = main(process.argv.slice(2))
