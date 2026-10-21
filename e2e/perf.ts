// 性能测量（UI 改版时重写）：用 CDP Tracing 采集渲染主线程每个任务（RunTask）的耗时。
// 旧做法量的是 rAF 间隔——无头 Chromium 的帧时钟固定约 17.8ms（空白页实测同值），
// 反映不出应用自身开销，且合成 pointermove 并不会触发 d3-drag 真正拖动。
import type { Page } from '@playwright/test'

export interface MainThreadStats {
  tasks: number
  p50: number
  p95: number
  max: number
  /** 采样期间主线程总忙碌时长（ms） */
  busy: number
}

interface TraceEvent {
  name: string
  ph: string
  pid: number
  tid: number
  dur?: number
  args?: { name?: string }
}

/** 在 action 执行期间采集主线程任务耗时分布 */
export async function traceMainThread(
  page: Page,
  action: () => Promise<void>,
): Promise<MainThreadStats> {
  const cdp = await page.context().newCDPSession(page)
  const events: TraceEvent[] = []
  cdp.on('Tracing.dataCollected', (e) => events.push(...(e.value as unknown as TraceEvent[])))
  const done = new Promise<void>((r) => cdp.once('Tracing.tracingComplete', () => r()))
  await cdp.send('Tracing.start', {
    categories: 'devtools.timeline,disabled-by-default-devtools.timeline',
    transferMode: 'ReportEvents',
  })
  await action()
  await cdp.send('Tracing.end')
  await done
  await cdp.detach()
  const main = events.find((e) => e.name === 'thread_name' && e.args?.name === 'CrRendererMain')
  const durs = events
    .filter(
      (e) => e.name === 'RunTask' && e.ph === 'X' && e.pid === main?.pid && e.tid === main?.tid,
    )
    .map((e) => (e.dur ?? 0) / 1000)
    .sort((a, b) => a - b)
  const q = (f: number) => durs[Math.min(durs.length - 1, Math.floor(durs.length * f))] ?? 0
  return {
    tasks: durs.length,
    p50: q(0.5),
    p95: q(0.95),
    max: durs.at(-1) ?? 0,
    busy: durs.reduce((a, b) => a + b, 0),
  }
}

export function fmtStats(s: MainThreadStats): string {
  return `tasks=${s.tasks} p50=${s.p50.toFixed(1)}ms p95=${s.p95.toFixed(1)}ms max=${s.max.toFixed(1)}ms busy=${s.busy.toFixed(0)}ms`
}
