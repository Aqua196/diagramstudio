// 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前，超过一周显示日期。
import { fmt, zh } from '@/i18n/zh'

export function relativeTime(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000))
  if (s < 60) return zh.home.justNow
  if (s < 3600) return fmt(zh.home.minutesAgo, { n: Math.floor(s / 60) })
  if (s < 86400) return fmt(zh.home.hoursAgo, { n: Math.floor(s / 3600) })
  if (s < 7 * 86400) return fmt(zh.home.daysAgo, { n: Math.floor(s / 86400) })
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
