// e2e 共用助手：控制台监听、新建/示例、形状拖入、把柄连线、截图命名。
import { expect, type Page } from '@playwright/test'

export type DocType = 'flowchart' | 'mindmap' | 'er'

const TYPE_NAME: Record<DocType, string> = { flowchart: '流程图', mindmap: '思维导图', er: 'ER 图' }

/** 收集 console error/warning 与未捕获异常；用例末尾断言为空 */
export function watchConsole(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(msg.text())
  })
  page.on('pageerror', (err) => problems.push(err.message))
  return problems
}

/** 清空本地存储后回到首页（关掉上手提示以外的状态全部重置） */
export async function freshHome(page: Page): Promise<void> {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.locator('.ds-new-card')).toHaveCount(3)
}

/** 首页「新建空白」 */
export async function newBlank(page: Page, type: DocType): Promise<void> {
  await page.getByRole('button', { name: `新建空白${TYPE_NAME[type]}` }).click()
  await expect(page.locator('.react-flow')).toBeVisible()
}

/** 首页「看示例」 */
export async function openExample(page: Page, type: DocType): Promise<void> {
  await page.locator(`.ds-new-card.is-${type}`).getByRole('button', { name: '看示例' }).click()
  await expect(page.locator('.react-flow__node').first()).toBeVisible()
}

/** 模拟 HTML5 拖入形状（DataTransfer 事件派发） */
export async function dropShape(page: Page, kind: string, x: number, y: number): Promise<void> {
  const pane = page.locator('.react-flow__pane')
  const init = {
    clientX: x,
    clientY: y,
    dataTransfer: await page.evaluateHandle((k) => {
      const dt = new DataTransfer()
      dt.setData('application/x-diagram-shape', k)
      return dt
    }, kind),
  }
  await pane.dispatchEvent('dragover', init)
  await pane.dispatchEvent('drop', init)
}

/** 从节点 A 的 from 侧把柄拖到节点 B 的 to 侧把柄 */
export async function connectNodes(
  page: Page,
  fromIdx: number,
  toIdx: number,
  from = 'bottom',
  to = 'top',
): Promise<void> {
  const nodes = page.locator('.react-flow__node')
  await nodes.nth(fromIdx).hover()
  const h = (await nodes.nth(fromIdx).locator(`.react-flow__handle-${from}`).boundingBox())!
  const t = (await nodes.nth(toIdx).locator(`.react-flow__handle-${to}`).boundingBox())!
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2)
  await page.mouse.down()
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 20 })
  await page.mouse.up()
}

/** 选中第 idx 条连线（点它的交互热区） */
export async function selectEdge(page: Page, idx = 0): Promise<void> {
  await page
    .locator('.react-flow__edge')
    .nth(idx)
    .locator('.react-flow__edge-interaction')
    .dispatchEvent('click')
}

/** 视口档位标签：1440 / 1280 */
export function vpTag(page: Page): string {
  return page.viewportSize()!.width === 1440 ? '1440' : '1280'
}

/** 画布中心（屏幕坐标） */
export async function paneCenter(page: Page): Promise<{ x: number; y: number }> {
  const box = (await page.locator('.react-flow__pane').boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** 等所有动效播完：页面/主题转场结束、画布动效空闲（html[data-motion]）、有限时长的动画都已停。
 *  用定时轮询而非 rAF 轮询：在 rAF 回调里取样，总能碰上本帧刚开始的过渡，永远等不到「静止」 */
export async function settle(page: Page): Promise<void> {
  const quiet = () => {
    const h = document.documentElement
    if (h.classList.contains('ds-vt-page') || h.classList.contains('ds-vt-theme')) return false
    if (h.dataset.motion === 'busy') return false
    return document
      .getAnimations()
      .every(
        (a) => a.playState !== 'running' || a.effect?.getComputedTiming().iterations === Infinity,
      )
  }
  await page.waitForFunction(quiet, null, { polling: 50 })
}

/** 画面上的真实节点（不含退场残影） */
export const NODE = '.react-flow__node:not(.ds-fx-ghost)'

/**
 * 不经页面转场进入编辑器后再打开动效：配置里为测真实帧耗加了 --disable-frame-rate-limit/--disable-gpu-vsync，
 * 这种无头模式下一旦播过 View Transition，requestAnimationFrame 就再也不触发（默认参数与真实浏览器无此问题），
 * 之后 Playwright 的点击稳定性检查会一直等下去。转场本身由 motion.spec m1 单独验证。
 */
export async function openWithoutTransition(page: Page, open: () => Promise<void>): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
}
