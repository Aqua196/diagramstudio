// 实验 8 测试驱动开发：ER 字段的键标记支持「既是主键又是外键」。
// 先写下面的测试（失败），再修改 nextKey、新增 keyLabel 使其通过。
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ErField } from '@/core/model/types'
import { KeyButton, keyLabel, nextKey } from './erFieldButtons'

const field = (key: Partial<ErField> = {}): ErField => ({
  id: 'f1',
  name: 'doc_id',
  type: 'text',
  ...key,
})

describe('ER 字段键标记', () => {
  it('点击依次切换：无 → PK → FK → PK+FK → 无', () => {
    let f = field()
    const seen: string[] = []
    for (let i = 0; i < 4; i++) {
      f = { ...f, ...nextKey(f) }
      seen.push(keyLabel(f))
    }
    expect(seen).toEqual(['PK', 'FK', 'PK\nFK', ''])
  })

  it('每一步都同时给出 pk 和 fk，撤销时能完整还原', () => {
    for (const f of [
      field(),
      field({ pk: true }),
      field({ fk: true }),
      field({ pk: true, fk: true }),
    ]) {
      const next = nextKey(f)
      expect(typeof next.pk).toBe('boolean')
      expect(typeof next.fk).toBe('boolean')
    }
  })

  it('旧数据（只标了 pk 或 fk）显示不变', () => {
    expect(keyLabel(field({ pk: true }))).toBe('PK')
    expect(keyLabel(field({ fk: true }))).toBe('FK')
    expect(keyLabel(field())).toBe('')
  })

  it('键位按钮显示两个标记，并提交切换后的值', () => {
    const setField = vi.fn()
    render(<KeyButton f={field({ pk: true, fk: true })} api={{ setField, update: vi.fn() }} />)
    const btn = screen.getByRole('button')
    expect(btn.textContent).toBe('PK\nFK')
    btn.click()
    expect(setField).toHaveBeenCalledWith('f1', { pk: false, fk: false }, 'key')
  })
})
