import { expect, test } from '@playwright/test'
import { watchConsole } from './helpers'

// 冒烟：页面渲染 + 控制台零 error/warning（SPEC §3.9）
test('首页渲染且控制台干净', async ({ page }) => {
  const problems = watchConsole(page)
  await page.goto('/')
  await expect(page.locator('.ds-home-name')).toContainText('DiagramStudio')
  await page.screenshot({ path: 'docs/screenshots/stage1-home.png' })
  expect(problems).toEqual([])
})
