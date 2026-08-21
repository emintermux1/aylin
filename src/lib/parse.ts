import type { ReplyPart } from './types'
import { isPhotoId } from './photos'

const FOTO_TAG_RE = /\[\s*foto\s*:\s*([a-z0-9çğıöşü_-]+)\s*\]/i
const VOICE_PREFIX_RE = /^(?:🎙️|🎙)\s*/u
const MAX_PARTS = 3

/**
 * Turns a raw model reply into renderable bubbles. Blank lines split bubbles,
 * a "🎙️" prefix marks a voice note, and "[FOTO:id]" marks a photo send.
 */
export function parseModelReply(raw: string): ReplyPart[] {
  const segments = raw
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
  return parts
}
