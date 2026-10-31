import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 设计参考/ 是只读基准，不进构建。用 external 兜住误引入的情况。
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: [/设计参考/, /design-reference/],
    },
  },
  server: {
    port: 5173,
    fs: { strict: true },
  },
})
