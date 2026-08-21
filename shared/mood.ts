/**
 * Arousal ("mood") scale shared by the client and the server: a 0-100 number
 * the client persists (asya.mood.v1) and sends with every /api/chat call.
 * The server turns it into a hidden system note; the client shows only the
 * small Turkish stage word under her name — never a number.
 */

export const MOOD_MIN = 0
export const MOOD_MAX = 100

export type MoodStageId = 'sakin' | 'isinmis' | 'azgin' | 'tasmis'

export interface MoodStage {
  id: MoodStageId
  /** The Turkish word shown in the header status. */
  label: string
  /** Inclusive lower bound of the band. */
  min: number
}

/** Bands: 0-24 sakin, 25-49 ısınmış, 50-74 azgın, 75-100 taşmış. */
export const MOOD_STAGES: readonly MoodStage[] = [
  { id: 'sakin', label: 'sakin', min: 0 },
  { id: 'isinmis', label: 'ısınmış', min: 25 },
  { id: 'azgin', label: 'azgın', min: 50 },
  { id: 'tasmis', label: 'taşmış', min: 75 },
]

/** From this value up (azgın) she volunteers photos instead of naz. */
export const MOOD_EAGER_MIN = 50

export function clampMood(value: number): number {
  if (!Number.isFinite(value)) return MOOD_MIN
  return Math.min(MOOD_MAX, Math.max(MOOD_MIN, Math.round(value)))
}

export function moodStage(value: number): MoodStage {
  const mood = clampMood(value)
  let stage = MOOD_STAGES[0]
  for (const candidate of MOOD_STAGES) {
    if (mood >= candidate.min) stage = candidate
  }
  return stage
}
