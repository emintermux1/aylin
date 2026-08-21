import type { VercelRequest, VercelResponse } from '@vercel/node'
import { synthesizeVoice } from '../server/voice-core.js'

/**
 * POST /api/voice — proxies xAI TTS.
 * Body: { text: string, voice?: string }  →  200 audio/mpeg bytes, or JSON
 * error. voice is allowlisted server-side (eve/luna/ara/iris/carina) and
 * falls back to eve.
 * Env:  XAI_API_KEY (same key the chat uses).
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }
  let body: unknown = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      res.status(400).json({ error: 'bad_json' })
      return
    }
  }
  const { text, voice } = (body as { text?: unknown; voice?: unknown } | null) ?? {}
  const result = await synthesizeVoice(text, process.env.XAI_API_KEY, voice)
  // Explicit `=== false` comparison: `!result.ok` sometimes fails to narrow
  // the VoiceResult union under Vercel's build (TS2339 on status/error).
  if (result.ok === false) {
    res.status(result.status).json({ error: result.error })
    return
  }
  res.setHeader('Content-Type', result.contentType)
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).send(Buffer.from(result.audio))
}
