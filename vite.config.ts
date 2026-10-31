import { defineConfig } from 'vite'
import type { Plugin, ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const COPY_FILE = path.join(ROOT, 'src', 'copy.json')

/**
 * 开发期把界面上的文案改动写回 src/copy.json。
 * 只有 vite dev 里存在，构建产物里没有任何写文件的能力。
 */
function copySave(): Plugin {
  return {
    name: 'arg-copy-save',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/__copy/save', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }

        const chunks: Buffer[] = []
        req.on('data', (chunk: Buffer) => chunks.push(chunk))
        req.on('end', async () => {
          try {
            const patch = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, string>
            const current = JSON.parse(await fs.readFile(COPY_FILE, 'utf8')) as Record<string, string>
            const next: Record<string, string> = { ...current }

            for (const [key, value] of Object.entries(patch)) {
              if (typeof value === 'string') next[key] = value
            }

            // 每次保存前留一份上一次的完整内容，误覆盖时还能捞回来
            await fs.copyFile(COPY_FILE, `${COPY_FILE}.bak`).catch(() => {})
            await fs.writeFile(COPY_FILE, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ ok: true, count: Object.keys(patch).length }))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: String(err) }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), copySave()],
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
