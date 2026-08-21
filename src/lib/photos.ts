import type { ChatMsg, FantasyId, PhotoId, ReplyPart } from './types'
import { MOOD_EAGER_MIN } from '../../shared/mood'
import { foldTr } from './turkish'

export interface AsyaPhoto {
  id: PhotoId
  src: string
  alt: string
}

/**
 * Moodboard archive (public/asya/<id>.jpg, cataloged in
 * server/photo-archive.json): her private tagged shots, wired so she can
 * send them matched to the moment. Alt text is the catalog's, verbatim —
 * the frame is the only truth a caption may lean on. Catalog order.
 */
const ARCHIVE_PHOTOS: AsyaPhoto[] = [
  { id: 'kucak', src: '/asya/kucak.jpg', alt: 'yeşil fayanslı banyoda kucakta, kelebek elbiseli kalçayı tutan eller' },
  { id: 'boyun1', src: '/asya/boyun1.jpg', alt: 'omuz açık, boyna yaslanmış öpücük, el boğazda' },
  { id: 'duscam', src: '/asya/duscam.jpg', alt: 'buğulu duş camının arkasında çıplak çift, bacak kalkık' },
  { id: 'parmak1', src: '/asya/parmak1.jpg', alt: 'neon pembe-mavi ışıkta parmaktan süzülen ıslak damla' },
  { id: 'parmak2', src: '/asya/parmak2.jpg', alt: 'iki parmak arasında uzayan şeffaf ıslak sıvı' },
  { id: 'lolipop', src: '/asya/lolipop.jpg', alt: 'ıslak dudak, diş ve dilin yakın çekimi' },
  { id: 'agizparmak', src: '/asya/agizparmak.jpg', alt: 'ağza girmiş parmak, pembe dudak ısırığı' },
  { id: 'mutfak1', src: '/asya/mutfak1.jpg', alt: 'mutfak tezgahına yaslanmış, mor transparan dantel elbise, arkadan' },
  { id: 'kalca1', src: '/asya/kalca1.jpg', alt: 'yatakta siyah çorap ve eldiven, ayna karşısında kalça açık' },
  { id: 'yerde', src: '/asya/yerde.jpg', alt: 'mermer zeminde diz çökmüş dar siyah elbise, üstten bakış' },
  { id: 'surtunme', src: '/asya/surtunme.jpg', alt: 'güneşli beyaz koltukta kucakta çıplak çift, arkadan' },
  { id: 'sortkucak', src: '/asya/sortkucak.jpg', alt: 'gri şortlu kalça, kanevede arkadan yaslanmış' },
  { id: 'yatakcift', src: '/asya/yatakcift.jpg', alt: 'yatakta saçından tutulan, yüzü yastığa dönük çıplak kadın' },
  { id: 'dekolte', src: '/asya/dekolte.jpg', alt: 'beyaz fırfırlı dekolteli bluz, hoop küpe, yakın selfie' },
  { id: 'satenyatak', src: '/asya/satenyatak.jpg', alt: 'yatakta beyaz saten gecelik ve dantelli külot' },
  { id: 'siyahcorap', src: '/asya/siyahcorap.jpg', alt: 'yatakta siyah dekolteli bluz ve dizüstü çorap' },
  { id: 'fileli', src: '/asya/fileli.jpg', alt: 'beyaz file çorap ve gri etek, kucağın yakın çekimi' },
  { id: 'yesiletek', src: '/asya/yesiletek.jpg', alt: 'yatakta zeytin yeşili kısa saten elbise, altın topuklu' },
  { id: 'ofiscorap', src: '/asya/ofiscorap.jpg', alt: 'yönetmen koltuğunda desenli file çorap ve siyah ceket' },
  { id: 'hediye', src: '/asya/hediye.jpg', alt: 'yatakta yüzüstü, kotun üstünde kırmızı hediye kurdelesi' },
  { id: 'kalpgogus', src: '/asya/kalpgogus.jpg', alt: 'siyah-beyaz, ellerle göğüsleri kalp yapan çıplak gövde' },
  { id: 'bikinieller', src: '/asya/bikinieller.jpg', alt: 'siyah bikini üstü, göğüsleri avuçlayan eller, top zincir' },
  { id: 'arababoyun', src: '/asya/arababoyun.jpg', alt: 'arabada boyna sokulmuş, el kalçada, siyah-beyaz kare' },
  { id: 'filetopuk', src: '/asya/filetopuk.jpg', alt: 'yataktan bakış: siyah file çorap ve topuklu sandalet' },
  { id: 'kirmizietek', src: '/asya/kirmizietek.jpg', alt: 'kırmızı dar elbisenin eteği yukarı çekilmiş, kalça-bacak hattı' },
  { id: 'askili', src: '/asya/askili.jpg', alt: 'yatakta siyah askılı atlet omuzdan inmiş, dekolte açık' },
  { id: 'kotkalca', src: '/asya/kotkalca.jpg', alt: 'yürüyen merdivende çok dar açık mavi kot, arkadan kalça' },
  { id: 'beyazatlet', src: '/asya/beyazatlet.jpg', alt: 'beyaz askılı dar atlet, yerde ayna selfiesi, dekolte' },
  { id: 'saridekolte', src: '/asya/saridekolte.jpg', alt: 'sarışın, siyah askılı dekolteli bluz, yukarıdan selfie' },
  { id: 'hirka', src: '/asya/hirka.jpg', alt: 'açık bej hırka, belirgin göğüs dekoltesi' },
  { id: 'corapayna', src: '/asya/corapayna.jpg', alt: 'ayna karşısında ten rengi çorap ve dantelli kısa çorap, bacak pozu' },
  { id: 'kanepede', src: '/asya/kanepede.jpg', alt: 'yeşil tişört ve siyah külot, kanepede yan uzanmış gövde' },
  { id: 'banyodudak', src: '/asya/banyodudak.jpg', alt: 'küvette ıslak saç, kırmızı ojeli parmak dudağı çekiyor' },
  { id: 'kirmizikucak', src: '/asya/kirmizikucak.jpg', alt: 'kırmızı ışıkta ayna, kucakta üstsüz siyah tanga, arkadan' },
]

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
  ...ARCHIVE_PHOTOS,
]

const PHOTO_IDS = new Set<string>(PHOTO_LIST.map((p) => p.id))

export function isPhotoId(value: string): value is PhotoId {
  return PHOTO_IDS.has(value)
}

export function photoById(id: PhotoId): AsyaPhoto {
  return PHOTO_LIST.find((p) => p.id === id) ?? PHOTO_LIST[0]
}

/**
 * Scene-TRUE asset per chip — a chip may only attach a JPEG that actually
 * shows that scene (every frame verified by eye):
 * - otel: hotel room at night; dus: steamy shower glass; balkon: balcony
 *   railing over the city; yatak: messy satin bed; taksi: car back seat
 *   with a rainy window — no taxi markings, so it honestly fits araba too;
 * - soyunma: gomlek IS mid-undress (buttons open, close frame);
 * - ofis: ofiscorap (fishnets in a director's chair, black blazer) is the
 *   ONLY office frame — ayna stays a makeup table, never "ofis";
 * - mutfak: mutfak1 (leaning on the counter, sheer lace dress, from behind);
 * - asansor/merdiven/cam/kulup still have no matching frame.
 * Unmapped scenes are text-first; 'sesli' sends a voice note, 'devam' hands
 * her the scene — neither ever maps to a photo.
 */
export const CHIP_PHOTO: Partial<Record<FantasyId, PhotoId>> = {
  otel: 'otel',
  dus: 'dus',
  balkon: 'balkon',
  taksi: 'taksi',
  yatak: 'yatak',
  araba: 'taksi',
  soyunma: 'gomlek',
  ofis: 'ofiscorap',
  mutfak: 'mutfak1',
}

/**
 * The tease/nude asset ids — arousal-gated everywhere, chips included. The
 * whole moodboard archive counts: every frame in it is her private skin.
 */
const NUDE_IDS: ReadonlySet<PhotoId> = new Set<PhotoId>([
  'gomlek',
  'etek',
  'dantel',
  'acik',
  'dovme',
  ...ARCHIVE_PHOTOS.map((p) => p.id),
])

/**
 * Close-frame tease shots that show only HER — nothing in frame that could
 * contradict a scene: the original three (gomlek: open buttons, acik: bare
 * breast on plain wood, dovme: clothed close selfie) plus the archive's
 * close crops (dekolte/saridekolte: near selfies, kalpgogus: bare torso,
 * bikinieller: hands on bikini top, hirka: open cardigan, lolipop and
 * agizparmak: mouth close-ups). Bed/room/tub frames (etek, dantel, askili,
 * beyazatlet, banyodudak...) are excluded on purpose: their backgrounds
 * would lie about ofis/kulüp/asansör.
 */
export const PLACE_AGNOSTIC_TEASE: readonly PhotoId[] = [
  'gomlek',
  'acik',
  'dovme',
  'dekolte',
  'kalpgogus',
  'bikinieller',
  'saridekolte',
  'hirka',
  'lolipop',
  'agizparmak',
]

/**
 * Whether a chip turn without a Grok photo gets one injected. Never a
 * guarantee, and NEVER a wrong-place decor shot:
 * - a scene-true asset rides a mood-scaled roll (an id he already got is
 *   never re-forced; the skin mappings — soyunma, ofis, mutfak — need
 *   azgın+ — naz stays naz);
 * - a scene with no matching JPEG (asansör, merdiven, cam, kulüp) stays
 *   text-only, except a rarer azgın+ roll that may drop one UNSENT
 *   place-agnostic tease — a shot of her body, claiming no place.
 */
export function chipPhotoOffer(id: FantasyId, mood: number, sentIds: ReadonlySet<PhotoId>): PhotoId | null {
  const mapped = CHIP_PHOTO[id]
  if (mapped !== undefined) {
    if (sentIds.has(mapped)) return null
    if (NUDE_IDS.has(mapped) && mood < MOOD_EAGER_MIN) return null
    const chance = mood >= MOOD_EAGER_MIN ? 0.55 : 0.3
    return Math.random() < chance ? mapped : null
  }
  if (mood < MOOD_EAGER_MIN) return null
  const fresh = PLACE_AGNOSTIC_TEASE.filter((p) => !sentIds.has(p))
  if (fresh.length === 0 || Math.random() >= 0.35) return null
  return fresh[Math.floor(Math.random() * fresh.length)]
}

// --- body-part targeting ----------------------------------------------------

/** What he is asking to see when he names a body part, an act or a place. */
export type BodyAsk =
  | 'meme'
  | 'etek'
  | 'dantel'
  | 'dovme'
  | 'nude'
  | 'soyunma'
  | 'dus'
  | 'ofis'
  | 'mutfak'
  | 'boyun'
  | 'parmak'
  | 'agiz'
  | 'surtunme'

/**
 * Which ids actually show each ask, best first (verified against the JPEGs
 * and the archive tags). The original nude set still leads where it fits
 * (acik = bare breast, gomlek = open buttons, etek = skirt + tights, dantel
 * = lace set, dovme = covered selfie); the archive frames queue up behind
 * it so a fresh ask never has to rerun an id while a tagged one is unused.
 * A decor scene shot (saten/balkon/otel/ayna...) is never acceptable for a
 * skin ask — only the dus ask may open with its honest shower-glass frame.
 */
export const NUDE_PREFERENCE: Record<BodyAsk, readonly PhotoId[]> = {
  meme: [
    'acik',
    'gomlek',
    'dantel',
    'dekolte',
    'kalpgogus',
    'bikinieller',
    'askili',
    'hirka',
    'beyazatlet',
    'saridekolte',
    'satenyatak',
    'siyahcorap',
    'kanepede',
  ],
  etek: [
    'etek',
    'kucak',
    'kalca1',
    'fileli',
    'yesiletek',
    'kirmizietek',
    'kotkalca',
    'corapayna',
    'sortkucak',
    'hediye',
    'filetopuk',
  ],
  dantel: ['dantel', 'satenyatak'],
  dovme: ['dovme'],
  nude: ['acik', 'kalpgogus', 'dantel', 'gomlek', 'etek'],
  soyunma: ['askili', 'kirmizietek', 'hirka', 'gomlek'],
  dus: ['dus', 'duscam', 'banyodudak'],
  ofis: ['ofiscorap'],
  mutfak: ['mutfak1'],
  boyun: ['boyun1', 'arababoyun'],
  parmak: ['parmak1', 'parmak2', 'agizparmak', 'banyodudak'],
  agiz: ['lolipop', 'agizparmak'],
  surtunme: ['kucak', 'surtunme', 'sortkucak', 'kirmizikucak', 'yatakcift', 'yerde'],
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
const AGIZ_RE = /\b(?:lolipop\w*|agiz\w*|agz\w*|duda[kg]\w*)\b/
const BOYUN_RE = /\b(?:boyun\w*|boyn\w*|ense\w*)\b/
// "yalan" (the lie) is not "yalanmak" (being licked) — bare yalan is excluded.
const PARMAK_RE = /\b(?:parma[kg]\w*|isla[knt]\w*|yala(?!n\b)\w*)\b/
const ETEK_RE = /\b(?:ete[kg]\w*|kalca\w*|baca[kg]\w*|popo\w*|got\w*|cora[pb]\w*)\b/
const DANTEL_RE = /\b(?:dantel\w*|sutyen\w*|kulo[td]\w*|camasir\w*|lingerie)\b/
// "sürtük" (surtu[gk]...) is an address he calls her, not a grind-frame ask.
const SURTUNME_RE = /\b(?:surt(?!u[gk])\w*|kuca[kg]\w*)\b/
// Folding collides "duş" with "düşün/düştü", so only the clean suffix forms
// count (duş, duşa..., duşta/duştan...); banyo and küvet are unambiguous.
const DUS_RE = /\b(?:dus|dusa\w*|dust[ae]\w*|banyo\w*|kuvet\w*)\b/
const OFIS_RE = /\bofis\w*/
const MUTFAK_RE = /\b(?:mutfa[kg]\w*|tezgah\w*)\b/
const NUDE_RE = /\b(?:ciplak\w*|nude|uryan)\b/

/**
 * Detects an unambiguous photo ask in HIS message. Returns null when he only
 * names the part inside dirty talk (no send/show verb) — then the model
 * stays free and the client never forces anything. Named body parts win
 * over act words, acts over places, bare "nude" comes last.
 */
export function detectPhotoAsk(text: string): BodyAsk | null {
  const folded = foldTr(text)
  // "soyun" is verb and ask in one word.
  if (SOYUN_RE.test(folded)) return 'soyunma'
  if (!ASK_EVIDENCE_RE.test(folded)) return null
  if (DOVME_RE.test(folded)) return 'dovme'
  if (MEME_RE.test(folded)) return 'meme'
  if (AGIZ_RE.test(folded)) return 'agiz'
  if (BOYUN_RE.test(folded)) return 'boyun'
  if (PARMAK_RE.test(folded)) return 'parmak'
  if (ETEK_RE.test(folded)) return 'etek'
  if (DANTEL_RE.test(folded)) return 'dantel'
  if (SURTUNME_RE.test(folded)) return 'surtunme'
  if (DUS_RE.test(folded)) return 'dus'
  if (OFIS_RE.test(folded)) return 'ofis'
  if (MUTFAK_RE.test(folded)) return 'mutfak'
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
