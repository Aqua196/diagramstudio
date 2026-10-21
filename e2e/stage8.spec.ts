// 阶段8 质量门：性能（500 节点 + 800 边真实拖拽，主线程无长任务）与无障碍（axe 零 violation）。
// 另补生成暗色 1280 截图（子代理版基线缺失）。
import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { openWithoutTransition } from './helpers'
import { fmtStats, traceMainThread } from './perf'

// 性能断言针对生产构建（pnpm preview，4173）；dev 模式 React 严格双渲染不计入
test.use({ baseURL: 'http://localhost:4173' })

async function openEditor(page: Page, opts: { dark?: boolean } = {}) {
  await page.goto('/')
  // 主题要在清空之后再写，否则暗色用例实际审的是亮色
  await page.evaluate((dark) => {
    localStorage.clear()
    if (dark) localStorage.setItem('ds:theme', 'dark')
  }, !!opts.dark)
  await page.reload()
  await page
    .getByRole('button', { name: /流程图/ })
    .first()
    .click()
  await expect(page.locator('.react-flow')).toBeVisible()
}

type Ds = {
  genDoc: (n: number, e: number) => unknown
  setDoc: (d: unknown) => void
  rf: { setViewport: (v: { x: number; y: number; zoom: number }) => Promise<void> }
}

const MOVES = 40
/** 单个任务超过 50ms 即 W3C「长任务」，会造成可感知的卡顿 */
const LONG_TASK_MS = 50

async function injectStress(page: Page, viewport: { x: number; y: number; zoom: number }) {
  await page.evaluate(() => {
    const ds = (window as unknown as { __ds: Ds }).__ds
    ds.setDoc(ds.genDoc(500, 800))
  })
  // 换文档后编辑器会自动适应画面：等它落定再设视口，避免两者赛跑
  await page.waitForTimeout(1200)
  await page.evaluate((v) => (window as unknown as { __ds: Ds }).__ds.rf.setViewport(v), viewport)
  await page.waitForTimeout(300)
}

/** 真实鼠标拖动第一个节点 MOVES 步，采集主线程任务分布 */
async function dragFirstNode(page: Page) {
  const box = (await page.locator('.react-flow__node').first().boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  const stats = await traceMainThread(page, async () => {
    for (let i = 1; i <= MOVES; i++) await page.mouse.move(x + i * 12, y + i * 4)
  })
  await page.mouse.up()
  return stats
}

// 性能在「开启动效」下测：500 节点超过动效上限，引擎应整体让路、拖动数字不受影响
test.describe('性能（开启动效）', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('性能：500 节点 + 800 边，局部视口拖拽无长任务（主线程 p95 < 50ms）', async ({ page }) => {
    await openWithoutTransition(page, () => openEditor(page))
    await injectStress(page, { x: 140, y: 120, zoom: 1 })
    const s = await dragFirstNode(page)
    console.log(`PERF drag local: ${fmtStats(s)} per-move=${(s.busy / MOVES).toFixed(1)}ms`)
    expect(s.p95).toBeLessThan(LONG_TASK_MS)
  })

  test('性能：500 节点全部可见（缩放 0.3）拖拽，如实记录', async ({ page }) => {
    await openWithoutTransition(page, () => openEditor(page))
    await injectStress(page, { x: 40, y: 60, zoom: 0.3 })
    const s = await dragFirstNode(page)
    console.log(`PERF drag full: ${fmtStats(s)} per-move=${(s.busy / MOVES).toFixed(1)}ms`)
    expect(s.tasks).toBeGreaterThan(0)
  })

  test('性能：110 节点自动布局的滑动补间（单次位移上限 120 以内）帧任务 p95 < 50ms', async ({
    page,
  }) => {
    await openWithoutTransition(page, () => openEditor(page))
    await page.evaluate(() => {
      const ds = (window as unknown as { __ds: Ds }).__ds
      ds.setDoc(ds.genDoc(110, 140))
    })
    await page.waitForTimeout(1200)
    await page.locator('.react-flow__pane').click({ position: { x: 600, y: 400 } })
    // 页面内记录补间是否真的跑过（位移超过上限时会直接到位，那就测不到补间了）
    await page.evaluate(() => {
      const w = window as unknown as { __tweened: boolean }
      w.__tweened = false
      new MutationObserver(() => {
        if (document.documentElement.dataset.motion === 'busy') w.__tweened = true
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] })
    })
    const s = await traceMainThread(page, async () => {
      await page.keyboard.press('Shift+L')
      await page.waitForTimeout(500)
    })
    console.log(`PERF layout tween 110: ${fmtStats(s)}`)
    const tweening = await page.evaluate(
      () => (window as unknown as { __tweened: boolean }).__tweened,
    )
    expect(tweening).toBe(true)
    expect(s.p95).toBeLessThan(LONG_TASK_MS)
  })
})

test('无障碍：首页+编辑器（亮色）axe 零 violation', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  const home = await new AxeBuilder({ page }).analyze()
  expect(home.violations).toEqual([])
  await openEditor(page)
  const editor = await new AxeBuilder({ page }).analyze()
  expect(editor.violations).toEqual([])
})

test('无障碍：编辑器（暗色）axe 零 violation + 1280 截图', async ({ page }) => {
  await openEditor(page, { dark: true })
  await expect(page.locator('html')).toHaveClass(/dark/)
  const res = await new AxeBuilder({ page }).analyze()
  expect(res.violations).toEqual([])
  if (await page.evaluate(() => window.innerWidth === 1280))
    await page.screenshot({ path: 'docs/screenshots/stage34-editor-dark-1280.png' })
})
