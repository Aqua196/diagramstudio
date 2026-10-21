import { describe, expect, it } from 'vitest'
import { relativeTime } from './time'

describe('relativeTime', () => {
  const now = new Date(2026, 9, 21, 12, 0, 0).getTime()
  it('按分钟/小时/天分档', () => {
    expect(relativeTime(now - 10_000, now)).toBe('刚刚')
    expect(relativeTime(now - 5 * 60_000, now)).toBe('5 分钟前')
    expect(relativeTime(now - 3 * 3600_000, now)).toBe('3 小时前')
    expect(relativeTime(now - 2 * 86400_000, now)).toBe('2 天前')
  })
  it('超过一周显示日期', () => {
    expect(relativeTime(new Date(2026, 8, 1).getTime(), now)).toBe('2026-09-01')
  })
})
