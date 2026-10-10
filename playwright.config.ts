import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    // 默认用自带 chromium；若系统库缺失跑不起来，加 channel: 'chrome' 改用系统 Chrome
    // 解除 headless 帧率节流：性能用例要测真实帧耗，而非 30fps vsync 间隔
    launchOptions: { args: ['--disable-frame-rate-limit', '--disable-gpu-vsync'] },
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-1440',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'desktop-1280',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
  ],
  // A7：dev 5173（常规用例）、dist-e2e 预览 4173（stage8 性能/无障碍）、协作 ws 1234
  webServer: [
    {
      command: 'pnpm dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command:
        'pnpm build:e2e && pnpm exec vite preview --outDir dist-e2e --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'pnpm collab:server',
      url: 'http://localhost:1234',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
})
