import { BEAT_POOLS, beatBucketId, instantBeat, typingStatus, type BeatBucketId } from '../src/lib/beats'
import { CHIP_OPENERS, SCENE_CHIPS, dailyChips, pickOpener } from '../src/lib/chips'
import { CHIP_PHOTO, isPhotoId } from '../src/lib/photos'
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

// --- chip photo map ------------------------------------------------------------

check(
  'chip photo ids are real assets',
  Object.values(CHIP_PHOTO).every((id) => id !== undefined && isPhotoId(id)),
)
check('devam and sesli never map to a photo', CHIP_PHOTO.devam === undefined && CHIP_PHOTO.sesli === undefined)

// -------------------------------------------------------------------------------

if (failed > 0) {
  throw new Error(`${failed} smoke check(s) failed`)
}
console.log('\nsmoke: all checks passed')
