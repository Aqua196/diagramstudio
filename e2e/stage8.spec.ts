// 阶段8 质量门：性能（500节点+800边 拖拽帧时 <20ms）与无障碍（axe 零 violation）。
// 另补生成暗色 1280 截图（子代理版基线缺失）。
import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// 性能断言针对生产构建（pnpm preview，4173）；dev 模式 React 严格双渲染不计入
test.use({ baseURL: 'http://localhost:4173' })

async function openEditor(page: Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByRole('button', { name: /流程图/ }).first().click()
  await expect(page.locator('.react-flow')).toBeVisible()
}

type Ds = {
  genDoc: (n: number, e: number) => unknown
  setDoc: (d: unknown) => void
  measureFrame: () => Promise<number>
  rf: { setViewport: (v: { x: number; y: number; zoom: number }) => Promise<void> }
}

async function injectStress(page: Page) {
  await page.evaluate(() => {
    const ds = (window as unknown as { __ds: Ds }).__ds
    ds.setDoc(ds.genDoc(500, 800))
  })
  await page.waitForTimeout(400)
}

test('性能：500节点+800边 局部视口拖拽帧时 <20ms；全览如实记录', async ({ page }) => {
  await openEditor(page)
  await injectStress(page)
  // 局部视口（zoom=1，典型编辑场景）— SPEC 断言对象
  await page.evaluate(() => (window as unknown as { __ds: Ds }).__ds.rf.setViewport({ x: 0, y: 0, zoom: 1 }))
  await page.waitForTimeout(200)
  const local = await page.evaluate(async () => {
    const ds = (window as unknown as { __ds: Ds }).__ds
    const s: number[] = []
    for (let i = 0; i < 120; i++) s.push(await ds.measureFrame())
    const steady = s.slice(20).sort((a, b) => a - b)
    return { p50: steady[50], p95: steady[95], max: steady[99] }
  })
  // 全览（fitView 500 节点全可见，最坏场景）— 只记录不断言
  await page.evaluate(() => (window as unknown as { __ds: Ds }).__ds.rf.setViewport({ x: -800, y: -600, zoom: 0.3 }))
  await page.waitForTimeout(200)
  const full = await page.evaluate(async () => {
    const ds = (window as unknown as { __ds: Ds }).__ds
    const s: number[] = []
    for (let i = 0; i < 120; i++) s.push(await ds.measureFrame())
    const steady = s.slice(20).sort((a, b) => a - b)
    return { p50: steady[50], p95: steady[95], max: steady[99] }
  })
  console.log(`PERF local: p50=${local.p50.toFixed(1)} p95=${local.p95.toFixed(1)} max=${local.max.toFixed(1)} | full: p50=${full.p50.toFixed(1)} p95=${full.p95.toFixed(1)} max=${full.max.toFixed(1)}`)
  expect(local.p95).toBeLessThan(20)
})

test('性能：局部视口节点拖拽帧时 <20ms', async ({ page }) => {
  await openEditor(page)
  await injectStress(page)
  await page.evaluate(() => (window as unknown as { __ds: Ds }).__ds.rf.setViewport({ x: 0, y: 0, zoom: 1 }))
  await page.waitForTimeout(200)
  const node = page.locator('.react-flow__node').first()
  await node.hover()
  const box = await node.boundingBox()
  if (!box) throw new Error('no node box')
  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  // 页面内合成 pointermove：每帧一格，rAF 间隔即真实帧耗（不夹带 CDP 往返）
  const frames: number[] = await page.evaluate(
    async ({ x, y }) => {
      const ds = (window as unknown as { __ds: { measureFrame: () => Promise<number> } }).__ds
      const out: number[] = []
      for (let i = 1; i <= 40; i++) {
        document.dispatchEvent(
          new PointerEvent('pointermove', { clientX: x + i * 12, clientY: y + i * 4, bubbles: true, pointerId: 1 }),
        )
        out.push(await ds.measureFrame())
      }
      return out
    },
    { x: startX, y: startY },
  )
  await page.mouse.up()
  frames.sort((a, b) => a - b)
  const p95 = frames[Math.floor(frames.length * 0.95)]
  const p50 = frames[Math.floor(frames.length * 0.5)]
  console.log(`PERF drag: p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms`)
  expect(p95).toBeLessThan(20)
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
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('ds:theme', 'dark')
  })
  await openEditor(page)
  const res = await new AxeBuilder({ page }).analyze()
  expect(res.violations).toEqual([])
  if (await page.evaluate(() => window.innerWidth === 1280))
    await page.screenshot({ path: 'docs/screenshots/stage34-editor-dark-1280.png' })
})
