import type { ChatMsg, FantasyId, PhotoId, ReplyPart } from './types'
import { PHOTO_LIST } from './photos'

/**
 * Local dirty-talk engine. Used when XAI_API_KEY is missing or the API call
 * fails, so the app is always playable. All lines are original, in-character
 * and strictly adult (21+); the minor-content guard runs before this engine.
 *
 * Style contract (same as the model prompt): 1–3 short bubbles, lowercase
 * casual istanbul turkish, typos on purpose, no narration, escalate fast.
 */

// ---------------------------------------------------------------- utilities

const recentKeys: string[] = []

function pickLine(pool: readonly string[]): string {
  const fresh = pool.filter((v) => !recentKeys.includes(v))
  const from = fresh.length > 0 ? fresh : pool
  const chosen = from[Math.floor(Math.random() * from.length)]
  recentKeys.push(chosen)
  if (recentKeys.length > 30) recentKeys.shift()
  return chosen
}

function pickSet(pool: readonly (readonly string[])[]): readonly string[] {
  const keyOf = (v: readonly string[]) => v.join('|')
  const fresh = pool.filter((v) => !recentKeys.includes(keyOf(v)))
  const from = fresh.length > 0 ? fresh : pool
  const chosen = from[Math.floor(Math.random() * from.length)]
  recentKeys.push(keyOf(chosen))
  if (recentKeys.length > 30) recentKeys.shift()
  return chosen
}

function chance(p: number): boolean {
  return Math.random() < p
}

// ------------------------------------------------------------------- corpus

const OPENER_SETS: readonly (readonly string[])[] = [
  ['uyudun mu', 'keşke şu an yanımda olsan... yorganın altı çok boş'],
  ['az önce duştan çıktım', 'hala sıcağım... havlu düştü düşcek 😏'],
  ['şu an aklım sende durmuyo', 'napıyosun... yalnız mısın'],
  ['bugün bi an aklıma geldin', 'sonra bütün gün çıkmadın. senin suçun bu'],
]

const BEATS: readonly string[] = [
  'dur',
  'bi sn',
  'off',
  'mmm',
  'bekle...',
  'dur dur dur',
  'offff',
  '😏',
  'aha',
  'geldim geldim',
]

const SHORTS: readonly string[] = [
  'hı hı 😏',
  'devam et',
  'ee',
  'sonra',
  'off',
  'biliyorum',
  'gel o zaman',
  'de bakiyim',
  'aynen öyle',
  'daha daha',
]

interface FantasyPool {
  match: RegExp
  warm: readonly (readonly string[])[]
  hot: readonly (readonly string[])[]
  questions: readonly string[]
  photo: PhotoId
}

const FANTASIES: Record<Exclude<FantasyId, 'sesli'>, FantasyPool> = {
  otel: {
    match: /otel|hotel|suit|resepsiyon|oda servisi/i,
    warm: [
      ['otel mi... offf', 'cam kenarında dursam sen arkamdan gelsen diye düşündüm şimdi'],
      ['koca cam olsun, dışarda istanbul', 'ben çıplak ayak halıda... üstümde senin gömleğin'],
      ['resepsiyona inmeyiz hiç', 'oda servisi kapıda kalır öyle'],
    ],
    hot: [
      ['kapıyı kart açar açmaz duvara yapıştır beni', 'elbisem kalksın yeter, çıkarmaya vakit yok'],
      ['camdan boğaz görünüyo ama sen arkamdasın', 'cam buğulanana kadar durmak yok... sesimi bütün kat duysun umrumda değil'],
      ['yatağa at beni', 'saçımı topla avucuna... sert. bu gece kibarlık istemiyorum'],
    ],
    questions: ['odaya girer girmez ilk ne yaparsın... dürüst ol', 'ışıklar açık mı kalsın kapalı mı 😏'],
    photo: 'otel',
  },
  dus: {
    match: /duş|dus\b|shower|banyo|küvet|kuvet|buhar/i,
    warm: [
      ['duştayım desem', 'su sırtımdan aşağı akıyo... senin elin gibi ama değil'],
      ['cam buğulandı', 'parmakla adını yazdım... sil gel'],
      ['saçım ıslak boynuma yapışmış', 'havluyu bilerek almadım yanıma'],
    ],
    hot: [
      ['gel arkama gir', 'sabunlu ellerinle her yerimi... acele etme ama durma da'],
      ['duvara yasla beni su üstümüzden aksın', 'ıslak saçımı çek boynumu ısır... suyun sesi bastırır gerisini'],
      ['su soğudu çoktan', 'fark etmedim bile... sen düşün neden 😈'],
    ],
    questions: ['duşta önden mi sarılırsın arkadan mı... söyle'],
    photo: 'dus',
  },
  balkon: {
    match: /balkon|teras|manzara|sigara/i,
    warm: [
      ['balkondayım sigara yakıyorum', 'gece serin ama ben değilim 😏'],
      ['aşağıda kadıköy gürültüsü', 'kimse yukarı bakmıyo... baksalar ne görürler biliyo musun'],
      ['rüzgar geceliğimi buldu', 'düzeltmedim... niye düzelteyim'],
    ],
    hot: [
      ['arkamdan sarıl parmaklığa tutunayım', 'geceliğin altında hiçbi şey yok... rüzgar bile biliyo'],
      ['komşunun ışığı yandı umrumda değil', 'elini sok içeri... sus konuşma'],
      ['sigaram yarım kaldı küllükte', 'sen daha acil çıktın... gel bitmeden'],
    ],
    questions: ['balkonda yakalanma ihtimali seni durdurur mu azdırır mı'],
    photo: 'balkon',
  },
  taksi: {
    match: /taksi|taxi|arka koltuk|şoför|sofor|uber/i,
    warm: [
      ['kadıköyden bindik diyelim', 'arka koltuk... elin dizimde, şoför aynadan bakıyo'],
      ['köprüden geçiyoruz ışıklar yüzünde', 'elin santim santim yukarı çıkıyo... ben cama dönük nefesimi tutuyorum'],
    ],
    hot: [
      ['eteğimin altına gir', 'sesimi içime atıyorum... şoföre müzik açsanıza diyorum, neden biliyosun'],
      ['kulağına fısıldıyorum: daha inmeden bitircem seni', 'bakalım sözümde durucam mı 😈'],
      ['uzun yoldan git abi diyosun', 'off... para değil zaman kazanıyosun, akıllı çocuk'],
    ],
    questions: ['takside kim önce dayanamaz... iddiaya girelim mi'],
    photo: 'taksi',
  },
  ofis: {
    match: /ofis|office|mesai|toplantı|toplanti|iş yeri|isyeri/i,
    warm: [
      ['mesai bitti herkes gitti', 'senin masanın kenarına oturdum eteğim sıyrıldı... bakma öyle'],
      ['ofis tuvaletinin aynasındayım', 'kapıyı kitledim... 5 dakika kimse aramaz bizi'],
    ],
    hot: [
      ['masaya yatır beni kağıtlar dökülsün', 'klavye düştü umrumda değil... elini ağzıma koy sesim çıkmasın'],
      ['koltuğuna oturttum kendimi', 'kravatından çekiyorum seni... patron benim şimdi, diz çök'],
    ],
    questions: ['ofiste en riskli yer neresi... masa mı tuvalet mi arşiv mi'],
    photo: 'ayna',
  },
}

const GENERIC_WARM: readonly (readonly string[])[] = [
  ['napıyosun', 'yalnız mısın... güzel'],
  ['keşke yanımda olsan şu an', 'yorgan sıcak ama yetmiyo'],
  ['bugün bi ara durup durup güldüm kendi kendime', 'aklımdan geçenleri bilsen sen gülemezdin 😏'],
  ['telefonu bırakamıyorum senin yüzünden', 'sorumluluk al artık'],
]

const GENERIC_MID: readonly (readonly string[])[] = [
  ['yazdıkça kötü oluyorum haberin olsun', 'ama durma'],
  ['dudağımı ısırıyorum şu an senin yüzünden', 'elin burda olsa başka şey ısırırdım 😏'],
  ['içim gidiyo resmen', 'bunu bana mesajla yapıyosun bi de... yüz yüze ne yaparsın kim bilir'],
  ['bacaklarımı kıpırdatamıyorum', 'sebebi sensin, düzelt bunu'],
]

const GENERIC_HOT: readonly (readonly string[])[] = [
  ['yeter gel artık', 'ıslağım zaten... geldiğinde konuşma, direkt başla'],
  ['şu an üstümde hiçbi şey yok', 'elimi senin elin sayıyorum... yavaş gidiyo ama gidiyo'],
  ['içime gir artık dayanamıyorum', 'boşalırken adımı söylemeni istiyorum... söz ver'],
  ['her yerimi yalamanı istiyorum', 'sonra ben seni... sırayla 😈'],
  ['sert istiyorum bu gece anladın mı', 'yarın yürüyemiyim umrumda değil'],
]

const REACTIONS: readonly string[] = [
  'off bunu okurken elim titredi... bi daha yaz aynısını',
  'tamam sen kazandın... bu geceyi sen yönetiyosun. şimdilik 😈',
  'bunu yazan adam yanımda olsa şu an konuşamazdı... gel kanıtla',
  'ekran görüntüsü aldım bunun... gece gece açıp bakıcam',
]

const QUESTIONS: readonly string[] = [
  'şu an elin nerde... dürüst ol',
  'üstünde ne var... çıkar öyle yaz',
  'ilk nereme dokunurdun... tek yer seç',
  'ağzımı mı istiyosun ellerimi mi... seç',
  'yavaş mı sert mi... cevabına göre davranıcam',
  'en son ne zaman böyle azdın söyle',
  'bana ne yapmak istiyosun yaz... çekinme, okuyunca kızarayım',
]

const CLIFFHANGERS: readonly string[] = [
  'devamını yüzüne anlatcam',
  'gerisi yüz yüze... yazmakla olmaz bu',
  'dur sana bişey göstercem',
  'bekle... bunu görmen lazım',
]

const CALLBACK_GENERIC: readonly string[] = [
  'sen böyle şeyleri seviyosun demek... not ettim 😏',
  'hala demin yazdığın şeyi düşünüyorum... kafayı yicem',
]

const CALLBACK_BY_FANTASY: Partial<Record<FantasyId, string>> = {
  otel: 'hala o otel meselesi aklımda... cam kenarı. unutmadım bak',
  taksi: 'bugün taksiye bindim aklıma sen geldin... yol boyu kötü oldum',
  dus: 'duş dedin ya... o sudan hala çıkamadım ben',
  balkon: 'balkona her çıktığımda seni düşüncem artık, kabul et',
  ofis: 'mesai lafını duyunca bile artık başka şey geliyo aklıma... senin yüzünden',
}

const VOICE_NOTES: readonly string[] = [
  '...duyuyo musun... fısıldıyorum çünkü ellerim meşgul... adını söylerken nefesim kesildi bak...',
  '...az önce seni düşündüm... bitti mi sanıyosun... daha yeni başladım... gel sesimi yüzümden dinle...',
  '...yorganın altındayım... telefonu boynuma sıkıştırdım... iki elim de boşta değil çünkü... offf...',
  '...bu sesi sabah utanıp silicem ama şimdi umrumda değil... sen nerdesin... niye yanımda değilsin...',
  '...gözlerini kapat... nefesim ensende say... elin benim elim olsun... yavaş... işte öyle...',
]

const VOICE_FOLLOWUPS: readonly string[] = [
  'utandım şimdi... beğendin mi',
  'sesime alışma, gerçeği daha iyi 😏',
  'bunu kimseye atmadım daha önce... bilesin',
]

const CAPTIONS: Record<PhotoId, readonly string[]> = {
  ayna: ['buna bak', 'ışık kötü ama olsun', 'makyaj yok filtre yok... aynadan direkt'],
  yatak: ['yatağın senin tarafın boş', 'çarşaf buz gibi... gel ısıt', 'burası az önce başka görünüyodu 😏'],
  balkon: ['balkondan şimdi çektim', 'sigara + gece + ben... eksik sensin', 'aşağıdan biri baktı sanki. umrumda değil'],
  dus: ['buhar her yerde', 'cama ne yazdım bak... silmeden çektim', 'su hala akıyo bu arada'],
  otel: ['böyle bi oda istiyorum seninle', 'cam kenarı... anladın sen', 'burayı ayırtıyorum bak şaka değil'],
  taksi: ['şu an takside atıyorum bunu', 'arka koltuk... yer belli', 'şoför fark etti galiba nese 😏'],
  saten: ['bu gece bunun altındayım', 'kaygan... senin eline benziyo', 'çıkarması kolay, bilgin olsun'],
  dudak: ['az önce ısırdım... senin yüzünden', 'bunu kimseye atmam bilesin', 'buraya bi tane bırak'],
  boyun: ['boynum... favori yerin değil miydi', 'iz bırakabilirsin. istiyorum', 'parfüm sıktım az önce, kokusunu hayal et'],
}

const PHOTO_FOLLOWUPS: readonly string[] = [
  'beğendin mi... dürüst ol',
  'sil sonra bunu 😏',
  'devamı var ama hak etmen lazım',
  'sıradaki daha kötü... hazır mısın',
]

// ------------------------------------------------------------ detection

const FILTH_RE =
  /sik|amın|amına|yala|sok\b|sokm|ıslak|islak|azdım|azdim|azgın|azgin|boşal|bosal|meme|göt|got\b|orgazm|mastür|mastur|zevk|inle|yarrak|yarak|domal|becer/i

const PHOTO_ASK_RE = /foto|resim|göster|goster|selfie|\bpic\b|photo|at bak|atsana|görsel|gorsel/i

const VOICE_ASK_RE = /sesli|ses at|sesini|sesin[ie]|voice|🎙/i

function detectFantasy(text: string): Exclude<FantasyId, 'sesli'> | null {
  const entries = Object.entries(FANTASIES) as [Exclude<FantasyId, 'sesli'>, FantasyPool][]
  for (const [id, pool] of entries) {
    if (pool.match.test(text)) return id
  }
  return null
}

function sentPhotoIds(history: ChatMsg[]): Set<PhotoId> {
  const sent = new Set<PhotoId>()
  for (const msg of history) {
    if (msg.kind === 'photo' && msg.photoId) sent.add(msg.photoId)
  }
  return sent
}

function choosePhoto(history: ChatMsg[], preferred: PhotoId | null): PhotoId {
  const sent = sentPhotoIds(history)
  if (preferred && !sent.has(preferred)) return preferred
  const unsent = PHOTO_LIST.filter((p) => !sent.has(p.id))
  if (unsent.length > 0) return unsent[Math.floor(Math.random() * unsent.length)].id
  if (preferred) return preferred
  return PHOTO_LIST[Math.floor(Math.random() * PHOTO_LIST.length)].id
}

export function themedPhotoPart(history: ChatMsg[], preferred: PhotoId | null): ReplyPart {
  const id = choosePhoto(history, preferred)
  return { kind: 'photo', text: pickLine(CAPTIONS[id]), photoId: id }
}

// ------------------------------------------------------------- public API

export function introParts(): ReplyPart[] {
  return pickSet(OPENER_SETS).map((text) => ({ kind: 'text', text }))
}

export function instantBeat(): string {
  return pickLine(BEATS)
}

export function voiceNotePart(): ReplyPart {
  return { kind: 'voice', text: pickLine(VOICE_NOTES) }
}

export function offlineReply(userText: string, history: ChatMsg[]): ReplyPart[] {
  const trimmed = userText.trim()

  if (VOICE_ASK_RE.test(trimmed)) {
    const parts: ReplyPart[] = [voiceNotePart()]
    if (chance(0.4)) parts.push({ kind: 'text', text: pickLine(VOICE_FOLLOWUPS) })
    return parts
  }

  const fantasy = detectFantasy(trimmed)

  if (PHOTO_ASK_RE.test(trimmed)) {
    const preferred = fantasy ? FANTASIES[fantasy].photo : null
    return [themedPhotoPart(history, preferred), { kind: 'text', text: pickLine(PHOTO_FOLLOWUPS) }]
  }

  const filth = FILTH_RE.test(trimmed)
  const userCount = history.filter((m) => m.author === 'user').length
  const hot = filth || userCount > 3
  const warm = !hot && userCount > 1

  // Mirror very short messages with a short fragment instead of a monologue.
  if (trimmed.length <= 6 && !fantasy && !filth) {
    const parts: ReplyPart[] = [{ kind: 'text', text: pickLine(SHORTS) }]
    if (chance(0.45)) parts.push({ kind: 'text', text: pickLine(QUESTIONS) })
    return parts
  }

  let lines: readonly string[]
  if (fantasy) {
    lines = pickSet(hot ? FANTASIES[fantasy].hot : FANTASIES[fantasy].warm)
  } else if (hot) {
    lines = pickSet(GENERIC_HOT)
  } else if (warm) {
    lines = pickSet(GENERIC_MID)
  } else {
    lines = pickSet(GENERIC_WARM)
  }
  const parts: ReplyPart[] = lines.map((text) => ({ kind: 'text', text }))

  // React to a long filthy message before the main line (he set the tone).
  if (filth && trimmed.length > 50 && chance(0.5) && parts.length < 3) {
    parts.unshift({ kind: 'text', text: pickLine(REACTIONS) })
  }

  // Callback to something he brought up earlier in the thread.
  if (!fantasy && (warm || hot) && chance(0.25)) {
    const pastFantasy = [...history]
      .reverse()
      .filter((m) => m.author === 'user')
      .map((m) => detectFantasy(m.text))
      .find((f) => f !== null)
    const callback = pastFantasy ? CALLBACK_BY_FANTASY[pastFantasy] : undefined
    if (parts.length < 3) {
      parts.unshift({ kind: 'text', text: callback ?? pickLine(CALLBACK_GENERIC) })
    }
  }

  // Photo tease: generous, sometimes with a cliffhanger line before it.
  const photoLuck = hot ? 0.45 : warm ? 0.3 : 0.15
  if (chance(photoLuck)) {
    while (parts.length > 2) parts.pop()
    if (hot && chance(0.5) && parts.length > 1) {
      parts[parts.length - 1] = { kind: 'text', text: pickLine(CLIFFHANGERS) }
    }
    parts.push(themedPhotoPart(history, fantasy ? FANTASIES[fantasy].photo : null))
    return parts
  }

  // One dirty question max, and only if nothing above already asks one.
  const hasQuestion = parts.some((p) => p.text.includes('?') || p.text.endsWith('mı') || p.text.endsWith('mi'))
  if (!hasQuestion && chance(0.55) && parts.length < 3) {
    const pool = fantasy && chance(0.6) ? FANTASIES[fantasy].questions : QUESTIONS
    parts.push({ kind: 'text', text: pickLine(pool) })
  }

  return parts.slice(0, 3)
}
