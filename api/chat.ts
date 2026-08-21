import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleChatRequest } from '../server/chat-core.js'

/**
 * POST /api/chat — Vercel serverless function.
 * Body: { messages: { role: 'user' | 'assistant'; content: string }[], memory?: string, mood?: number, director?: boolean }
 *   or  { opener: true, memory?: string, mood?: number }
 * memory is the client-held relationship digest, mood the client-held arousal
 * (0-100), director a hand-over turn — each injected as its own system note.
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
