import { foldTr, normalizePhrase } from './turkish'
import { detectPhotoAsk } from './photos'
import { isDirectorLine } from './director'
import { COLD_LINES, HOT_RE, PRAISE_RE } from './mood'

/**
 * Adaptive pre-reply beats: the instant bubble she drops while Grok writes
 * the real reply. The beat REACTS to what he just said — a pet name gets a
 * pet name back, a photo ask gets a "dur bakiyom", a cold "tamam" gets a
 * quiet "hmm". Each line stays ONE short token/phrase, never a sentence of
 * dirty talk: this is still NOT a reply corpus, Grok writes the chat.
 *
 * The last few used beats are kept in a module var (mirrored to
 * sessionStorage, asya.beats.v1) so she never repeats herself back to back.
 */

export type BeatBucketId =
  | 'director'
  | 'photoask'
  | 'photoin'
  | 'horny'
  | 'scene'
  | 'sweet'
  | 'praise'
  | 'greeting'
  | 'cold'
  | 'question'
  | 'neutral'

export const BEAT_POOLS: Record<BeatBucketId, readonly string[]> = {
  // He handed her the wheel ("devam", "sen anlat") — she takes it.
  director: [
    'tamam',
    'geldim',
    'dur',
    'oke',
    'gel',
    'izle',
    'başlıyorum',
    'sıkı dur',
    'tamam bak',
    'gözlerini kapa',
    'dinle',
    'buradayım',
    'mmm tamam',
  ],
  // He asked for a photo / voice / skin — she reaches for the phone.
  photoask: [
    'dur bakiyom',
    'bi sn',
    'beklee',
    'dur bi',
    'bi dakka',
    'dur ya',
    'sabret',
    'sabret biraz',
    'hemen mi',
    'dur dur',
    'aceleci',
    'off acelecisin',
    'bakalım',
    'belkii',
  ],
  // He sent HER a photo — the gasp escapes while she "opens" it. Reached via
  // photoReceivedBeat(), never by text classification.
  photoin: [
    'dur ne bu',
    'aaaa',
    'bi bakiyim',
    'açıyorum',
    'açtım',
    'gördüm',
    'off ne bu',
    'deli misin sen',
    'ayyyy',
    'bu ne yaa',
    'dur dur açtım',
    'offf sen',
    'bakıyorum',
    'yaa emin',
  ],
  // His message was filth — the moan escapes before the real reply.
  horny: [
    'offff',
    'ahhhh',
    'mmmh',
    'ıhh',
    'off dur',
    'ah dur',
    'offf ya',
    'dur deli',
    'deli misin',
    'ayy',
    'off emin',
    'sus dur',
    'offff bekle',
    'mmm dur',
    'azdırma dur',
    'of of of',
  ],
  // He named a place / kicked off a scene — she scrambles into it.
  scene: [
    'off başlıyoruz',
    'dur geliyorum',
    'tamammm',
    'hazırlanıyorum',
    'geldim geldim',
    'of yine mi',
    'aklındaydı demek',
    'dur hazırlanıyorum',
    'sen dur',
    'offf oke',
    'hemen mi',
    'bekle beni',
    'delisin',
    'off tamam',
  ],
  // Pet names and love words — she melts back.
  sweet: [
    'aşkımmmm',
    'aşkım emin',
    'hmm aşkım',
    'cannnn',
    'efendim',
    'efendim aşkım',
    'söyle aşkım',
    'buradayım',
    'mmm',
    'geldim aşkım',
    'aşkım dur',
    'bi sn aşkım',
    'hı aşkım',
    'aşkımm benim',
    'off aşkım',
    'benim aşkım',
  ],
  // He praised her — shy giggle energy.
  praise: [
    'hihi',
    'ay dur',
    'utandım',
    'iiii',
    'yapma öyle',
    'kızardım',
    'susss',
    'off sen',
    'hadi ya',
    'cıks',
    'yalancı',
    'öyle mi',
    'devam et',
    'bi daha de',
    'duydum onu',
  ],
  // He just showed up — she noticed.
  greeting: [
    'geldinnn',
    'nihayet',
    'oooo',
    'sonunda',
    'hah geldin',
    'seni bekliyodum',
    'mmm geldin',
    'tam zamanında',
    'gelmişşş',
    'buradayım',
    'selamm',
    'geç kaldın',
    'neredeydin sen',
  ],
  // A cold one-worder from him — she goes quieter too.
  cold: [
    'hmm',
    'ne',
    'hm',
    'öyle mi',
    'peki',
    'ya',
    '...',
    'he',
    'hı',
    'öhm',
    'ne o',
    'bu muydu',
    'iyi',
  ],
  // He asked something — she thinks with her thumbs.
  question: [
    'hmm dur',
    'bi düşüniyim',
    'şey',
    'ıı',
    'dur ya',
    'nasıl desem',
    'bekle',
    'hmmm',
    'iyi soru',
    'dur düşüniyim',
    'bilmem ki',
    'ee şey',
    'hmm bakalım',
  ],
  // Nothing matched — the old generic waits.
  neutral: [
    'dur',
    'bi sn',
    'off',
    'mmm',
    'bekle...',
    'hmm',
    'geldim',
    'sus şimdi',
    'bakiyim',
    'dur ya',
    'şey',
    'bi dakka',
    'he dur',
    'dur dur dur',
    'offff',
  ],
}

// --- classification ---------------------------------------------------------
// Patterns run on the folded/normalized forms (turkish.ts). Reused matchers:
// detectPhotoAsk (body-part photo asks), isDirectorLine (hand-over lines),
// HOT_RE / PRAISE_RE / COLD_LINES (the mood nudge's ear).

const PHOTO_WORD_RE = /\b(?:foto\w*|resim\w*|selfie\w*|sesli\w*|video\w*|kamera\w*)\b/

// Scene places match suffixed forms on the folded text (mutfağa → mutfaga).
// "dus" and "cam" enumerate their suffixes so düşün/çamaşır never match.
const SCENE_RE =
  /\b(?:otel\w*|ofis\w*|taksi\w*|balkon\w*|mutfa[kg]\w*|asansor\w*|araba\w*|merdiven\w*|kulu[pb]\w*|klup\w*|soyunma\w*|pencere\w*|dus(?:a|u|ta|tan)?|cam(?:a|i|da|dan)?)\b/

const SWEET_RE =
  /\b(?:askim\w*|canim\w*|bebegim\w*|sevgilim\w*|hayatim\w*|birtanem\w*|bitanem\w*|guzelim\w*|prenses\w*|ozledim|ozluyorum|seviyorum)\b/

const GREET_RE =
  /\b(?:selam\w*|merhaba\w*|naber\w*|nbr|slm|gunaydin\w*|iyi geceler|iyi aksamlar|napiyosun|napiyorsun|naptin|uyandin)\b/

const QUESTION_WORD_RE =
  /(?:^|\s)(?:ne|neden|niye|nasil\w*|nicin|nerde\w*|nerede\w*|kim|kac|hangi|mi|mu|misin|musun|miydin|miyim)(?:\s|$)/

/** Which reaction family his message lands in. Exported for the smoke test. */
export function beatBucketId(userText: string): BeatBucketId {
  const folded = foldTr(userText)
  const phrase = normalizePhrase(userText)
  if (isDirectorLine(userText)) return 'director'
  if (detectPhotoAsk(userText) !== null || PHOTO_WORD_RE.test(folded)) return 'photoask'
  if (HOT_RE.test(folded)) return 'horny'
  if (SCENE_RE.test(folded)) return 'scene'
  if (SWEET_RE.test(folded) || /^emin+$/.test(phrase)) return 'sweet'
  if (PRAISE_RE.test(folded)) return 'praise'
  if (GREET_RE.test(folded)) return 'greeting'
  if (phrase.length <= 2 || COLD_LINES.has(phrase)) return 'cold'
  if (userText.includes('?') || QUESTION_WORD_RE.test(phrase)) return 'question'
  return 'neutral'
}

// --- picking with a no-repeat window ----------------------------------------

const RECENT_LIMIT = 4
const RECENT_KEY = 'asya.beats.v1'

function readRecent(): string[] {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is string => typeof v === 'string').slice(-RECENT_LIMIT)
  } catch {
    return []
  }
}

let recentBeats: string[] = readRecent()

function rememberBeat(beat: string): void {
  recentBeats = [...recentBeats, beat].slice(-RECENT_LIMIT)
  try {
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(recentBeats))
  } catch {
    /* private mode — the module var still guards this session */
  }
}

function pickBeat(pool: readonly string[]): string {
  const fresh = pool.filter((line) => !recentBeats.includes(line))
  const from = fresh.length > 0 ? fresh : pool
  const pick = from[Math.floor(Math.random() * from.length)]
  rememberBeat(pick)
  return pick
}

/**
 * The instant beat for HIS message: bucketed by what he just said, never one
 * of the last four beats used (pools are >4 lines, so a fresh one always
 * exists across buckets too).
 */
export function instantBeat(userText: string): string {
  return pickBeat(BEAT_POOLS[beatBucketId(userText)])
}

/** The instant beat when HE sends a photo — her gasp before the real reaction. */
export function photoReceivedBeat(): string {
  return pickBeat(BEAT_POOLS.photoin)
}

// --- header status ------------------------------------------------------------

const TYPING_LABELS: readonly { label: string; weight: number }[] = [
  { label: 'yazıyor…', weight: 0.72 },
  { label: 'yazıyo…', weight: 0.18 },
  { label: '…', weight: 0.1 },
]

/** WhatsApp-small header status while she types — mostly the normal word. */
export function typingStatus(): string {
  let roll = Math.random()
  for (const { label, weight } of TYPING_LABELS) {
    roll -= weight
    if (roll < 0) return label
  }
  return TYPING_LABELS[0].label
}
