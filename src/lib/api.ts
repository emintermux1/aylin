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
/** He answered a story — she sees he watched that frame. Never a chat seen-tick. */
export const STORY_REPLY_MARK = '[HİKAYENE baktı]'

function toWireContent(m: ChatMsg): string {
  // Keep Asya's own conventions in the context so the model stays consistent.
  if (m.storyReply) {
    const cap = m.storyReply.caption.length > 0 ? ` — "${m.storyReply.caption}"` : ''
    return `${STORY_REPLY_MARK} [FOTO:${m.storyReply.photoId}]${cap}\n\n${m.text}`.trim()
  }
  if (m.kind === 'voice') return `🎙️ ${m.text}`
  if (m.kind === 'photo') {
    if (m.photoId) return `[FOTO:${m.photoId}] ${m.text}`.trim()
    // His upload: mark + caption stay on the wire; pixels ride separately
    // as `images` on requestAsyaReply.
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

function isHisUpload(m: ChatMsg): m is ChatMsg & { photoSrc: string } {
  return (
    m.kind === 'photo' &&
    m.author === 'user' &&
    m.photoId === undefined &&
    typeof m.photoSrc === 'string' &&
    m.photoSrc.startsWith('data:image/')
  )
}

/** Newest-first groups of consecutive user bubbles (beats skipped). */
function lastUserTurns(messages: ChatMsg[], limit: number): ChatMsg[][] {
  const turns: ChatMsg[][] = []
  let current: ChatMsg[] = []
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.kind === 'beat') continue
    if (m.author === 'user') {
      current.push(m)
      continue
    }
    if (current.length > 0) {
      turns.push(current.reverse())
      current = []
      if (turns.length >= limit) return turns
    }
  }
  if (current.length > 0) turns.push(current.reverse())
  return turns
}

const TOPIC_CHANGE =
  /kimsin|kim\s*sin|31|mast[uü]rb|çekiyorum|duşa|duş\b|yatak|otel|araba|soyun|ne yapıyorsun|napıyo|kim\s*o/

function isPhotoFollowup(turn: ChatMsg[]): boolean {
  const text = turn
    .filter((m) => m.kind !== 'photo')
    .map((m) => m.text)
    .join(' ')
    .toLowerCase()
  if (text.length === 0) return true
  if (TOPIC_CHANGE.test(text)) return false
  return text.length < 80
}

function srcsFrom(turn: ChatMsg[]): string[] {
  return turn.filter(isHisUpload).map((m) => m.photoSrc)
}

/**
 * Pixels only for the photo he just sent, plus one short follow-up
 * ("beğendin mi?"). A new topic (kimsin, 31, duş) drops the old frame
 * so she answers HIS words instead of restaring the nude.
 */
function collectHisPhotoSrcs(messages: ChatMsg[]): string[] {
  const turns = lastUserTurns(messages, 2)
  if (turns.length === 0) return []
  const [latest, prev] = [turns[0], turns[1]]
  const latestSrcs = srcsFrom(latest)
  if (latestSrcs.length > 0) return latestSrcs.slice(-2)
  if (prev && srcsFrom(prev).length > 0 && isPhotoFollowup(latest)) {
    return srcsFrom(prev).slice(-2)
  }
  return []
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
  /** "o yönetsin" toggle: the server tells her SHE runs him this turn. */
  lead?: boolean
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
  if (options.lead === true) body.lead = true
  const images = collectHisPhotoSrcs(history)
  if (images.length > 0) body.images = images
  return postChatWithRetry(body, signal)
}

/** Asks Grok to open the session (server injects the hidden kickoff). */
export function requestOpener(memory: string, mood: number, signal?: AbortSignal): Promise<string> {
  return postChatWithRetry(withMemory({ opener: true, mood }, memory), signal)
}

/**
 * She writes first: a surprise turn on top of the existing history. The
 * server appends its hidden Istanbul-clock kickoff — he typed nothing.
 * Never send images: a surprise is her own moment, not a photo reaction.
 */
export function requestSurprise(
  history: ChatMsg[],
  memory: string,
  options: ReplyOptions,
  signal?: AbortSignal,
): Promise<string> {
  const body = withMemory({ messages: toWire(history), mood: options.mood, surprise: true }, memory)
  if (options.lead === true) body.lead = true
  return postChatWithRetry(body, signal)
}
