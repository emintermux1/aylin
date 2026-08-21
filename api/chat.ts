import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleChatRequest } from '../server/chat-core.js'

/**
 * POST /api/chat — Vercel serverless function.
 * Body: { messages: { role: 'user' | 'assistant'; content: string | ContentPart[] }[], images?: string[], memory?: string, mood?: number, director?: boolean, lead?: boolean }
 *   or  { opener: true, memory?: string, mood?: number }
 *   or  { surprise: true, messages?: [...], memory?: string, mood?: number, lead?: boolean } — she writes first
 * images are his last 1–2 JPEG/PNG data URLs; attached as xAI image_url parts
 * on the last user message (never on surprise/opener). Photo turns that 400
 * on grok-3-mini retry that turn only on grok-2-vision-1212.
 * memory is the client-held relationship digest, mood the client-held arousal
 * (0-100), director a hand-over turn, lead the "o yönetsin" toggle — each
 * injected as its own system note; surprise appends a hidden Istanbul-clock
 * kickoff after the history.
 * Env:  XAI_API_KEY (required for live replies), XAI_MODEL (default grok-3-mini)
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }
  const result = await handleChatRequest(req.body, {
    apiKey: process.env.XAI_API_KEY,
    model: process.env.XAI_MODEL,
  })
  res.status(result.status).json(result.body)
}
