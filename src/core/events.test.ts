// 事件总线：emit 发出 CustomEvent 且 detail 透传（SPEC §4 解耦手段）。
import { describe, expect, it, vi } from 'vitest'
import { emit, EV } from './events'

describe('emit', () => {
  it('dispatchEvent 到 window 且 detail 透传', () => {
    const listener = vi.fn()
    window.addEventListener(EV.ALIGN, listener)
    emit(EV.ALIGN, 'left')
    expect(listener).toHaveBeenCalledOnce()
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toBe('left')
    window.removeEventListener(EV.ALIGN, listener)
  })

  it('无 detail 时 detail 为 null（CustomEvent 默认）', () => {
    const listener = vi.fn()
    window.addEventListener(EV.FIT, listener)
    emit(EV.FIT)
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toBeNull()
    window.removeEventListener(EV.FIT, listener)
  })
})
