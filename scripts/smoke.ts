import { BEAT_POOLS, beatBucketId, instantBeat, typingStatus, type BeatBucketId } from '../src/lib/beats'
import { CHIP_OPENERS, SCENE_CHIPS, dailyChips, pickOpener } from '../src/lib/chips'
import { CHIP_PHOTO, PLACE_AGNOSTIC_TEASE, chipPhotoOffer, isPhotoId } from '../src/lib/photos'
import type { PhotoId } from '../src/lib/types'
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
}
check(
  'chip photo map is exactly the verified scene-true set',
  Object.keys(CHIP_PHOTO).length === Object.keys(EXPECTED_CHIP_PHOTO).length &&
    Object.entries(EXPECTED_CHIP_PHOTO).every(([k, v]) => CHIP_PHOTO[k as keyof typeof CHIP_PHOTO] === v),
  JSON.stringify(CHIP_PHOTO),
)
check(
  'scenes with no matching JPEG are unmapped (ofis, mutfak, asansor, merdiven, cam, kulup)',
  (['ofis', 'mutfak', 'asansor', 'merdiven', 'cam', 'kulup'] as const).every((id) => CHIP_PHOTO[id] === undefined),
)
check(
  'decor shots never ride a chip (ayna is a vanity, saten a nightgown, ben a selfie)',
  Object.values(CHIP_PHOTO).every((id) => id !== 'ayna' && id !== 'saten' && id !== 'ben'),
)
check(
  'place-agnostic teases are close frames only — never the bed/bedroom shots',
  PLACE_AGNOSTIC_TEASE.every((id) => id !== 'etek' && id !== 'dantel') &&
    PLACE_AGNOSTIC_TEASE.every((id) => (['gomlek', 'acik', 'dovme'] as PhotoId[]).includes(id)),
)

// Behavioral: ofis below azgın never offers anything; at azgın+ it may offer
// only a place-agnostic tease — never ayna, never any decor shot.
const NO_SENT: ReadonlySet<PhotoId> = new Set()
let ofisColdOk = true
for (let i = 0; i < 100; i++) {
  if (chipPhotoOffer('ofis', 30, NO_SENT) !== null) ofisColdOk = false
}
check('ofis offers no photo below azgın', ofisColdOk)
let ofisHotOk = true
for (let i = 0; i < 300; i++) {
  const offer = chipPhotoOffer('ofis', 90, NO_SENT)
  if (offer !== null && !PLACE_AGNOSTIC_TEASE.includes(offer)) ofisHotOk = false
}
check('ofis at azgın+ offers only place-agnostic teases (never ayna)', ofisHotOk)
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

// -------------------------------------------------------------------------------

if (failed > 0) {
  throw new Error(`${failed} smoke check(s) failed`)
}
console.log('\nsmoke: all checks passed')
