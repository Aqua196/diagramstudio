// createId：非安全上下文（http + 局域网 IP）没有 crypto.randomUUID 时也要能生成合法且不重复的 id。
import { afterEach, describe, expect, it } from 'vitest'
import { createId } from './factories'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const original = Object.getOwnPropertyDescriptor(crypto, 'randomUUID')

describe('createId', () => {
  afterEach(() => {
    if (original) Object.defineProperty(crypto, 'randomUUID', original)
  })

  it('没有 randomUUID 时退回 getRandomValues，仍是 UUID v4 且不重复', () => {
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })
    const ids = new Set(Array.from({ length: 200 }, createId))
    expect(ids.size).toBe(200)
    for (const id of ids) expect(id).toMatch(UUID_V4)
  })
})
