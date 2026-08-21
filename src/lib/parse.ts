import type { MoodSignal, ReplyPart } from './types'
import { isPhotoId } from './photos'

const FOTO_TAG_RE = /\[\s*foto\s*:\s*([a-z0-9çğıöşü_-]+)\s*\]/i
const VOICE_PREFIX_RE = /^(?:🎙️|🎙)\s*/u
// Hidden arousal tag ("[MOOD:+8]" / "[MOOD:64]") — stripped wherever it
// appears so it can never render as a bubble or leak into a caption.
const MOOD_TAG_RE = /\[\s*mood\s*[:=]?\s*([+-]?\d{1,3})\s*\]/gi
// A turn is a 2-5 bubble burst (persona REGISTER); allow all five to render.
const MAX_PARTS = 5

export interface ParsedReply {
  parts: ReplyPart[]
  /** The last mood tag found in the raw reply, if any. */
  mood: MoodSignal | null
}

/**
 * Turns a raw model reply into renderable bubbles. Blank lines split bubbles,
 * a "🎙️" prefix marks a voice note, "[FOTO:id]" marks a photo send, and
 * "[MOOD:±n]" tags are extracted into a mood signal (never shown).
 */
export function parseModelReply(raw: string): ParsedReply {
  let mood: MoodSignal | null = null
  const cleaned = raw.replace(MOOD_TAG_RE, (_, num: string) => {
    const value = Number.parseInt(num, 10)
    if (Number.isFinite(value)) {
      mood = { kind: num.startsWith('+') || num.startsWith('-') ? 'delta' : 'set', value }
    }
    return ''
  })

  const segments = cleaned
    .trim()
    .split(/\n{2,}/)
    .map((s) => s.replace(/\n+/g, ' ').trim())
    .filter((s) => s.length > 0)
    .slice(0, MAX_PARTS)

  const parts: ReplyPart[] = []
  let photoUsed = false

  for (const segment of segments) {
    const foto = FOTO_TAG_RE.exec(segment)
    if (foto && !photoUsed) {
      const id = foto[1].toLowerCase()
      const caption = segment.replace(FOTO_TAG_RE, '').trim()
      if (isPhotoId(id)) {
        photoUsed = true
        parts.push({ kind: 'photo', text: caption, photoId: id })
        continue
      }
      // Unknown id: fall through and keep the caption as plain text.
      if (caption.length > 0) {
        parts.push({ kind: 'text', text: caption })
      }
      continue
    }

    if (VOICE_PREFIX_RE.test(segment)) {
      parts.push({ kind: 'voice', text: segment.replace(VOICE_PREFIX_RE, '').trim() })
      continue
    }

    parts.push({ kind: 'text', text: segment })
  }

  if (parts.length === 0) {
    parts.push({ kind: 'text', text: '...' })
  }
  return { parts, mood }
}
