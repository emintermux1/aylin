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

/** History mark for a photo HE sent — the persona reacts to it like she saw it. */
export const EMIN_PHOTO_MARK = '[EMİN FOTO attı]'

function toWireContent(m: ChatMsg): string {
  // Keep Asya's own conventions in the context so the model stays consistent.
  if (m.kind === 'voice') return `🎙️ ${m.text}`
  if (m.kind === 'photo') {
    if (m.photoId) return `[FOTO:${m.photoId}] ${m.text}`.trim()
    // His upload: the model can't take pixels, so the mark + caption carry it.
    return `${EMIN_PHOTO_MARK} ${m.text}`.trim()
  }
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

export interface ReplyOptions {
  /** Current arousal 0-100; the server injects it as a hidden system note. */
  mood: number
  /** Director turn: the server tells her to advance the scene one beat herself. */
  director?: boolean
}

/** Asks Grok for Asya's next burst. Throws after all retries fail. */
export function requestAsyaReply(
  history: ChatMsg[],
  memory: string,
  options: ReplyOptions,
  signal?: AbortSignal,
): Promise<string> {
  const body = withMemory({ messages: toWire(history), mood: options.mood }, memory)
  if (options.director === true) body.director = true
  return postChatWithRetry(body, signal)
}

/** Asks Grok to open the session (server injects the hidden kickoff). */
export function requestOpener(memory: string, mood: number, signal?: AbortSignal): Promise<string> {
  return postChatWithRetry(withMemory({ opener: true, mood }, memory), signal)
}
