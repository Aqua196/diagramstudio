import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages 部署在 /<仓库名>/ 子路径下，由 DS_BASE 注入；本地开发与 e2e 保持根路径
  base: process.env.DS_BASE ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      // 统一用 @/ 引用 src，避免深层相对路径
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        // 按库拆 vendor chunk，保持每个 chunk 在 500 kB 警告阈值内（构建零警告是质量门）
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
          if (id.includes('@xyflow')) return 'xyflow'
          if (id.includes('@radix-ui')) return 'radix'
          if (/node_modules\/(yjs|y-websocket|y-protocols|lib0)\//.test(id)) return 'yjs'
          if (/node_modules\/(@dagrejs|d3-)/.test(id)) return 'layout'
          return 'vendor'
        },
      },
    },
  },
})
