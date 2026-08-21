import type { ChatMsg, FantasyId, PhotoId, ReplyPart } from './types'
import { MOOD_EAGER_MIN } from '../../shared/mood'
import { foldTr } from './turkish'

export interface AsyaPhoto {
  id: PhotoId
  src: string
  alt: string
}

export const PHOTO_LIST: AsyaPhoto[] = [
  { id: 'ben', src: '/asya.jpg', alt: 'asya, aynadan' },
  { id: 'ayna', src: '/asya/ayna.jpg', alt: 'makyaj masası, loş ışık' },
  { id: 'yatak', src: '/asya/yatak.jpg', alt: 'dağınık çarşaflar' },
  { id: 'balkon', src: '/asya/balkon.jpg', alt: 'gece balkonu, istanbul' },
  { id: 'dus', src: '/asya/dus.jpg', alt: 'buğulu duş camı' },
  { id: 'otel', src: '/asya/otel.jpg', alt: 'otel odası, gece' },
  { id: 'taksi', src: '/asya/taksi.jpg', alt: 'taksi arka koltuk' },
  { id: 'saten', src: '/asya/saten.jpg', alt: 'saten gecelik' },
  // Nude/tease set — the ones she sends when he asks for skin. Alt text
  // matches what the JPEG actually shows (checked frame by frame).
  { id: 'gomlek', src: '/asya/gomlek.jpg', alt: 'kahverengi fitilli üst, düğmeler açık, derin dekolte' },
  { id: 'etek', src: '/asya/etek.jpg', alt: 'siyah mini etek, külotlu çorap, yatakta oturmuş' },
  { id: 'dantel', src: '/asya/dantel.jpg', alt: 'adaçayı dantel takım, boy aynası selfiesi' },
  { id: 'acik', src: '/asya/acik.jpg', alt: 'üstünü çekmiş, memesi çıplak' },
  { id: 'dovme', src: '/asya/dovme.jpg', alt: 'yakın selfie, koyu fitilli atlet, yaka açık' },
]

const PHOTO_IDS = new Set<string>(PHOTO_LIST.map((p) => p.id))

export function isPhotoId(value: string): value is PhotoId {
  return PHOTO_IDS.has(value)
}

export function photoById(id: PhotoId): AsyaPhoto {
  return PHOTO_LIST.find((p) => p.id === id) ?? PHOTO_LIST[0]
}

/** Which photo a fantasy chip should pull. 'sesli' sends a voice note, 'devam' hands her the scene. */
export const CHIP_PHOTO: Record<Exclude<FantasyId, 'sesli' | 'devam'>, PhotoId> = {
  otel: 'otel',
  dus: 'dus',
  balkon: 'balkon',
  taksi: 'taksi',
  ofis: 'ayna',
}

// --- body-part targeting ----------------------------------------------------

/** What he is asking to see when he names a body part or asks for skin. */
export type BodyAsk = 'meme' | 'etek' | 'dantel' | 'dovme' | 'nude'

/**
 * Which nude-set ids actually show each asked part, best first (verified
 * against the JPEGs): acik = one bare breast, gomlek = open buttons / deep
 * cleavage, etek = mini skirt + tights (legs, hips), dantel = lace bra +
 * panties mirror selfie (also bare legs), dovme = covered henley selfie.
 * A clothed scene shot is never acceptable for any of these.
 */
export const NUDE_PREFERENCE: Record<BodyAsk, readonly PhotoId[]> = {
  meme: ['acik', 'gomlek', 'dantel'],
  etek: ['etek', 'dantel'],
  dantel: ['dantel'],
  dovme: ['dovme'],
  nude: ['acik', 'dantel', 'gomlek', 'etek'],
}

// Evidence that he wants a PHOTO (send/show verbs or the word itself) —
// "memelerini yalamak istiyorum" is dirty talk, not a photo ask.
const ASK_EVIDENCE_RE =
  /\b(?:at|atsana|atar|ativer|goster\w*|gonder\w*|yolla\w*|gormek|goreyim|gorebilir|bakayim|bakiyim|bakim|cek\w*|foto\w*|resim\w*|selfie\w*)\b/

// Suffixing softens final consonants (etek → eteğini, çorap → çorabını),
// so stems accept both forms on the folded text.
const SOYUN_RE = /\bsoyun\w*/
const DOVME_RE = /\bdovme\w*/
const MEME_RE = /\b(?:meme\w*|gogus\w*|gogs\w*|dekolte\w*|ustsuz|sutyensiz|tits)\b/
const ETEK_RE = /\b(?:ete[kg]\w*|kalca\w*|baca[kg]\w*|popo\w*|got\w*|cora[pb]\w*)\b/
const DANTEL_RE = /\b(?:dantel\w*|sutyen\w*|kulo[td]\w*|camasir\w*|lingerie)\b/
const NUDE_RE = /\b(?:ciplak\w*|nude|uryan)\b/

/**
 * Detects an unambiguous photo ask for a body part in HIS message. Returns
 * null when he only names the part inside dirty talk (no send/show verb) —
 * then the model stays free and the client never forces anything.
 */
export function detectPhotoAsk(text: string): BodyAsk | null {
  const folded = foldTr(text)
  // "soyun" is verb and ask in one word.
  if (SOYUN_RE.test(folded)) return 'nude'
  if (!ASK_EVIDENCE_RE.test(folded)) return null
  if (DOVME_RE.test(folded)) return 'dovme'
  if (MEME_RE.test(folded)) return 'meme'
  if (ETEK_RE.test(folded)) return 'etek'
  if (DANTEL_RE.test(folded)) return 'dantel'
  if (NUDE_RE.test(folded)) return 'nude'
  return null
}

/** Ids already sent in this thread, from the photo bubbles in history. */
export function sentPhotoIdSet(msgs: readonly ChatMsg[]): Set<PhotoId> {
  const ids = new Set<PhotoId>()
  for (const m of msgs) {
    if (m.kind === 'photo' && m.photoId) ids.add(m.photoId)
  }
  return ids
}

/** First fitting id he has not seen yet; falls back to the best one (a rerun beats a wrong body part). */
function pickBestPhoto(ask: BodyAsk, sentIds: ReadonlySet<PhotoId>): PhotoId {
  const preference = NUDE_PREFERENCE[ask]
  return preference.find((id) => !sentIds.has(id)) ?? preference[0]
}

/**
 * Safety net under the persona's body-part mapping, applied only on an
 * unambiguous ask:
 * - a photo with a wrong id (etek for a breast ask, any clothed scene shot)
 *   is swapped to the best unused matching id — its caption is dropped since
 *   it described the wrong shot;
 * - a missing photo is injected only when she is azgın/taşmış — below that a
 *   photoless reply is her naz and stays untouched.
 * Never adds a second photo; one per turn stays the law.
 */
export function enforcePhotoAsk(
  parts: ReplyPart[],
  ask: BodyAsk,
  mood: number,
  sentIds: ReadonlySet<PhotoId>,
): ReplyPart[] {
  const allowed = NUDE_PREFERENCE[ask]
  const photoIdx = parts.findIndex((p) => p.kind === 'photo')

  if (photoIdx >= 0) {
    const current = parts[photoIdx].photoId
    if (current !== undefined && allowed.includes(current)) return parts
    const next = [...parts]
    next[photoIdx] = { kind: 'photo', text: '', photoId: pickBestPhoto(ask, sentIds) }
    return next
  }

  if (mood < MOOD_EAGER_MIN) return parts
  const next = [...parts]
  next.splice(Math.min(1, next.length), 0, { kind: 'photo', text: '', photoId: pickBestPhoto(ask, sentIds) })
  return next.slice(0, 5)
}
