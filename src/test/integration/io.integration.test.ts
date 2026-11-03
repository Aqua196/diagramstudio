// 实验 9 集成测试（一）：导入、校验、序列化、本地存储、插件模板之间的接口交互。
// 编号与实验报告表 9-1 对应；每个用例至少跨两个模块，只用真实实现，不打桩。
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { importJsonText, importMermaidText } from '@/core/io/importer'
import { docToMermaid } from '@/core/io/mermaid'
import { getStoredDoc, listDocs, saveDoc } from '@/core/io/persist'
import { docToJson } from '@/core/io/serialize'
import { validateDoc } from '@/core/model/schema'
import type { DiagramDoc } from '@/core/model/types'
import { getPlugin } from '@/plugins/registry'

const LOGIN = readFileSync('labs/lab6-module/login.mmd', 'utf8')
const shape = (d: DiagramDoc) =>
  Object.values(d.nodes)
    .map((n) => `${n.kind}:${n.text}`)
    .sort()

beforeEach(() => localStorage.clear())

describe('导入 × 校验 × 存储', () => {
  it('I1 Mermaid 导入的文档能通过结构校验，存入本地后原样读回并出现在首页索引', () => {
    const r = importMermaidText(LOGIN, { title: '登录流程', edgeRouting: 'step' })
    expect(r.ok).toBe(true)
    const doc = r.doc!
    expect(validateDoc(JSON.parse(docToJson(doc))).ok).toBe(true)
    saveDoc(doc)
    expect(getStoredDoc(doc.id)).toEqual(doc)
    expect(listDocs()).toEqual([
      { id: doc.id, title: '登录流程', type: 'flowchart', updatedAt: doc.updatedAt },
    ])
  })

  it('I2 工程文件往返：导出 JSON 再导入得到新 id、内容相同，两份文档在本地并存', () => {
    const src = importMermaidText(LOGIN, { title: '原件' }).doc!
    saveDoc(src)
    const back = importJsonText(docToJson(src))
    expect(back.ok).toBe(true)
    expect(back.doc!.id).not.toBe(src.id)
    expect({ ...back.doc!, id: src.id }).toEqual(src)
    saveDoc(back.doc!)
    expect(listDocs()).toHaveLength(2)
  })

  it('I3 三种图的插件模板都能序列化、通过校验并重新导入', () => {
    for (const type of ['flowchart', 'mindmap', 'er'] as const) {
      for (const t of getPlugin(type).templates) {
        const r = importJsonText(docToJson(t))
        expect(r.errors).toEqual([])
        expect(shape(r.doc!)).toEqual(shape(t))
        expect(Object.keys(r.doc!.edges)).toHaveLength(Object.keys(t.edges).length)
      }
    }
  })

  it('I4 流程图模板经 Mermaid 导出再导入：节点、连线、文字不变', () => {
    const [t] = getPlugin('flowchart').templates
    const r = importMermaidText(docToMermaid(t))
    expect(r.ok).toBe(true)
    expect(r.skipped).toBe(0)
    expect(
      Object.values(r.doc!.nodes)
        .map((n) => n.text)
        .sort(),
    ).toEqual(
      Object.values(t.nodes)
        .map((n) => n.text)
        .sort(),
    )
    expect(Object.keys(r.doc!.edges)).toHaveLength(Object.keys(t.edges).length)
  })
})

describe('命令行工具 × 网页导入', () => {
  const cli = 'labs/lab6-module/dist/mmd2json.mjs'
  beforeAll(() => {
    // 用工具自己的构建配置单独打包，与 pnpm lab6:build 相同
    execFileSync(process.execPath, [
      'node_modules/vite/bin/vite.js',
      'build',
      '--config',
      'labs/lab6-module/vite.config.ts',
    ])
  }, 60_000)

  it('I5 mmd2json 生成的工程文件能被网页的「导入 JSON」接受，内容与网页导入 Mermaid 一致', () => {
    expect(existsSync(cli)).toBe(true)
    const json = execFileSync(process.execPath, [cli, 'labs/lab6-module/login.mmd'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const fromCli = importJsonText(json)
    expect(fromCli.errors).toEqual([])
    const fromWeb = importMermaidText(LOGIN, { edgeRouting: 'step' }).doc!
    expect(shape(fromCli.doc!)).toEqual(shape(fromWeb))
    expect(fromCli.doc!.title).toBe('login')
  })
})
