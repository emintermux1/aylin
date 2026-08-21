import type { ChatMsg } from './types'

const AGE_KEY = 'asya.age21.v1'
const CHAT_KEY = 'asya.chat.v1'

/**
 * Persist at most this many messages locally (bursts are 2-5 bubbles each).
 * Generous on purpose: the chat is their relationship, it should survive
 * refreshes for a long time.
 */
export const MAX_STORED_MESSAGES = 400

export function isAgeVerified(): boolean {
  try {
    return localStorage.getItem(AGE_KEY) === 'yes'
  } catch {
    return false
  }
}

export function setAgeVerified(): void {
  try {
    localStorage.setItem(AGE_KEY, 'yes')
  } catch {
    /* private mode — the gate will simply re-appear next visit */
  }
}

function isValidMsg(value: unknown): value is ChatMsg {
  if (typeof value !== 'object' || value === null) return false
  const m = value as Partial<ChatMsg>
  const baseOk =
    typeof m.id === 'string' &&
    (m.author === 'user' || m.author === 'asya') &&
    (m.kind === 'text' || m.kind === 'beat' || m.kind === 'voice' || m.kind === 'photo') &&
    typeof m.text === 'string' &&
    typeof m.at === 'number'
  if (!baseOk) return false
  if (m.kind === 'photo' && typeof m.photoId !== 'string') return false
  return true
}

export function loadMessages(): ChatMsg[] {
  try {
    const raw = localStorage.getItem(CHAT_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidMsg).slice(-MAX_STORED_MESSAGES)
  } catch {
    return []
  }
}

export function saveMessages(messages: ChatMsg[]): void {
  try {
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)))
  } catch {
    /* storage full or unavailable — chat still works in memory */
  }
}

export function clearMessages(): void {
  try {
    localStorage.removeItem(CHAT_KEY)
  } catch {
    /* ignore */
  }
}
