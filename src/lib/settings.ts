/**
 * Local-only user settings (asya.settings.v1): which xAI voice reads her
 * voice notes. One user, one browser — no accounts. The server allowlists
 * the same ids and falls back to eve, so a stale or tampered value can never
 * pick an unknown voice.
 */

const SETTINGS_KEY = 'asya.settings.v1'

export interface VoiceOption {
  id: string
  label: string
}

/** eve is the original sound and stays the default, processed exactly as before. */
export const VOICE_OPTIONS: readonly VoiceOption[] = [
  { id: 'eve', label: 'Eve · şimdiki' },
  { id: 'luna', label: 'Luna · daha azdırıcı' },
  { id: 'ara', label: 'Ara · fısıltı' },
  { id: 'iris', label: 'Iris · genç' },
  { id: 'carina', label: 'Carina · sıcak' },
]

export const DEFAULT_VOICE_ID = 'eve'

function isKnownVoice(value: unknown): value is string {
  return typeof value === 'string' && VOICE_OPTIONS.some((option) => option.id === value)
}

export function getVoiceId(): string {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw === null) return DEFAULT_VOICE_ID
    const parsed: unknown = JSON.parse(raw)
    const voiceId = (parsed as { voiceId?: unknown } | null)?.voiceId
    return isKnownVoice(voiceId) ? voiceId : DEFAULT_VOICE_ID
  } catch {
    return DEFAULT_VOICE_ID
  }
}

export function setVoiceId(voiceId: string): void {
  if (!isKnownVoice(voiceId)) return
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ voiceId }))
  } catch {
    /* private mode — falls back to eve next visit */
  }
}
