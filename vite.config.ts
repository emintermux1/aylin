import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { handleChatRequest } from './server/chat-core'

/**
 * Dev-only middleware that serves POST /api/chat with the exact same handler
 * the Vercel serverless function uses, so `npm run dev` behaves like
 * production without needing `vercel dev`.
 */
function aylinDevApi(env: Record<string, string>): Plugin {
  return {
    name: 'aylin-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/chat', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'method_not_allowed' }))
          return
        }
        let raw = ''
        req.on('data', (chunk: Buffer) => {
          raw += chunk.toString('utf8')
        })
        req.on('end', () => {
          void handleChatRequest(raw, {
            apiKey: process.env.XAI_API_KEY ?? env.XAI_API_KEY,
            model: process.env.XAI_MODEL ?? env.XAI_MODEL,
          }).then((result) => {
            res.statusCode = result.status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(result.body))
          })
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), aylinDevApi(env)],
  }
})
