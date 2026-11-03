import { describe, expect, it } from 'vitest'
import { parseArgs } from './args'

describe('mmd2json 参数解析', () => {
  it('只给输入文件：JSON 写到标准输出', () => {
    expect(parseArgs(['login.mmd'])).toEqual({
      input: 'login.mmd',
      output: undefined,
      stats: false,
    })
  })

  it('-o 指定输出文件，位置在前在后都可以', () => {
    expect(parseArgs(['login.mmd', '-o', 'out.json'])).toEqual({
      input: 'login.mmd',
      output: 'out.json',
      stats: false,
    })
    expect(parseArgs(['-o', 'out.json', 'login.mmd'])).toEqual({
      input: 'login.mmd',
      output: 'out.json',
      stats: false,
    })
  })

  it('--stats 开关可与 -o 同时使用', () => {
    expect(parseArgs(['login.mmd', '--stats'])).toEqual({
      input: 'login.mmd',
      output: undefined,
      stats: true,
    })
    expect(parseArgs(['--stats', '-o', 'out.json', 'login.mmd'])).toEqual({
      input: 'login.mmd',
      output: 'out.json',
      stats: true,
    })
  })

  it('参数不完整时返回 null', () => {
    expect(parseArgs([])).toBeNull()
    expect(parseArgs(['-o', 'out.json'])).toBeNull()
    expect(parseArgs(['login.mmd', '-o'])).toBeNull()
    expect(parseArgs(['login.mmd', '-o', '--x'])).toBeNull()
  })
})
