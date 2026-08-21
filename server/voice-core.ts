/**
 * xAI TTS proxy core, shared by the Vercel function (api/voice.ts) and the
 * Vite dev middleware so voice notes sound the same locally and in prod.
 *
 * Contract: spoken moan-register transcript in → slow whispered Turkish
 * audio out (audio/mpeg). voice_id "eve", language "tr", speed 0.72 (slower
 * reads breathier, more in-the-mouth). Before wrapping: unspeakable tokens
 * (🎙️ prefix, [FOTO:...] tags, emojis) are stripped; spoken moans
 * (ahh/offf/mmm/nhh/hh/uff/ayyy) stay as words and get their own [breath]
 * so they land as separate sounds; every "..." pause becomes a [breath].
 * Only markup xAI TTS already accepts is used: <whisper>, [breath], plain
 * syllables — no invented SSML.
 */

const XAI_TTS_URL = 'https://api.x.ai/v1/tts'
const UPSTREAM_TIMEOUT_MS = 20_000
const MAX_TEXT_CHARS = 600
const VOICE_SPEED = 0.72

// Moan tokens (stretched variants included) that should be voiced as
// standalone sounds: ahh, offf, uff, mmm, nhh, hh, ayyy...
const MOAN_RE = /(?<![\p{L}\p{N}])(a+h+|o+f+|u+f+|m{2,}|n+h+|h{2,}|a+y{2,})(?![\p{L}\p{N}])/giu

/** Mic prefixes, photo tags and emojis must never be spoken aloud. */
function stripUnspeakable(text: string): string {
  return text
    .replace(/\[\s*foto\s*:[^\]]*\]/gi, ' ')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, ' ')
}

/** "ahh... çok azdım offf" → "<whisper>[breath] ahh [breath] çok azdım [breath] offf [breath]</whisper>" */
export function toWhisperMarkup(text: string): string {
  const breathed = stripUnspeakable(text)
    .replace(/…/g, '...')
    .replace(/\.{3,}/g, ' [breath] ')
    .replace(MOAN_RE, ' [breath] $1 [breath] ')
    .replace(/(?:\s*\[breath\])+\s*/g, ' [breath] ')
    .replace(/\s+/g, ' ')
    .trim()
  return `<whisper>${breathed}</whisper>`
}

export type VoiceResult =
  | { ok: true; audio: ArrayBuffer; contentType: string }
  | { ok: false; status: number; error: string }

export async function synthesizeVoice(rawText: unknown, apiKey: string | undefined): Promise<VoiceResult> {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    return { ok: false, status: 400, error: 'no_text' }
  }
  const key = apiKey?.trim()
  if (!key) {
    return { ok: false, status: 503, error: 'no_key' }
  }

  const text = toWhisperMarkup(rawText.trim().slice(0, MAX_TEXT_CHARS))
  if (text === '<whisper></whisper>') {
    return { ok: false, status: 400, error: 'no_text' }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  try {
    const response = await fetch(XAI_TTS_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        text,
        voice_id: 'eve',
        language: 'tr',
        speed: VOICE_SPEED,
      }),
    })
    if (!response.ok) {
      return { ok: false, status: 502, error: `tts_status_${response.status}` }
    }
    const audio = await response.arrayBuffer()
    if (audio.byteLength === 0) {
      return { ok: false, status: 502, error: 'tts_empty' }
    }
    const contentType = response.headers.get('content-type') ?? 'audio/mpeg'
    return { ok: true, audio, contentType }
  } catch {
    return { ok: false, status: 502, error: 'tts_failed' }
  } finally {
    clearTimeout(timer)
  }
}
