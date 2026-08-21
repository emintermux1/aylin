/**
 * Client-side voice-note audio: fetches synthesized speech from /api/voice
 * and caches blob URLs per message so each note is generated once per
 * session. Returns null when TTS is unavailable (the bubble then falls back
 * to its silent waveform animation).
 */

const REQUEST_TIMEOUT_MS = 20_000

const urls = new Map<string, string | null>()
const inflight = new Map<string, Promise<string | null>>()

async function fetchVoice(text: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch('/api/voice', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    const contentType = response.headers.get('content-type') ?? ''
    if (!response.ok || !contentType.startsWith('audio/')) return null
    const blob = await response.blob()
    if (blob.size === 0) return null
    return URL.createObjectURL(blob)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Resolves to a playable blob URL, or null when TTS is unavailable. */
export function getVoiceAudio(key: string, text: string): Promise<string | null> {
  const cached = urls.get(key)
  if (cached !== undefined) return Promise.resolve(cached)
  const pending = inflight.get(key)
  if (pending) return pending
  const promise = fetchVoice(text).then((url) => {
    urls.set(key, url)
    inflight.delete(key)
    return url
  })
  inflight.set(key, promise)
  return promise
}

/** Fire-and-forget warmup so tapping play doesn't wait for synthesis. */
export function prefetchVoice(key: string, text: string): void {
  void getVoiceAudio(key, text)
}
