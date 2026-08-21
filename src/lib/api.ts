import type { ChatMsg } from './types'

/** How many messages of context are sent to the model. */
const WIRE_HISTORY = 16
const REQUEST_TIMEOUT_MS = 15_000

interface WireMessage {
  role: 'user' | 'assistant'
  content: string
}

function toWireContent(m: ChatMsg): string {
  // Keep Aylin's own conventions in the context so the model stays consistent.
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

/**
 * Asks the serverless API for Aylin's next line. Throws on any failure
 * (missing key, timeout, upstream error) so the caller can switch to the
 * local fallback engine.
 */
export async function requestAylinReply(history: ChatMsg[]): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: toWire(history) }),
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
