import { normalizePhrase } from './turkish'

/**
 * Director turns: he doesn't want to write the scene, he wants it to happen.
 * A short hand-over line (or the "devam" chip) sets director: true on the
 * request and the server tells her to move the scene one beat by herself.
 *
 * Matching is exact on the whole normalized message, so "devam" alone hands
 * her the wheel but a longer sentence that merely contains it stays a normal
 * turn — director is opt-in, never every turn.
 */
const DIRECTOR_LINES = new Set([
  'olsun',
  'bir seyler olsun',
  'birseyler olsun',
  'bi seyler olsun',
  'biseyler olsun',
  'bisey olsun',
  'bir sey olsun',
  'devam',
  'devam et',
  'hadi devam',
  'devam et hadi',
  'sen yonet',
  'sen anlat',
  'anlat',
  'hikaye',
  'ne olursa olsun',
])

export function isDirectorLine(text: string): boolean {
  return DIRECTOR_LINES.has(normalizePhrase(text))
}
