import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 本地后端地址：默认 3000，可用 VITE_API_TARGET 覆盖（如本机 3000 被占用时）
const apiTarget = process.env.VITE_API_TARGET || 'http://127.0.0.1:3000'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: Number(process.env.VITE_PORT || 4173),
    strictPort: true,
    watch: {
      // 外部工具（编辑器、git、脚本）改写文件时原生 watcher 偶发漏事件，
      // 会导致 dev server 继续提供旧模块；轮询可确保变更一定被发现。
      usePolling: true,
      interval: 300,
    },
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
