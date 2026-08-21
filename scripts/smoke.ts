import { readFileSync, readdirSync } from 'node:fs'
import { BEAT_POOLS, beatBucketId, instantBeat, typingStatus, type BeatBucketId } from '../src/lib/beats'
import { CHIP_OPENERS, SCENE_CHIPS, dailyChips, pickOpener } from '../src/lib/chips'
import {
  CHIP_PHOTO,
  NUDE_PREFERENCE,
  PHOTO_LIST,
  PLACE_AGNOSTIC_TEASE,
  chipPhotoOffer,
  detectPhotoAsk,
  enforcePhotoAsk,
  isPhotoId,
  type BodyAsk,
} from '../src/lib/photos'
import type { PhotoId, ReplyPart } from '../src/lib/types'
import { hasMinorContent } from '../shared/safety'

/**
 * Smoke checks for the client-side pools: beat buckets react to his message,
 * chip openers are deep and never repeat back to back, the visible row
 * rotates, and nothing in any pool trips the 21+ guard. Run: npm run smoke.
 * (Runs under Node via tsx; the storage-backed modules fall back to their
 * module vars when localStorage/sessionStorage are unavailable.)
 */

let failed = 0

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`ok   ${name}`)
  } else {
    failed++
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

// --- beat buckets ------------------------------------------------------------

const BUCKET_CASES: readonly [string, BeatBucketId][] = [
  ['aşkım', 'sweet'],
  ['aşkımmmm', 'sweet'],
  ['emin', 'sweet'],
  ['ofis', 'scene'],
  ['ofiste kal bu akşam', 'scene'],
  ['mutfağa geç', 'scene'],
  ['meme at', 'photoask'],
  ['foto at', 'photoask'],
  ['sesli at', 'photoask'],
  ['soyun', 'photoask'],
  ['devam', 'director'],
  ['sen anlat', 'director'],
  ['tamam', 'cold'],
  ['ok', 'cold'],
  ['sik beni', 'horny'],
  ['çok azdım bugün', 'horny'],
  ['selam', 'greeting'],
  ['günaydın', 'greeting'],
  ['çok güzelsin', 'praise'],
  ['nasılsın?', 'question'],
  ['bugün seni düşündüm', 'neutral'],
]

for (const [input, want] of BUCKET_CASES) {
  const got = beatBucketId(input)
  check(`bucket("${input}") = ${want}`, got === want, `got ${got}`)
}

const FIVE = ['aşkım', 'ofis', 'meme at', 'devam', 'tamam'].map(beatBucketId)
check('the five reference inputs land in five different buckets', new Set(FIVE).size === 5, FIVE.join(', '))

for (const [bucket, pool] of Object.entries(BEAT_POOLS)) {
  check(`beat pool "${bucket}" has 10-18 lines`, pool.length >= 10 && pool.length <= 18, String(pool.length))
  check(`beat pool "${bucket}" has no duplicates`, new Set(pool).size === pool.length)
  check(
    `beat pool "${bucket}" stays one short lowercase token/phrase`,
    pool.every((l) => l.length <= 24 && l.split(' ').length <= 3 && l === l.toLocaleLowerCase('tr-TR')),
  )
  check(`beat pool "${bucket}" is clean of minor-coded text`, pool.every((l) => !hasMinorContent(l)))
}

const beatPicks: string[] = []
let windowOk = true
for (let i = 0; i < 12; i++) {
  const beat = instantBeat('aşkım canım')
  if (beatPicks.slice(-4).includes(beat)) windowOk = false
  beatPicks.push(beat)
}
check('instantBeat never repeats any of the last 4 beats', windowOk, beatPicks.join(' | '))
check(
  'instantBeat("aşkım canım") picks from the sweet pool',
  beatPicks.every((b) => BEAT_POOLS.sweet.includes(b)),
)

const typingLabels = new Set(Array.from({ length: 200 }, typingStatus))
check(
  'typing status stays in the whatsapp-small set',
  [...typingLabels].every((l) => ['yazıyor…', 'yazıyo…', '…'].includes(l)),
  [...typingLabels].join(' | '),
)

// --- chip openers --------------------------------------------------------------

for (const [id, pool] of Object.entries(CHIP_OPENERS)) {
  check(`openers "${id}" have no duplicates`, new Set(pool).size === pool.length)
  check(`openers "${id}" are clean of minor-coded text`, pool.every((l) => !hasMinorContent(l)))
  check(`openers "${id}" stay short user lines`, pool.every((l) => l.length >= 3 && l.length <= 56))
}
for (const chip of SCENE_CHIPS) {
  const pool = CHIP_OPENERS[chip.id]
  check(`scene "${chip.id}" has >= 12 openers`, pool.length >= 12 && pool.length <= 16, String(pool.length))
}
check('sesli has a real pool too', CHIP_OPENERS.sesli.length >= 10)
check('devam pool holds director hand-over lines', CHIP_OPENERS.devam.length >= 5)

const allOpeners = Object.values(CHIP_OPENERS).flat()
check(
  'no opener reads as a cold brush-off beat',
  allOpeners.every((l) => beatBucketId(l) !== 'cold'),
)

const officeSeen = new Set<string>()
for (let i = 0; i < CHIP_OPENERS.ofis.length; i++) officeSeen.add(pickOpener('ofis'))
check(
  'ofis cycles through the whole pool before any repeat',
  officeSeen.size === CHIP_OPENERS.ofis.length,
  `${officeSeen.size}/${CHIP_OPENERS.ofis.length}`,
)
const balkonTap1 = pickOpener('balkon')
const balkonTap2 = pickOpener('balkon')
check('balkon tap 1 and tap 2 differ', balkonTap1 !== balkonTap2, `${balkonTap1} / ${balkonTap2}`)

// --- visible row rotation ------------------------------------------------------

const row = dailyChips()
const rowIds = row.map((c) => c.id)
check('visible row is 8 chips', row.length === 8, rowIds.join(', '))
check('row starts with devam and ends with sesli', rowIds[0] === 'devam' && rowIds[rowIds.length - 1] === 'sesli')
check('row has no duplicate chips', new Set(rowIds).size === rowIds.length)
check(
  'row scenes come from the scene catalog',
  rowIds.slice(1, -1).every((id) => SCENE_CHIPS.some((c) => c.id === id)),
)
check(
  'rotation is stable within the day',
  dailyChips()
    .map((c) => c.id)
    .join(',') === rowIds.join(','),
)

// --- chip photo map (scene truth verified by eye against the JPEGs) -------------

check(
  'chip photo ids are real assets',
  Object.values(CHIP_PHOTO).every((id) => id !== undefined && isPhotoId(id)),
)
check('devam and sesli never map to a photo', CHIP_PHOTO.devam === undefined && CHIP_PHOTO.sesli === undefined)

// Pin the exact scene-true mapping: only frames that actually show the scene.
const EXPECTED_CHIP_PHOTO: Readonly<Record<string, PhotoId>> = {
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
check(
  'chip photo map is exactly the verified scene-true set',
  Object.keys(CHIP_PHOTO).length === Object.keys(EXPECTED_CHIP_PHOTO).length &&
    Object.entries(EXPECTED_CHIP_PHOTO).every(([k, v]) => CHIP_PHOTO[k as keyof typeof CHIP_PHOTO] === v),
  JSON.stringify(CHIP_PHOTO),
)
check(
  'scenes with no matching JPEG are unmapped (asansor, merdiven, cam, kulup)',
  (['asansor', 'merdiven', 'cam', 'kulup'] as const).every((id) => CHIP_PHOTO[id] === undefined),
)
check(
  'decor shots never ride a chip (ayna is a vanity, saten a nightgown, ben a selfie)',
  Object.values(CHIP_PHOTO).every((id) => id !== 'ayna' && id !== 'saten' && id !== 'ben'),
)
const PLACE_AGNOSTIC_EXPECTED: readonly PhotoId[] = [
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
check(
  'place-agnostic teases are close frames only — never the bed/bedroom shots',
  PLACE_AGNOSTIC_TEASE.every((id) => id !== 'etek' && id !== 'dantel') &&
    PLACE_AGNOSTIC_TEASE.every((id) => PLACE_AGNOSTIC_EXPECTED.includes(id)),
)

// Behavioral: the ofis/mutfak mappings are archive skin, so they stay
// azgın-gated; at azgın+ each chip may offer only ITS scene-true frame.
const NO_SENT: ReadonlySet<PhotoId> = new Set()
let ofisColdOk = true
for (let i = 0; i < 100; i++) {
  if (chipPhotoOffer('ofis', 30, NO_SENT) !== null) ofisColdOk = false
}
check('ofis offers no photo below azgın', ofisColdOk)
let ofisHotOk = true
let ofisHotSeen = false
for (let i = 0; i < 300; i++) {
  const offer = chipPhotoOffer('ofis', 90, NO_SENT)
  if (offer === null) continue
  ofisHotSeen = true
  if (offer !== 'ofiscorap') ofisHotOk = false
}
check('ofis at azgın+ offers only ofiscorap (never ayna)', ofisHotOk && ofisHotSeen)
let mutfakColdOk = true
for (let i = 0; i < 100; i++) {
  if (chipPhotoOffer('mutfak', 30, NO_SENT) !== null) mutfakColdOk = false
}
check('mutfak offers no photo below azgın', mutfakColdOk)
let mutfakHotOk = true
let mutfakHotSeen = false
for (let i = 0; i < 300; i++) {
  const offer = chipPhotoOffer('mutfak', 90, NO_SENT)
  if (offer === null) continue
  mutfakHotSeen = true
  if (offer !== 'mutfak1') mutfakHotOk = false
}
check('mutfak at azgın+ offers only mutfak1', mutfakHotOk && mutfakHotSeen)
let rerunOk = true
for (let i = 0; i < 100; i++) {
  if (chipPhotoOffer('otel', 90, new Set<PhotoId>(['otel'])) !== null) rerunOk = false
}
check('an already-sent scene photo is never re-forced', rerunOk)
let soyunmaNazOk = true
for (let i = 0; i < 100; i++) {
  if (chipPhotoOffer('soyunma', 30, NO_SENT) !== null) soyunmaNazOk = false
}
check('soyunma nude mapping stays azgın-gated', soyunmaNazOk)

// --- moodboard archive (catalog ↔ JPEGs ↔ wiring) --------------------------------

interface CatalogEntry {
  id: string
  file: string
  tags: string[]
  alt: string
}
const catalog = JSON.parse(
  readFileSync(new URL('../server/photo-archive.json', import.meta.url), 'utf8'),
) as CatalogEntry[]
const assetFiles = new Set(readdirSync(new URL('../public/asya', import.meta.url)))
const listedPhotos = new Map(PHOTO_LIST.map((p) => [p.id as string, p]))

check('catalog holds the 34 moodboard frames', catalog.length === 34, String(catalog.length))
check('catalog ids are unique', new Set(catalog.map((e) => e.id)).size === catalog.length)
for (const entry of catalog) {
  const listed = listedPhotos.get(entry.id)
  check(
    `catalog "${entry.id}" is fully wired (JPEG on disk, PhotoId, src, verbatim alt)`,
    assetFiles.has(entry.file) &&
      isPhotoId(entry.id) &&
      listed !== undefined &&
      listed.src === `/asya/${entry.file}` &&
      listed.alt === entry.alt,
  )
}
check('catalog alts are clean of minor-coded text', catalog.every((e) => !hasMinorContent(e.alt)))
check(
  'every listed photo has its JPEG on disk',
  PHOTO_LIST.every((p) => !p.src.startsWith('/asya/') || assetFiles.has(p.src.slice('/asya/'.length))),
)

// --- body-ask preferences (the expanded matcher) ---------------------------------

// Decor never answers a skin ask; the honest shower-glass frame is the one
// scene id allowed, and only inside the dus ask itself.
const DECOR_IDS: readonly PhotoId[] = ['ben', 'ayna', 'yatak', 'balkon', 'otel', 'taksi', 'saten']
for (const [ask, prefs] of Object.entries(NUDE_PREFERENCE)) {
  check(`ask "${ask}" maps to real unique assets`, prefs.length > 0 && new Set(prefs).size === prefs.length && prefs.every((id) => isPhotoId(id)))
  check(
    `ask "${ask}" never answers with decor (saten/balkon/otel/ayna...)`,
    prefs.every((id) => !DECOR_IDS.includes(id) && (ask === 'dus' || id !== 'dus')),
  )
}
check(
  'ofis ask maps to ofiscorap ONLY',
  NUDE_PREFERENCE.ofis.length === 1 && NUDE_PREFERENCE.ofis[0] === 'ofiscorap',
)
check('mutfak ask maps to mutfak1 ONLY', NUDE_PREFERENCE.mutfak.length === 1 && NUDE_PREFERENCE.mutfak[0] === 'mutfak1')
check('dus ask runs dus → duscam → banyodudak', NUDE_PREFERENCE.dus.join(',') === 'dus,duscam,banyodudak')
check('boyun ask maps to the boyun frames', NUDE_PREFERENCE.boyun.join(',') === 'boyun1,arababoyun')
check('meme ask still opens with the classic trio', NUDE_PREFERENCE.meme.slice(0, 3).join(',') === 'acik,gomlek,dantel')
check('etek ask still opens with etek itself', NUDE_PREFERENCE.etek[0] === 'etek')
check(
  'soyunma ask is the undress frames',
  NUDE_PREFERENCE.soyunma.join(',') === 'askili,kirmizietek,hirka,gomlek',
)
check(
  'surtunme ask is the grind/lap frames',
  NUDE_PREFERENCE.surtunme.join(',') === 'kucak,surtunme,sortkucak,kirmizikucak,yatakcift,yerde',
)

const ASK_CASES: readonly [string, BodyAsk | null][] = [
  ['meme at', 'meme'],
  ['göğsünü göster', 'meme'],
  ['kalçanı göster', 'etek'],
  ['çorapla bi foto at', 'etek'],
  ['boynunu göster', 'boyun'],
  ['duşta çek', 'dus'],
  ['banyodan foto at', 'dus'],
  ['ofiste foto at', 'ofis'],
  ['mutfakta bi resim at', 'mutfak'],
  ['parmaklarını göster', 'parmak'],
  ['ıslaklığını göster', 'parmak'],
  ['ağzını göster', 'agiz'],
  ['lolipop yalarken çek', 'agiz'],
  ['kucağında otururken foto at', 'surtunme'],
  ['sürtünürken çek', 'surtunme'],
  ['soyun', 'soyunma'],
  ['çıplak foto at', 'nude'],
  ['dövmeni göster', 'dovme'],
  // Dirty talk without a send/show verb is never an ask; folded look-alikes
  // ("düşün..." is not duş, "yalan" is not yalanmak) never trigger one.
  ['memelerini yalamak istiyorum', null],
  ['seni düşünüyorum foto at', null],
  ['yalan söyleme foto at', null],
  ['sürtük müsün foto at', null],
]
for (const [input, want] of ASK_CASES) {
  const got = detectPhotoAsk(input)
  check(`ask("${input}") = ${String(want)}`, got === want, `got ${String(got)}`)
}

// enforcePhotoAsk: a wrong-frame photo is swapped to the freshest fitting id;
// below azgın a missing photo stays missing (naz), at azgın+ it is injected.
const wrongFrame: ReplyPart[] = [
  { kind: 'text', text: 'bak' },
  { kind: 'photo', text: '', photoId: 'saten' },
]
check(
  'a decor photo on a boyun ask is swapped to boyun1',
  enforcePhotoAsk(wrongFrame, 'boyun', 90, NO_SENT).find((p) => p.kind === 'photo')?.photoId === 'boyun1',
)
check(
  'the swap prefers the unsent tagged frame',
  enforcePhotoAsk(wrongFrame, 'boyun', 90, new Set<PhotoId>(['boyun1'])).find((p) => p.kind === 'photo')?.photoId ===
    'arababoyun',
)
check(
  'below azgın a missing photo stays missing (naz)',
  enforcePhotoAsk([{ kind: 'text', text: 'dur' }], 'meme', 30, NO_SENT).every((p) => p.kind !== 'photo'),
)
check(
  'at azgın+ a missing photo is injected from the ask list',
  enforcePhotoAsk([{ kind: 'text', text: 'al' }], 'mutfak', 90, NO_SENT).some(
    (p) => p.kind === 'photo' && p.photoId === 'mutfak1',
  ),
)

// -------------------------------------------------------------------------------

if (failed > 0) {
  throw new Error(`${failed} smoke check(s) failed`)
}
console.log('\nsmoke: all checks passed')
