import { ASYA_SYSTEM_PROMPT, buildOpenerKickoff } from './persona.js'
import { hasMinorContent, pickRefusal } from '../shared/safety.js'

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
// Two upstream attempts must fit inside the function's 30s maxDuration and
// the client's 28s per-request timeout.
const UPSTREAM_TIMEOUT_MS = 12_000

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

interface GrokAuth {
  apiKey: string
  model: string
}

// temperature only: grok-3-mini is a reasoning model and returns 400 for
// frequency_penalty / presence_penalty, so those are never sent.
async function grokOnce(messages: WireMessage[], auth: GrokAuth): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  const payload: Record<string, unknown> = {
    model: auth.model,
    messages: [{ role: 'system', content: ASYA_SYSTEM_PROMPT }, ...messages],
    temperature: 1.25,
    max_tokens: 1024,
    stream: false,
  }
  try {
    const response = await fetch(XAI_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.apiKey}`,
      },
      body: JSON.stringify(payload),
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

/** One retry on any failure. */
async function callGrok(messages: WireMessage[], auth: GrokAuth): Promise<string> {
  try {
    return await grokOnce(messages, auth)
  } catch {
    return await grokOnce(messages, auth)
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

  const apiKey = config.apiKey?.trim()
  if (!apiKey) {
    return { status: 503, body: { error: 'no_key' } }
  }
  const auth: GrokAuth = { apiKey, model: config.model?.trim() || DEFAULT_MODEL }

  // Session opener: the client sends no history; a hidden kickoff (random
  // seed + timestamp + scene angle) makes Grok open every session differently.
  // The kickoff text never reaches the client.
  const openerRequested = (parsed as { opener?: unknown } | null)?.opener === true
  if (openerRequested) {
    try {
      const reply = await callGrok([{ role: 'user', content: buildOpenerKickoff() }], auth)
      return { status: 200, body: { reply, source: 'grok' } }
    } catch {
      return { status: 502, body: { error: 'upstream_failed' } }
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

  try {
    const reply = await callGrok(messages, auth)
    return { status: 200, body: { reply, source: 'grok' } }
  } catch {
    return { status: 502, body: { error: 'upstream_failed' } }
  }
}
