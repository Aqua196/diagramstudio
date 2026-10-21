// 动效验收（开启动效）：页面形变 + 画布自绘、节点从父节点飞出且连线全程贴着节点、
// 删除残影、动效不进历史、工具条不因改样式重建；以及「减少动态效果」下一帧都不播。
import { expect, test, type Page } from '@playwright/test'
import {
  freshHome,
  NODE,
  openExample,
  openWithoutTransition,
  selectEdge,
  settle,
  watchConsole,
} from './helpers'

test.use({ reducedMotion: 'no-preference' })

type Win = Window & {
  __vt: number
  __fx: number
  __samples: Array<{ x: number; y: number; h: number; ex?: number; ey?: number }>
  __ds: { getDoc: () => { nodes: Record<string, { position: { x: number; y: number } }> } }
}

/** 在应用脚本之前装好探针：统计 startViewTransition 调用次数、出现过的 ds-fx-* 动画类名 */
async function installProbes(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as Win
    w.__vt = 0
    w.__fx = 0
    const d = document as Document & { startViewTransition?: (cb: () => void) => unknown }
    const orig = d.startViewTransition?.bind(d)
    if (orig) {
      d.startViewTransition = (cb) => {
        w.__vt++
        return orig(cb)
      }
    }
    new MutationObserver((list) => {
      for (const m of list) {
        const el = m.target as Element
        if (typeof el.className === 'string' && el.className.includes('ds-fx-')) w.__fx++
      }
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
    })
  })
}

const positions = (page: Page) =>
  page.evaluate(() =>
    Object.fromEntries(
      Object.entries((window as unknown as Win).__ds.getDoc().nodes).map(([id, n]) => [
        id,
        n.position,
      ]),
    ),
  )

test('m1 看示例：卡片形变进编辑器，画布依次自绘；播完不留类名、转场命名，焦点落在画布', async ({
  page,
}) => {
  const problems = watchConsole(page)
  await installProbes(page)
  await freshHome(page)
  await page.locator('.ds-new-card.is-mindmap').getByRole('button', { name: '看示例' }).click()
  await expect(page.locator('.react-flow__node.ds-fx-pop').first()).toBeAttached()
  expect(await page.locator('.react-flow__node.ds-fx-pop').count()).toBeGreaterThan(10)
  await settle(page)
  expect(await page.evaluate(() => (window as unknown as Win).__vt)).toBe(1)
  await expect(page.locator('.react-flow__node[class*="ds-fx-"]')).toHaveCount(0)
  await expect(page.locator('.react-flow__edge[class*="ds-fx-"]')).toHaveCount(0)
  await expect(page.locator('[style*="view-transition-name"]')).toHaveCount(0)
  await expect(page.locator('html')).not.toHaveClass(/ds-vt/)
  await expect(page.locator('.ds-editor-canvas')).toBeFocused()
  expect(problems).toEqual([])
})

test('m2 Tab 加子主题：新节点从父节点飞出，连线终点每一帧都贴着节点左侧锚点', async ({ page }) => {
  const problems = watchConsole(page)
  await freshHome(page)
  await openWithoutTransition(page, () => openExample(page, 'mindmap'))
  await settle(page)
  await page.locator(NODE).filter({ hasText: '软件测试' }).first().click()
  await page.evaluate(() => {
    const w = window as unknown as Win
    w.__samples = []
    const t0 = performance.now()
    const tick = () => {
      const n = document.querySelector<HTMLElement>('.react-flow__node.ds-fx-enter')
      const m = n && /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(n.style.transform)
      if (n && m) {
        const path = document.querySelector(
          `.react-flow__edge[data-id="__parent_${n.dataset.id}"] path.react-flow__edge-path`,
        )
        const nums = (path?.getAttribute('d') ?? '').match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []
        w.__samples.push({
          x: +m[1],
          y: +m[2],
          h: n.offsetHeight,
          ex: nums.at(-2),
          ey: nums.at(-1),
        })
      }
      if (performance.now() - t0 < 1500) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  await page.keyboard.press('Tab')
  await page.waitForTimeout(1600)
  const samples = await page.evaluate(() => (window as unknown as Win).__samples)
  expect(new Set(samples.map((s) => `${s.x},${s.y}`)).size).toBeGreaterThanOrEqual(5)
  // 连线终点相对节点左侧中点的偏移（锚点圆在边框外侧，约 -5px）在整个飞行过程中保持不变 = 线一直贴着节点
  const withEdge = samples.filter((s) => s.ex !== undefined)
  expect(withEdge.length).toBeGreaterThanOrEqual(5)
  const dx = withEdge.map((s) => s.ex! - s.x)
  const dy = withEdge.map((s) => s.ey! - (s.y + s.h / 2))
  expect(Math.max(...dx) - Math.min(...dx)).toBeLessThan(1.5)
  expect(Math.max(...dy) - Math.min(...dy)).toBeLessThan(1.5)
  expect(Math.abs(dx[0])).toBeLessThan(8)
  await page.keyboard.press('Escape')
  await settle(page)
  expect(problems).toEqual([])
})

test('m3 删除：残影立刻出现且不可达，真实节点数立即减一；播完残影移除，撤销恢复', async ({
  page,
}) => {
  const problems = watchConsole(page)
  await freshHome(page)
  await openWithoutTransition(page, () => openExample(page, 'flowchart'))
  await settle(page)
  const before = await page.locator(NODE).count()
  await page.locator(NODE).nth(4).click()
  await page.keyboard.press('Delete')
  const snap = await page.evaluate(() => ({
    ghosts: document.querySelectorAll('.react-flow__node.ds-fx-ghost[aria-hidden="true"][inert]')
      .length,
    real: document.querySelectorAll('.react-flow__node:not(.ds-fx-ghost)').length,
  }))
  expect(snap).toEqual({ ghosts: 1, real: before - 1 })
  await settle(page)
  await expect(page.locator('.react-flow__node.ds-fx-ghost')).toHaveCount(0)
  await page.keyboard.press('Control+z')
  await settle(page)
  await expect(page.locator(NODE)).toHaveCount(before)
  expect(problems).toEqual([])
})

test('m4 自动布局滑动只是视图层：一次撤销就回到原位', async ({ page }) => {
  await freshHome(page)
  await openWithoutTransition(page, () => openExample(page, 'flowchart'))
  await settle(page)
  const original = await positions(page)
  await page.locator('.react-flow__pane').click({ position: { x: 700, y: 300 } })
  await page.keyboard.press('Shift+L')
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'busy')
  await settle(page)
  expect(await positions(page)).not.toEqual(original)
  await page.keyboard.press('Control+z')
  await settle(page)
  expect(await positions(page)).toEqual(original)
})

test('m5 连线工具条改样式：工具条不重建、焦点不丢', async ({ page }) => {
  await freshHome(page)
  await openWithoutTransition(page, () => openExample(page, 'flowchart'))
  await settle(page)
  await selectEdge(page, 1)
  const toolbar = page.locator('.react-flow__edge-toolbar .ds-toolbar')
  await expect(toolbar).toBeVisible()
  const handle = await toolbar.elementHandle()
  const dash = toolbar.locator('button').filter({ has: page.locator('.ds-dash-icon') })
  await dash.click()
  expect(await handle!.evaluate((el) => el.isConnected)).toBe(true)
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BUTTON')
})

test.describe('减少动态效果', () => {
  test.use({ reducedMotion: 'reduce' })

  test('m6 打开示例、加子主题、折叠、删除：不起转场、不挂任何动效类名、没有在播的动画', async ({
    page,
  }) => {
    await installProbes(page)
    await freshHome(page)
    await openExample(page, 'mindmap')
    await page.locator(NODE).filter({ hasText: '软件测试' }).first().click()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Escape')
    await page.locator(NODE).filter({ hasText: '软件设计' }).first().click()
    await page.keyboard.press('Delete')
    // 减少动态效果下动画时长 0.01ms，刚创建的要过一两帧才结束：短暂轮询，超过 1s 还在播才算失败
    const read = () =>
      page.evaluate(() => ({
        vt: (window as unknown as Win).__vt,
        fx: (window as unknown as Win).__fx,
        running: document
          .getAnimations()
          .filter(
            (a) =>
              a.playState === 'running' && a.effect?.getComputedTiming().iterations !== Infinity,
          ).length,
        busy: document.documentElement.dataset.motion ?? null,
      }))
    await expect.poll(read, { timeout: 1000 }).toEqual({ vt: 0, fx: 0, running: 0, busy: null })
  })
})
