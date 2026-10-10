// 视觉返工前后对照截图：1440×900，6 张定景。
// BEFORE_DIR / AFTER_DIR 环境变量决定输出目录（默认 docs/screenshots/visual-after）。
import { expect, test, type Page } from '@playwright/test'

const DIR = process.env.VISUAL_DIR ?? 'docs/screenshots/visual-after'

test.use({ viewport: { width: 1440, height: 900 } })

async function shot(page: Page, name: string) {
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${DIR}/${name}.png` })
}

async function newDoc(page: Page, name: RegExp) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByRole('button', { name }).first().click()
  await expect(page.locator('.react-flow')).toBeVisible()
}

async function openTemplate(page: Page, type: RegExp, tpl: RegExp) {
  await newDoc(page, type)
  // 左面板模板卡
  await page.locator('.ds-tpl-card', { hasText: tpl }).first().click()
  await page.waitForTimeout(300)
}

test('v1 首页', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await shot(page, '01-home')
})

test('v2 空白编辑器', async ({ page }) => {
  await newDoc(page, /流程图/)
  await shot(page, '02-editor-empty')
})

test('v3 模板×3', async ({ page }) => {
  await openTemplate(page, /流程图/, /登录/)
  await shot(page, '03a-template-flow')
  await openTemplate(page, /思维导图/, /./)
  await shot(page, '03b-template-mindmap')
  await openTemplate(page, /ER ?图/, /./)
  await shot(page, '03c-template-er')
})

test('v4 选中节点', async ({ page }) => {
  await openTemplate(page, /流程图/, /登录/)
  await page
    .locator('.react-flow__node', { hasText: '进入主页' })
    .click({ position: { x: 12, y: 12 } })
  await shot(page, '04-node-selected')
})

test('v5 暗色', async ({ page }) => {
  await openTemplate(page, /流程图/, /登录/)
  await page.getByRole('button', { name: '主题' }).click()
  await page.getByRole('menuitem', { name: '暗色' }).click()
  await shot(page, '05-dark')
})
