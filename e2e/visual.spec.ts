// 视觉定景截图：1440×900，改版后的 7 张基准图（首页/空白/三模板/选中/深色）。
// VISUAL_DIR 环境变量决定输出目录（默认 docs/screenshots/visual-after）。
import { expect, test, type Page } from '@playwright/test'
import { freshHome, newBlank, openExample, type DocType } from './helpers'

const DIR = process.env.VISUAL_DIR ?? 'docs/screenshots/visual-after'

test.use({ viewport: { width: 1440, height: 900 } })

async function shot(page: Page, name: string) {
  await page.mouse.move(1, 1)
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${DIR}/${name}.png` })
}

async function example(page: Page, type: DocType) {
  await freshHome(page)
  await openExample(page, type)
}

test('v1 首页', async ({ page }) => {
  await freshHome(page)
  await shot(page, '01-home')
})

test('v2 空白编辑器', async ({ page }) => {
  await freshHome(page)
  await newBlank(page, 'flowchart')
  await shot(page, '02-editor-empty')
})

test('v3 模板×3', async ({ page }) => {
  await example(page, 'flowchart')
  await shot(page, '03a-template-flow')
  await example(page, 'mindmap')
  await shot(page, '03b-template-mindmap')
  await example(page, 'er')
  await shot(page, '03c-template-er')
})

test('v4 选中节点', async ({ page }) => {
  await example(page, 'flowchart')
  await page.locator('.react-flow__node', { hasText: '生成会话' }).click()
  await expect(page.getByRole('toolbar')).toBeVisible()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${DIR}/04-node-selected.png` })
})

test('v5 深色', async ({ page }) => {
  await example(page, 'flowchart')
  await page.getByRole('button', { name: '更多', exact: true }).click()
  await page.getByRole('menuitemradio', { name: '深色' }).click()
  await shot(page, '05-dark')
})
