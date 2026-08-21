import type { ChatMsg } from './types'

/** How many messages of context are sent to the model. */
const WIRE_HISTORY = 16
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

function toWire(messages: ChatMsg[]): WireMessage[] {
  return messages
    .filter((m) => m.kind !== 'beat')
    .map<WireMessage>((m) => ({
      role: m.author === 'user' ? 'user' : 'assistant',
      content: toWireContent(m),
    }))
    .slice(-WIRE_HISTORY)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function postChatOnce(body: unknown): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
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
  }
}

async function postChatWithRetry(body: unknown): Promise<string> {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await postChatOnce(body)
    } catch (error) {
      lastError = error
      // A missing server key won't fix itself between attempts.
      if (error instanceof Error && error.message === 'no_key') throw error
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_BASE_DELAY_MS * attempt)
    }
  }
  throw lastError
}

/** Asks Grok for Asya's next line. Throws after all retries fail. */
export function requestAsyaReply(history: ChatMsg[]): Promise<string> {
  return postChatWithRetry({ messages: toWire(history) })
}

/** Asks Grok to open the session (server injects the hidden kickoff). */
export function requestOpener(): Promise<string> {
  return postChatWithRetry({ opener: true })
}
