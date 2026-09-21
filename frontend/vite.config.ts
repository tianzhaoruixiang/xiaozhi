import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 本地后端地址：默认 3000，可用 VITE_API_TARGET 覆盖（如本机 3000 被占用时）
const apiTarget = process.env.VITE_API_TARGET || 'http://127.0.0.1:3000'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: Number(process.env.VITE_PORT || 4173),
    strictPort: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/health': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/xiaozhi-api': {
        target: apiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/xiaozhi-api/, '/api'),
      },
    },
  },
})
