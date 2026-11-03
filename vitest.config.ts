import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // 组件测试（.test.tsx）用 React 17+ 的自动 JSX 运行时，与应用构建一致，不必在测试里 import React
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'labs/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // SPEC §8：core 目录行覆盖率不低于 80%
      include: ['src/core/**/*.ts'],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
    },
  },
})
