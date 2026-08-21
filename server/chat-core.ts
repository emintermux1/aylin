import {
  ASYA_SYSTEM_PROMPT,
  DIRECTOR_NOTE,
  LEAD_NOTE,
  buildMoodNote,
  buildOpenerKickoff,
  buildSurpriseKickoff,
} from './persona.js'
import { hasMinorContent, pickRefusal } from '../shared/safety.js'
import { clampMood } from '../shared/mood.js'

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
// Deep enough that she sees the relationship, not just the last exchange.
const MAX_HISTORY = 40
const MAX_CONTENT_CHARS = 2000
// Slightly above the client's ~2800-char digest cap, with headroom.
const MAX_MEMORY_CHARS = 3200
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

/**
 * The client-held relationship digest (asya.memory.v1). Minor-coded content
 * is dropped outright — the hard gate also covers what she "remembers".
 */
function sanitizeMemory(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const text = raw.trim().slice(0, MAX_MEMORY_CHARS)
  if (text.length === 0) return null
  if (hasMinorContent(text)) return null
  return text
}

/** The client-held arousal value (asya.mood.v1); absent or malformed → no mood note. */
function sanitizeMood(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null
  return clampMood(raw)
}

/** Extra system message injected on every call whenever a memory digest exists. */
function memorySystemContent(memory: string): string {
  return `RELATIONSHIP MEMORY with Emin — private notes of your shared history (oldest first). Shape yourself around this: what he likes, what you did together, pet names, promises, running bits, his hours. Never quote it verbatim, never mention that you have a memory file or notes — it is simply what you, his girlfriend, remember.
${memory}`
}

interface GrokAuth {
  apiKey: string
  model: string
}

interface SystemMessage {
  role: 'system'
  content: string
}

// temperature only: grok-3-mini is a reasoning model and returns 400 for
// frequency_penalty / presence_penalty, so those are never sent.
async function grokOnce(messages: WireMessage[], auth: GrokAuth, system: readonly SystemMessage[]): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  const payload: Record<string, unknown> = {
    model: auth.model,
    messages: [...system, ...messages],
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
async function callGrok(messages: WireMessage[], auth: GrokAuth, system: readonly SystemMessage[]): Promise<string> {
  try {
    return await grokOnce(messages, auth, system)
  } catch {
    return await grokOnce(messages, auth, system)
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

  const openerRequested = (parsed as { opener?: unknown } | null)?.opener === true
  const surpriseRequested = (parsed as { surprise?: unknown } | null)?.surprise === true
  const directorRequested = (parsed as { director?: unknown } | null)?.director === true
  const leadRequested = (parsed as { lead?: unknown } | null)?.lead === true
  const memory = sanitizeMemory((parsed as { memory?: unknown } | null)?.memory)
  const mood = sanitizeMood((parsed as { mood?: unknown } | null)?.mood)

  let messages: WireMessage[] = []
  if (!openerRequested) {
    const messagesRaw = (parsed as { messages?: unknown } | null)?.messages
    messages = sanitizeMessages(messagesRaw)
    // A surprise turn rides on whatever history exists — even none.
    if (messages.length === 0 && !surpriseRequested) {
      return { status: 400, body: { error: 'no_messages' } }
    }
    // Authoritative safety gate: refuse minor-coded content before anything
    // else — even before the key check, so it can never reach the model.
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUser && hasMinorContent(lastUser.content)) {
      return { status: 200, body: { reply: pickRefusal(), source: 'guard' } }
    }
  }

  const apiKey = config.apiKey?.trim()
  if (!apiKey) {
    return { status: 503, body: { error: 'no_key' } }
  }
  const auth: GrokAuth = { apiKey, model: config.model?.trim() || DEFAULT_MODEL }

  // System stack, fixed order: locked persona, then the relationship memory,
  // then her current arousal, then (chat only) the director hand-over.
  const system: SystemMessage[] = [{ role: 'system', content: ASYA_SYSTEM_PROMPT }]
  if (memory !== null) {
    system.push({ role: 'system', content: memorySystemContent(memory) })
  }
  if (mood !== null) {
    system.push({ role: 'system', content: buildMoodNote(mood) })
  }
  // "o yönetsin" rides every chat and surprise turn while toggled on.
  if (leadRequested && !openerRequested) {
    system.push({ role: 'system', content: LEAD_NOTE })
  }
  if (directorRequested && !openerRequested && !surpriseRequested) {
    system.push({ role: 'system', content: DIRECTOR_NOTE })
  }

  try {
    // Opener: the client sends no history; a hidden kickoff (random seed +
    // timestamp + tweet-state angle) makes Grok open every session
    // differently. The kickoff text never reaches the client. When a memory
    // digest rides along she may quietly know him — no "welcome back" lines.
    // Surprise: same trick appended AFTER the history — he typed nothing,
    // she initiates from her own Istanbul-clock moment.
    const wire = openerRequested
      ? [{ role: 'user' as const, content: buildOpenerKickoff(memory !== null) }]
      : surpriseRequested
        ? [...messages, { role: 'user' as const, content: buildSurpriseKickoff(memory !== null, mood ?? 20) }]
        : messages
    const reply = await callGrok(wire, auth, system)
    return { status: 200, body: { reply, source: 'grok' } }
  } catch {
    return { status: 502, body: { error: 'upstream_failed' } }
  }
}
