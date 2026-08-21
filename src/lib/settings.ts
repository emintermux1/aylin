/**
 * Local-only user settings (asya.settings.v1): which xAI voice reads her
 * voice notes, and whether "o yönetsin" mode is on. One user, one browser —
 * no accounts. The server allowlists the same voice ids and falls back to
 * eve, so a stale or tampered value can never pick an unknown voice.
 */

const SETTINGS_KEY = 'asya.settings.v1'

interface StoredSettings {
  voiceId?: unknown
  lead?: unknown
}

function readSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw === null) return {}
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? (parsed as StoredSettings) : {}
  } catch {
    return {}
  }
}

/** Merges one field in so the voice pick and the mode never clobber each other. */
function writeSettings(patch: StoredSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...readSettings(), ...patch }))
  } catch {
    /* private mode — defaults come back next visit */
  }
}

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
  const { voiceId } = readSettings()
  return isKnownVoice(voiceId) ? voiceId : DEFAULT_VOICE_ID
}

export function setVoiceId(voiceId: string): void {
  if (!isKnownVoice(voiceId)) return
  writeSettings({ voiceId })
}

/**
 * "o yönetsin": when on, every chat and surprise turn tells her SHE runs
 * him — tasks, permission control, come-here calls. Default off: normal
 * girlfriend.
 */
export function isLeadModeOn(): boolean {
  return readSettings().lead === true
}

export function setLeadMode(on: boolean): void {
  writeSettings({ lead: on })
}
