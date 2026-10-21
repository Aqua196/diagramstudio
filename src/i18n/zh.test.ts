import { describe, expect, it } from 'vitest'
import { fmt, zh } from './zh'

// 冒烟测试：验证 vitest 链路与 i18n 契约
describe('i18n 骨架', () => {
  it('包含产品名与全部命名空间', () => {
    expect(zh.app.name).toBe('DiagramStudio')
    for (const ns of [
      'canvas',
      'editor',
      'toolbar',
      'menus',
      'shortcuts',
      'home',
      'io',
      'collab',
      'exportDialog',
      'errors',
    ] as const) {
      expect(zh[ns]).toBeDefined()
    }
  })

  it('三种图都有空状态文案与上手提示', () => {
    for (const t of ['flowchart', 'mindmap', 'er'] as const) {
      expect(zh.canvas.empty[t].title.length).toBeGreaterThan(0)
      expect(zh.plugins.tips[t].idle.length).toBeGreaterThan(0)
      expect(zh.plugins.tips[t].selected.length).toBeGreaterThan(0)
    }
  })

  it('fmt 填充占位符，缺失的键原样保留', () => {
    expect(fmt(zh.home.minutesAgo, { n: 3 })).toBe('3 分钟前')
    expect(fmt('{a}-{b}', { a: 1 })).toBe('1-{b}')
  })
})
