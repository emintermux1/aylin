import type { MoodSignal } from './types'
import { clampMood } from '../../shared/mood'
import { foldTr, normalizePhrase } from './turkish'

/**
 * Local-only arousal state (asya.mood.v1): a 0-100 number with the timestamp
 * of its last change. It cools off on its own over the hours he is away, so
 * she never wakes up still stuck at 100. Sent with every /api/chat call;
 * the server turns it into a hidden system note.
 *
 * It moves three ways: a small client-side nudge from what HE writes, a
 * hidden [MOOD:±n] tag the model emits, and idle decay. "sil" (clear chat)
 * never touches it — only the settings memory wipe resets it.
 */

const MOOD_KEY = 'asya.mood.v1'

/** Fresh browser: low end of the scale — naz first, heat earned. */
const DEFAULT_MOOD = 20
/** Cooling rate while he is away: ~100 → sakin overnight. */
const DECAY_PER_HOUR = 8
/** A single model tag may move her at most this much. */
const MODEL_DELTA_LIMIT = 16

interface StoredMood {
  value: number
  at: number
}

function readStored(): StoredMood | null {
  try {
    const raw = localStorage.getItem(MOOD_KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const { value, at } = parsed as Partial<StoredMood>
    if (typeof value !== 'number' || typeof at !== 'number') return null
    return { value: clampMood(value), at }
  } catch {
    return null
  }
}

function saveMood(value: number): void {
  try {
    localStorage.setItem(MOOD_KEY, JSON.stringify({ value: clampMood(value), at: Date.now() }))
  } catch {
    /* private mode — she just runs on the default heat */
  }
}

/**
 * Current mood with idle decay applied. Read-only: the stored anchor is kept
 * so repeated reads keep decaying from the same point in time.
 */
export function loadMood(): number {
  const stored = readStored()
  if (stored === null) return DEFAULT_MOOD
  const hoursIdle = Math.max(0, (Date.now() - stored.at) / 3_600_000)
  return clampMood(stored.value - hoursIdle * DECAY_PER_HOUR)
}

/** Adds a delta to the decayed value and persists the result. */
export function applyMoodDelta(delta: number): number {
  const next = clampMood(loadMood() + delta)
  saveMood(next)
  return next
}

/** Applies the model's hidden [MOOD:±n] tag (delta capped, absolute clamped). */
export function applyModelMood(signal: MoodSignal): number {
  if (signal.kind === 'set') {
    const next = clampMood(signal.value)
    saveMood(next)
    return next
  }
  const capped = Math.max(-MODEL_DELTA_LIMIT, Math.min(MODEL_DELTA_LIMIT, signal.value))
  return applyMoodDelta(capped)
}

export function resetMood(): void {
  try {
    localStorage.removeItem(MOOD_KEY)
  } catch {
    /* ignore */
  }
}

// --- client-side nudge from his message -----------------------------------
// Small and coarse on purpose: the model's own tag does the fine steering.
// Patterns match the ascii-folded form (see turkish.ts). HOT_RE / PRAISE_RE /
// COLD_LINES are exported so the adaptive typing beats (beats.ts) classify
// his message with the exact same ear.

export const HOT_RE =
  /\b(?:sik\w*|yala\w*|em|emmek|emsene|emeyim|azd\w*|azgin\w*|islak\w*|islan\w*|sulan\w*|am|amin\w*|amim\w*|amci[kg]\w*|yarra\w*|bosal\w*|op|opsene|opeyim|opus\w*|surt\w*|domal\w*|ciplak\w*|soyun\w*|parmakla\w*|zipla\w*|kuca[kg]\w*|orospu\w*|inle\w*|meme\w*|gogus\w*|gogs\w*|sakso\w*|got\w*|kalca\w*|becer\w*|delirt\w*|fisilda\w*|dilin\w*|yata[kg]\w*)\b/

export const PRAISE_RE =
  /\b(?:guzel\w*|harika\w*|muhtesem\w*|mukemmel\w*|tatli\w*|seviyorum|asigim|bayil\w*|begendim|canim\w*|melek\w*|afet\w*|seksi\w*|inanilmaz\w*)\b/

const ASK_RE = /\b(?:foto\w*|resim\w*|goster\w*|selfie\w*|sesli\w*)\b/

/** Whole-message brush-offs that cool her a little. */
export const COLD_LINES = new Set([
  'tamam', 'ok', 'okey', 'peki', 'evet', 'hayir', 'yok', 'iyi', 'olur',
  'hmm', 'hm', 'he', 'ha', 'neyse', 'bosver', 'bilmem', 'belki', 'sonra',
])

/**
 * Applies the small heuristic nudge for his message and returns the new mood.
 * Dirty talk, photo asks and praise warm her; a cold one-worder cools her.
 */
export function nudgeMoodFromUser(text: string): number {
  const folded = foldTr(text)
  let delta = 0
  if (HOT_RE.test(folded)) delta += 4
  if (ASK_RE.test(folded)) delta += 2
  if (PRAISE_RE.test(folded)) delta += 2
  if (delta === 0) {
    const phrase = normalizePhrase(text)
    if (phrase.length <= 2 || COLD_LINES.has(phrase)) delta = -3
  }
  return applyMoodDelta(Math.min(7, delta))
}
