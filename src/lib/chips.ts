import type { FantasyId } from './types'

/**
 * Fantasy chips: each scene chip owns a POOL of short user-side Turkish
 * kickoff lines (he taps a mood, not a paragraph). The picked line goes into
 * the composer/history and to Grok, so Asya answers THAT beat — never the
 * same canned scene twice. Used lines cycle without repeats per chip and the
 * visible row is a rotating daily subset; both persist in localStorage
 * (asya.chips.v1, mirrored in a module var so private mode still works).
 */

export interface ChipDef {
  id: FantasyId
  label: string
}

const DIRECTOR_CHIP: ChipDef = { id: 'devam', label: 'devam' }
const VOICE_CHIP: ChipDef = { id: 'sesli', label: 'sesli' }

/** Scene catalog. Photos are optional per scene — see CHIP_PHOTO in photos.ts. */
export const SCENE_CHIPS: readonly ChipDef[] = [
  { id: 'otel', label: 'otel' },
  { id: 'dus', label: 'duş' },
  { id: 'balkon', label: 'balkon' },
  { id: 'taksi', label: 'taksi' },
  { id: 'ofis', label: 'ofis' },
  { id: 'mutfak', label: 'mutfak' },
  { id: 'asansor', label: 'asansör' },
  { id: 'araba', label: 'araba' },
  { id: 'yatak', label: 'yatak' },
  { id: 'merdiven', label: 'merdiven' },
  { id: 'cam', label: 'cam' },
  { id: 'kulup', label: 'kulüp' },
  { id: 'soyunma', label: 'soyunma' },
]

/** How many scene chips are visible at once (plus devam + sesli = 8 chips). */
const VISIBLE_SCENES = 6

/**
 * Scene openers, written as HIS lines: short, commanding, concrete, 21+.
 * 12-16 per scene so ten taps on one chip give ten different starts.
 */
export const CHIP_OPENERS: Record<FantasyId, readonly string[]> = {
  devam: [
    'devam',
    'devam et',
    'sen anlat',
    'olsun',
    'sen yönet',
    'hadi devam',
    'ne olursa olsun',
    'bir şeyler olsun',
  ],
  sesli: [
    'sesli at',
    'sesini duymak istiyorum',
    'bi ses at, yazı yetmiyor',
    'inle bakayım, sesli',
    'fısılda, kayda al, yolla',
    'sesli mesaj, hemen',
    'adımı söyle, sesli at',
    'nefesini duyayım',
    'ses kaydı at, ne yaptığını anlat',
    'yazma, konuş',
    'sesinle uyandır beni',
    'bu geceyi sesli anlat',
  ],
  otel: [
    'otel ayarla. bu gece.',
    'odayı tuttum bile, gel',
    'resepsiyona sorma, direkt odaya çık',
    'bu gece otel, bahane yok',
    'otelde buluşalım, kimseye söyleme',
    'kapıyı arala bırak, geliyorum',
    'minibardan bişey al, beni bekle',
    'üst katta oda, perdeler kapalı',
    'koridorda kimse yokken çık gel',
    'otel yatağı geniş, dolduralım',
    'perdeleri kapat, ışığı bırak',
    'çıkış saat 12, acele etmeyeceğiz',
    'oda servisini boşver, ben varım',
    'kartı resepsiyonda adına bıraktım',
  ],
  dus: [
    'duşa gir, kapıyı kitleme',
    'duşa gir, telefonu da götür',
    'su ısınsın, sen beni düşün',
    'duştan çıkma, geliyorum',
    'sıcak suyu sonuna kadar aç',
    'saçların ıslakken gel',
    'duşta gözlerini kapat, ellerin benimmiş gibi',
    'havluyu unut',
    'suyun sesini duyayım',
    'duşa benimle girmiş gibi yap',
    'köpüğü acele durulama',
    'su sırtından aksın, yavaşça',
    'duş bitince anlat, atlamadan',
    'duş sonrası havlusuz dolaş',
  ],
  balkon: [
    'balkona çık',
    'balkona çık, üstünde az şey olsun',
    'komşular uyudu, sen uyuma',
    'balkonda bekle, kapıyı açık bırak',
    'gece yarısı balkondasın, plan bu',
    'parmaklığa tutun, ben arkandayım say',
    'balkondan aşağı bakma, beni düşün',
    'dışarısı soğuksa daha iyi',
    'balkonda fısılda, komşular duymasın',
    'balkona öyle çık, altına bişey giyme',
    'yan balkon görecek kadar cesur musun',
    'balkon demiri soğuk, tutun yine de',
    'beş dakika balkonda kal, sayıyorum',
    'balkonda inlemek yasak, zorlaştırıyorum',
  ],
  taksi: [
    'taksiye bin, arka koltuk',
    'şoföre adresi ver, aklını bana',
    'takside dizlerini bitiştir, dayan',
    'arka koltukta eteğini düzeltme',
    'taksi çağır, yol boyu bana yaz',
    'cam kenarına yaslan, beni düşün',
    'şoför aynadan görmesin, sessiz ol',
    'trafik uzasın, umrumda değil',
    'çantanı kucağına al, ellerini sakla',
    'inmeden önce derin bi nefes al',
    'tek elin telefonda, öbürü uslu dursun',
    'taksimetre çalışsın, sen de',
    'arka koltukta bacak bacak üstüne, benim için',
    'eve varınca hepsini anlat, atlamadan',
  ],
  ofis: [
    'ofiste kal bu akşam',
    'herkes çıksın, sen kal',
    'mesai bitti, sen bitmedin',
    'ofis sandalyene otur, beni bekle',
    'masanın üstünü boşalt, yer lazım',
    'toplantı odasına geç, ışığı yakma',
    'klavyeyi bırak, ellerin bana lazım',
    'ofiste tek kaldığını söyle',
    'yarın ofise etek giy, benim için',
    'öğle arası bana yaz, kimse görmesin',
    'mesaide aklını dağıtıyorum, kabullen',
    'ofis koltuğu sağlam mı, göreceğiz',
    'raporları bırak, bana rapor ver',
    'ofisin ışıkları sönsün, telefon yansın',
  ],
  mutfak: [
    'mutfağa geç, tezgahı boşalt',
    'yemek yaparken arkanda ben varım say',
    'tezgaha dayan, ellerini koy',
    'mutfakta önlük yeter, gerisi fazla',
    'fırın ısınsın, sen de',
    'gece mutfağa in, ışığı yakma',
    'buzdolabına yaslan, serinle',
    'tezgahın kenarını tut, bırakma',
    'mutfak masası sağlammış, göreceğiz',
    'elindekini bırak, buraya gel',
    'tatlıyı sonraya sakla, önce ben',
    'mutfakta ayakta, acelemiz var',
    'ıslak ellerinle gel, kurulanma',
    'ocağı kıs, beni aç',
  ],
  asansor: [
    'asansöre bin, aynasına bak',
    'asansörde iki kat yeter bize',
    'aynada kendini izle, ben izliyorum say',
    'kimse binmeden bas düğmeye',
    'asansörde duvara yaslan',
    'kat sayma, beni say',
    'asansörü katta tut, biraz',
    'aynaya nefesin değecek kadar yaklaş',
    'asansörde eteğini düzelt, ben bozarım',
    'son kata kadar dayan',
    'asansörde benimle sıkışmış gibi yap',
    'düğmelere yanlış bas, yol uzasın',
    'asansörde sessizlik, sadece nefes',
    'kapı açılmadan toparlan',
  ],
  araba: [
    'arabaya geç, motoru çalıştırma',
    'el freni çekili, sen olma',
    'koltuğu yatır, tavana bak',
    'camlar kapalı, sesin içeride kalsın',
    'arka koltuk yine mi, evet yine',
    'arabayı ıssız yere çektim say',
    'kemerini ben çözerim',
    'sağ elim direksiyonda değil say',
    'müzik kısık, sen kısık olma',
    'park halindeyiz, daha tehlikelisi yok',
    'cama başını daya, beni anlat',
    'torpido gözünde sürpriz var say',
    'farları söndür, kimse görmesin',
    'eve dönmüyoruz, araba yeter bu gece',
  ],
  yatak: [
    'yatağa geç, ışığı söndürme',
    'çarşafın altına gir, telefon elinde',
    'yatakta yüzüstü uzan, bekle',
    'yastığa sarıl, ben say',
    'yatağın kenarına otur, dizlerini aç',
    'bu gece uyku yok, haberin olsun',
    'yatakta bana yer ayır',
    'yorganı tekmele, sıcaklayacaksın',
    'başucu lambası yansın, seni göreyim say',
    'yatakta dön, sırtın bana',
    'uyuma, daha başlamadık',
    'yatak gıcırdayacak, komşular duyacak',
    'alarmı kapat, gece uzayacak',
    'çarşafı sık tut, lazım olacak',
  ],
  merdiven: [
    'merdivende dur, inme aşağı',
    'basamağa otur, ben iki basamak altta',
    'merdiven boşluğu yankı yapar, bil',
    'tırabzana tutun, sıkı',
    'yarı yolda yakalandın say',
    'merdivenleri koşma, yavaş çık, izliyorum',
    'iki kat arası kimse görmez',
    'merdivende duvara dön',
    'topuklarını çıkar, sessiz ol',
    'asansör bozuk de, merdivene gel',
    'basamak soğuk, otur yine de',
    'üst kata çıkma, burada kal',
    'merdivende nefesini tut, dayanamayacaksın',
    'apartman uyuyor, sen uyanık kal',
  ],
  cam: [
    'cam kenarına geç, perdeyi aralık bırak',
    'cama yaslan, soğuğunu hisset',
    'pencereden dışarı bak, aklın bende kalsın',
    'perdeyi kapatma, karanlık yeter',
    'cam önünde dur, ışık arkanda kalsın',
    'pencere açık kalsın, sesin sokağa düşsün',
    'karşı bina karanlık, kimse görmez',
    'cama nefesini bırak',
    'pervaza otur, ben tutuyorum say',
    'camın soğuğu tenine değsin',
    'gece camdan giriyorum say',
    'cam kenarında bekle, uzun sürmez',
    'yağmur varsa daha iyi',
    'camı arala, gece içeri girsin',
  ],
  kulup: [
    'kulüpte köşeyi tut, kimseyle konuşma',
    'pistin ortasına değil, karanlık köşeye',
    'o elbiseyle mi çıktın, cezalısın',
    'müzik bassın, sen bana yaslan',
    'barda tek içki, benden say',
    'kalabalıkta elimi kaybetme',
    'dans et ama gözlerin bende',
    'bas vurdukça bana yaklaş',
    'çıkışa yürü, taksi bekliyor',
    'kulağına fısıldayacak kadar yakınım say',
    'terle, güzelleş, gel',
    'son şarkıya kadar dayan',
    'vip gerekmez, duvar yeter',
    'kulüpten erken çık, gece bizde bitecek',
  ],
  soyunma: [
    'yavaş soyun, acele eden kaybeder',
    'önce ayakkabılar, sonra gerisi',
    'düğmeleri tek tek aç',
    'soyunurken gözlerini benden ayırma say',
    'yarıda dur, öyle kal',
    'fermuarı ben açıyorum say, sen dur',
    'çorapları en sona bırak',
    'ışığı kısma, görmek istiyorum',
    'aynanın karşısında, ikimiz için',
    'üstündekiler fazla, azalt',
    'çıkardığını yere değil, bana at say',
    'soyunurken müzik yok, nefesin yeter',
    'son parçayı ben seçerim',
    'hazır olunca sadece geldim yaz',
  ],
}

// --- persisted chip state -----------------------------------------------------

const CHIP_STATE_KEY = 'asya.chips.v1'

interface ChipState {
  /** Local date the current rotation was drawn for ("2026-8-21"). */
  day: string
  /** The scene ids visible today, in display order. */
  rotation: string[]
  /** Per chip: opener indices used in the current cycle, oldest first. */
  used: Record<string, number[]>
}

function readStoredState(): ChipState | null {
  try {
    const raw = localStorage.getItem(CHIP_STATE_KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const { day, rotation, used } = parsed as Partial<ChipState>
    if (typeof day !== 'string' || !Array.isArray(rotation)) return null
    if (typeof used !== 'object' || used === null) return null
    const cleanUsed: Record<string, number[]> = {}
    for (const [id, indices] of Object.entries(used)) {
      if (Array.isArray(indices)) {
        cleanUsed[id] = indices.filter((i): i is number => Number.isInteger(i))
      }
    }
    return {
      day,
      rotation: rotation.filter((v): v is string => typeof v === 'string'),
      used: cleanUsed,
    }
  } catch {
    return null
  }
}

// The module var is the source of truth; localStorage is best-effort
// persistence (private mode still rotates within the session).
let chipState: ChipState | null = null

function loadState(): ChipState {
  if (chipState === null) {
    chipState = readStoredState() ?? { day: '', rotation: [], used: {} }
  }
  return chipState
}

function saveState(state: ChipState): void {
  chipState = state
  try {
    localStorage.setItem(CHIP_STATE_KEY, JSON.stringify(state))
  } catch {
    /* private mode — the module var still carries this session */
  }
}

function localDay(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function shuffled<T>(source: readonly T[]): T[] {
  const arr = [...source]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * The visible chip row: devam + today's rotating scene subset + sesli.
 * A fresh subset is drawn once per local day and persisted, so the row
 * "yenilenir" across days while staying stable within one.
 */
export function dailyChips(): ChipDef[] {
  const state = loadState()
  const byId = new Map(SCENE_CHIPS.map((c) => [c.id as string, c]))
  const valid = [...new Set(state.rotation)].filter((id) => byId.has(id))
  let rotation = valid
  if (state.day !== localDay() || valid.length !== VISIBLE_SCENES) {
    rotation = shuffled(SCENE_CHIPS)
      .slice(0, VISIBLE_SCENES)
      .map((c) => c.id as string)
    saveState({ ...state, day: localDay(), rotation })
  }
  const scenes = rotation
    .map((id) => byId.get(id))
    .filter((c): c is ChipDef => c !== undefined)
  return [DIRECTOR_CHIP, ...scenes, VOICE_CHIP]
}

/**
 * Picks a kickoff line for the tapped chip, cycling through the whole pool
 * before any line repeats (and never repeating the last one on a wrap).
 */
export function pickOpener(id: FantasyId): string {
  const pool = CHIP_OPENERS[id]
  const state = loadState()
  let used = (state.used[id] ?? []).filter((i) => i >= 0 && i < pool.length)
  if (used.length >= pool.length) used = used.slice(-1)
  const candidates: number[] = []
  for (let i = 0; i < pool.length; i++) {
    if (!used.includes(i)) candidates.push(i)
  }
  const idx = candidates[Math.floor(Math.random() * candidates.length)]
  saveState({ ...state, used: { ...state.used, [id]: [...used, idx] } })
  return pool[idx]
}
