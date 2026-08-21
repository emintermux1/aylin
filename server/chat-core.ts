import { AYLIN_SYSTEM_PROMPT } from './persona'
import { hasMinorContent, pickRefusal } from '../shared/safety'

/**
 * Shared chat handler used by both the Vercel serverless function
 * (api/chat.ts) and the Vite dev-server middleware (vite.config.ts), so the
 * exact same behavior runs locally and in production.
 */

export interface WireMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatConfig {
  apiKey?: string
  model?: string
}

export interface ChatResult {
  status: number
  body: { reply: string; source: 'grok' | 'guard' } | { error: string }
}

export const DEFAULT_MODEL = 'grok-3-mini'
const XAI_URL = 'https://api.x.ai/v1/chat/completions'
const MAX_HISTORY = 16
const MAX_CONTENT_CHARS = 2000
const UPSTREAM_TIMEOUT_MS = 20_000

function sanitizeMessages(raw: unknown): WireMessage[] {
  if (!Array.isArray(raw)) return []
  const clean: WireMessage[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const { role, content } = item as { role?: unknown; content?: unknown }
    if (role !== 'user' && role !== 'assistant') continue
    if (typeof content !== 'string') continue
    const text = content.trim().slice(0, MAX_CONTENT_CHARS)
    if (text.length === 0) continue
    clean.push({ role, content: text })
  }
  return clean.slice(-MAX_HISTORY)
}

async function callGrok(messages: WireMessage[], apiKey: string, model: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  try {
    const response = await fetch(XAI_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: AYLIN_SYSTEM_PROMPT }, ...messages],
        temperature: 1,
        max_tokens: 1024,
        stream: false,
      }),
    })
    if (!response.ok) {
      throw new Error(`xai_status_${response.status}`)
    }
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const reply = data.choices?.[0]?.message?.content?.trim()
    if (!reply) {
      throw new Error('xai_empty_reply')
    }
    return reply
  } finally {
    clearTimeout(timer)
  }
}

export async function handleChatRequest(rawBody: unknown, config: ChatConfig): Promise<ChatResult> {
  let parsed: unknown = rawBody
  if (typeof rawBody === 'string') {
    try {
      parsed = JSON.parse(rawBody)
    } catch {
      return { status: 400, body: { error: 'bad_json' } }
    }
  }

  const messagesRaw = (parsed as { messages?: unknown } | null)?.messages
  const messages = sanitizeMessages(messagesRaw)
  if (messages.length === 0) {
    return { status: 400, body: { error: 'no_messages' } }
  }

  // Authoritative safety gate: refuse minor-coded content before it can ever
  // reach the model, regardless of what the client did.
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  if (lastUser && hasMinorContent(lastUser.content)) {
    return { status: 200, body: { reply: pickRefusal(), source: 'guard' } }
  }

  const apiKey = config.apiKey?.trim()
  if (!apiKey) {
    // Signals the client to use its local fallback engine.
    return { status: 503, body: { error: 'no_key' } }
  }

  const model = config.model?.trim() || DEFAULT_MODEL
  try {
    const reply = await callGrok(messages, apiKey, model)
    return { status: 200, body: { reply, source: 'grok' } }
  } catch {
    return { status: 502, body: { error: 'upstream_failed' } }
  }
}
