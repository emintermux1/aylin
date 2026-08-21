import { defineConfig, loadEnv, type Plugin } from 'vite'
import type { Connect } from 'vite'
import react from '@vitejs/plugin-react'
import { handleChatRequest } from './server/chat-core.js'
import { synthesizeVoice } from './server/voice-core.js'

/**
 * Dev-only middleware serving POST /api/chat and /api/voice with the exact
 * same handlers the Vercel serverless functions use, so `npm run dev`
 * behaves like production without needing `vercel dev`.
 */

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk: Buffer) => {
      raw += chunk.toString('utf8')
    })
    req.on('end', () => resolve(raw))
  })
}

function asyaDevApi(env: Record<string, string>): Plugin {
  const apiKey = () => process.env.XAI_API_KEY ?? env.XAI_API_KEY
  const model = () => process.env.XAI_MODEL ?? env.XAI_MODEL

  return {
    name: 'asya-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/chat', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'method_not_allowed' }))
          return
        }
        void readBody(req)
          .then((raw) => handleChatRequest(raw, { apiKey: apiKey(), model: model() }))
          .then((result) => {
            res.statusCode = result.status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(result.body))
          })
      })

      server.middlewares.use('/api/voice', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'method_not_allowed' }))
          return
        }
        void readBody(req).then(async (raw) => {
          let text: unknown
          let voice: unknown
          try {
            const parsed = JSON.parse(raw) as { text?: unknown; voice?: unknown } | null
            text = parsed?.text
            voice = parsed?.voice
          } catch {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'bad_json' }))
            return
          }
          const result = await synthesizeVoice(text, apiKey(), voice)
          if (result.ok === false) {
            res.statusCode = result.status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: result.error }))
            return
          }
          res.statusCode = 200
          res.setHeader('Content-Type', result.contentType)
          res.setHeader('Cache-Control', 'no-store')
          res.end(Buffer.from(result.audio))
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), asyaDevApi(env)],
  }
})
