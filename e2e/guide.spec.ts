// 用户手册配图（docs/screenshots/guide/*.png）：改版后可一键重生成，保证手册与界面一致。
// 只在 1440 视口跑；其他档位跳过。
import { expect, test, type Page } from '@playwright/test'
import { dropShape, freshHome, newBlank, openExample, paneCenter } from './helpers'

const DIR = 'docs/screenshots/guide'

test.beforeEach(({ page }) => {
  test.skip(page.viewportSize()!.width !== 1440, '手册配图只取 1440 档')
})

async function shot(page: Page, name: string) {
  await page.waitForTimeout(350)
  await page.screenshot({ path: `${DIR}/${name}.png` })
}

test('g1 首页（含最近图表）', async ({ page }) => {
  await freshHome(page)
  for (const type of ['flowchart', 'mindmap', 'er'] as const) {
    await openExample(page, type)
    await page.getByRole('button', { name: '返回首页' }).click()
  }
  await page.mouse.move(1, 1)
  await shot(page, '01-home')
})

test('g2 流程图：示例 + 选中节点的工具条与快捷加号', async ({ page }) => {
  await freshHome(page)
  await openExample(page, 'flowchart')
  await page.locator('.react-flow__node', { hasText: '生成会话' }).click()
  await expect(page.getByRole('toolbar')).toBeVisible()
  await shot(page, '02-flowchart-template')
})

test('g3 思维导图示例', async ({ page }) => {
  await freshHome(page)
  await openExample(page, 'mindmap')
  await page.locator('.react-flow__node', { hasText: '软件测试' }).click()
  await shot(page, '03-mindmap-template')
})

test('g4 ER 示例 + 选中关系的工具条', async ({ page }) => {
  await freshHome(page)
  await openExample(page, 'er')
  await page.locator('.react-flow__edge').first().dispatchEvent('click')
  await shot(page, '04-er-template')
})

test('g5 导出对话框', async ({ page }) => {
  await freshHome(page)
  await openExample(page, 'flowchart')
  await page.getByRole('button', { name: '导出', exact: true }).click()
  await page.getByRole('switch', { name: '图框与标题栏' }).click()
  await shot(page, '05-export-dialog')
})

test('g6 分享弹层（已开启协作）', async ({ page, browser }) => {
  await freshHome(page)
  await newBlank(page, 'flowchart')
  const c = await paneCenter(page)
  await dropShape(page, 'process', c.x, c.y)
  await page.getByRole('button', { name: '分享' }).click()
  await page.getByRole('button', { name: '开启协作并生成链接' }).click()
  await expect(page.locator('.ds-status-dot.is-connected')).toBeVisible({ timeout: 15_000 })
  const peerCtx = await browser.newContext({ reducedMotion: 'reduce' })
  const peer = await peerCtx.newPage()
  await peer.goto(page.url())
  await expect(peer.locator('.react-flow__node')).toHaveCount(1, { timeout: 15_000 })
  await peer.mouse.move(c.x + 160, c.y + 80)
  await expect(page.locator('.ds-share-peers .ds-peer-avatar')).toHaveCount(1, { timeout: 15_000 })
  await shot(page, '06-collab-share')
  await peerCtx.close()
})

test('g7 Mermaid 导入结果', async ({ page }) => {
  await freshHome(page)
  const fc = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '导入' }).click()
  await page.getByRole('menuitem', { name: '导入 Mermaid 流程图' }).click()
  await (
    await fc
  ).setFiles({
    name: 'order.mmd',
    mimeType: 'text/plain',
    buffer: Buffer.from(
      'graph TD\n  A([下单]) --> B{库存充足?}\n  B -->|是| C[扣减库存]\n  B -->|否| D[通知缺货]\n  C --> E[(订单库)]\n  E --> F([完成])\n',
    ),
  })
  await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 5000 })
  await shot(page, '07-mermaid-import')
})

test('g8 深色主题', async ({ page }) => {
  await freshHome(page)
  await openExample(page, 'mindmap')
  await page.getByRole('button', { name: '更多', exact: true }).click()
  await page.getByRole('menuitemradio', { name: '深色' }).click()
  await page.keyboard.press('Escape')
  await page.mouse.move(1, 1)
  await shot(page, '08-dark-theme')
})
