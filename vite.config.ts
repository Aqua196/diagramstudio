import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
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
        // 拆出体积大的第三方库，保持应用 chunk 在警告阈值内
        manualChunks: {
          react: ['react', 'react-dom'],
          xyflow: ['@xyflow/react'],
        },
      },
    },
  },
})
