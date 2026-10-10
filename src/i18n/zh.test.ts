import { describe, expect, it } from 'vitest'
import { zh } from './zh'

// 冒烟测试：验证 vitest 链路与 i18n 契约
describe('i18n 骨架', () => {
  it('包含产品名与全部命名空间', () => {
    expect(zh.app.name).toBe('DiagramStudio')
    for (const ns of [
      'canvas',
      'topbar',
      'palettePanel',
      'inspector',
      'menus',
      'shortcuts',
      'home',
      'io',
      'collab',
      'errors',
    ] as const) {
      expect(zh[ns]).toBeDefined()
    }
  })
})
