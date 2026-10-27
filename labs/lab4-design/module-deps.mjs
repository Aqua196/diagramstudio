// 实验 4：统计 src 下模块级 import 依赖（不含测试文件），检测循环依赖。
// 用法：node labs/lab4-design/module-deps.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src')

/** 收集所有非测试的 .ts / .tsx 源文件 */
function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.|[/\\]test[/\\]/.test(p)) out.push(p)
  }
  return out
}

/** 文件 → 模块：core 按子目录，features/shell 按子目录，其余按顶层目录 */
function moduleOf(file) {
  const r = path.relative(SRC, file).split(path.sep)
  if (r[0] === 'core') return r.length > 2 ? `core/${r[1]}` : 'core/contracts'
  if (r[0] === 'features') return r[1] === 'shell' ? `features/shell/${r[2]}` : `features/${r[1]}`
  return r.length === 1 ? 'app' : r[0]
}

/** 解析 @/ 别名与相对路径；外部包返回 null */
function resolve(from, spec) {
  let base
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2))
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec)
  else return null
  for (const c of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c
  }
  return null
}

const IMPORT = /(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g
const files = walk(SRC)
const count = new Map()
const edges = new Map()
for (const f of files) {
  const m = moduleOf(f)
  count.set(m, (count.get(m) ?? 0) + 1)
  for (const match of fs.readFileSync(f, 'utf8').matchAll(IMPORT)) {
    const target = resolve(f, match[1] ?? match[2])
    if (!target) continue
    const tm = moduleOf(target)
    if (tm !== m) edges.set(`${m} -> ${tm}`, (edges.get(`${m} -> ${tm}`) ?? 0) + 1)
  }
}

console.log(`源文件 ${files.length} 个，模块 ${count.size} 个`)
for (const [m, c] of [...count].sort()) console.log(`  ${m}（${c}）`)
console.log(`模块间依赖 ${edges.size} 条（括号内为 import 次数）`)
for (const [e, c] of [...edges].sort()) console.log(`  ${e}（${c}）`)

// 深度优先搜索找环
const adj = {}
for (const e of edges.keys()) {
  const [a, b] = e.split(' -> ')
  ;(adj[a] ??= []).push(b)
}
const state = {}
const cycles = []
function dfs(u, stack) {
  state[u] = 1
  stack.push(u)
  for (const v of adj[u] ?? []) {
    if (state[v] === 1) cycles.push([...stack.slice(stack.indexOf(v)), v].join(' -> '))
    else if (!state[v]) dfs(v, stack)
  }
  stack.pop()
  state[u] = 2
}
for (const u of Object.keys(adj)) if (!state[u]) dfs(u, [])
console.log(cycles.length ? `发现循环依赖：\n  ${cycles.join('\n  ')}` : '模块级循环依赖：无')
