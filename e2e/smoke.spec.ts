import { expect, test } from '@playwright/test'

// 冒烟：页面渲染 + 控制台零 error/warning（SPEC §3.9）
test('首页渲染且控制台干净', async ({ page }) => {
  const problems: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(msg.text())
  })
  page.on('pageerror', (err) => problems.push(err.message))

  await page.goto('/')
  await expect(page.locator('h1')).toContainText('DiagramStudio')
  await page.screenshot({ path: 'docs/screenshots/stage1-home.png' })
  expect(problems).toEqual([])
})
