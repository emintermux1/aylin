/**
 * xAI TTS proxy core, shared by the Vercel function (api/voice.ts) and the
 * Vite dev middleware so voice notes sound the same locally and in prod.
 *
 * Contract: transcript text in → whispered Turkish audio out (audio/mpeg).
 * voice_id "eve", language "tr", speed 0.82; the transcript is wrapped in
 * <whisper> and every "..." pause becomes a [breath] marker.
 */

const XAI_TTS_URL = 'https://api.x.ai/v1/tts'
const UPSTREAM_TIMEOUT_MS = 20_000
const MAX_TEXT_CHARS = 600

export type VoiceResult =
  | { ok: true; audio: ArrayBuffer; contentType: string }
  | { ok: false; status: number; error: string }

/** "...sesimi duyuyo musun..." → "<whisper>[breath] sesimi duyuyo musun [breath]</whisper>" */
export function toWhisperMarkup(text: string): string {
  const breathed = text
    .replace(/…/g, '...')
    .replace(/\.{3,}/g, ' [breath] ')
    .replace(/\s+/g, ' ')
    .trim()
  return `<whisper>${breathed}</whisper>`
}

export async function synthesizeVoice(rawText: unknown, apiKey: string | undefined): Promise<VoiceResult> {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    return { ok: false, status: 400, error: 'no_text' }
  }
  const key = apiKey?.trim()
  if (!key) {
    return { ok: false, status: 503, error: 'no_key' }
  }

  const text = toWhisperMarkup(rawText.trim().slice(0, MAX_TEXT_CHARS))
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
        speed: 0.82,
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
