import type { ChatMsg } from './types'

/**
 * How many wire messages (merged turns) of context are sent to the model —
 * deep enough that she sees the relationship, not just the last exchange.
 */
const WIRE_HISTORY = 40
const REQUEST_TIMEOUT_MS = 28_000
const MAX_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 600

interface WireMessage {
  role: 'user' | 'assistant'
  content: string
}

function toWireContent(m: ChatMsg): string {
  // Keep Asya's own conventions in the context so the model stays consistent.
  if (m.kind === 'voice') return `🎙️ ${m.text}`
  if (m.kind === 'photo' && m.photoId) return `[FOTO:${m.photoId}] ${m.text}`.trim()
  return m.text
}

/**
 * Consecutive same-author bubbles (her multi-bubble bursts, his double-texts)
 * are merged into one wire message with blank-line separators — the exact
 * format the model itself writes, so one history slot holds one whole turn.
 */
function toWire(messages: ChatMsg[]): WireMessage[] {
  const wire: WireMessage[] = []
  for (const m of messages) {
    if (m.kind === 'beat') continue
    const role: WireMessage['role'] = m.author === 'user' ? 'user' : 'assistant'
    const content = toWireContent(m)
    const last = wire[wire.length - 1]
    if (last !== undefined && last.role === role) {
      last.content = `${last.content}\n\n${content}`
    } else {
      wire.push({ role, content })
    }
  }
  return wire.slice(-WIRE_HISTORY)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function postChatOnce(body: unknown, signal?: AbortSignal): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const onAbort = () => controller.abort()
  if (signal !== undefined) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onAbort, { once: true })
  }
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await response.json()) as { reply?: string; error?: string }
    if (!response.ok || typeof data.reply !== 'string' || data.reply.length === 0) {
      throw new Error(data.error ?? `http_${response.status}`)
    }
    return data.reply
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

async function postChatWithRetry(body: unknown, signal?: AbortSignal): Promise<string> {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await postChatOnce(body, signal)
    } catch (error) {
      lastError = error
      // He interrupted with a new message — this reply is obsolete, stop.
      if (signal?.aborted) throw error
      // A missing server key won't fix itself between attempts.
      if (error instanceof Error && error.message === 'no_key') throw error
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_BASE_DELAY_MS * attempt)
    }
  }
  throw lastError
}

/** Attaches the relationship-memory digest when there is one. */
function withMemory(body: Record<string, unknown>, memory: string): Record<string, unknown> {
  const trimmed = memory.trim()
  if (trimmed.length > 0) body.memory = trimmed
  return body
}

/** Asks Grok for Asya's next burst. Throws after all retries fail. */
export function requestAsyaReply(history: ChatMsg[], memory: string, signal?: AbortSignal): Promise<string> {
  return postChatWithRetry(withMemory({ messages: toWire(history) }, memory), signal)
}

/** Asks Grok to open the session (server injects the hidden kickoff). */
export function requestOpener(memory: string, signal?: AbortSignal): Promise<string> {
  return postChatWithRetry(withMemory({ opener: true }, memory), signal)
}
