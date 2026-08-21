export type Author = 'user' | 'asya'

export type MsgKind = 'text' | 'beat' | 'voice' | 'photo'

export type PhotoId =
  // Scene set (clothed, cinematic assets).
  | 'ben'
  | 'ayna'
  | 'yatak'
  | 'balkon'
  | 'dus'
  | 'otel'
  | 'taksi'
  | 'saten'
  // Nude/tease set — what she reaches for when he asks for skin.
  | 'gomlek'
  | 'etek'
  | 'dantel'
  | 'acik'
  | 'dovme'
  // Moodboard archive (server/photo-archive.json ↔ public/asya/<id>.jpg) —
  // tagged frames she sends matched to the moment, catalog order.
  | 'kucak'
  | 'boyun1'
  | 'duscam'
  | 'parmak1'
  | 'parmak2'
  | 'lolipop'
  | 'agizparmak'
  | 'mutfak1'
  | 'kalca1'
  | 'yerde'
  | 'surtunme'
  | 'sortkucak'
  | 'yatakcift'
  | 'dekolte'
  | 'satenyatak'
  | 'siyahcorap'
  | 'fileli'
  | 'yesiletek'
  | 'ofiscorap'
  | 'hediye'
  | 'kalpgogus'
  | 'bikinieller'
  | 'arababoyun'
  | 'filetopuk'
  | 'kirmizietek'
  | 'askili'
  | 'kotkalca'
  | 'beyazatlet'
  | 'saridekolte'
  | 'hirka'
  | 'corapayna'
  | 'kanepede'
  | 'banyodudak'
  | 'kirmizikucak'

export interface ChatMsg {
  id: string
  author: Author
  kind: MsgKind
  text: string
  at: number
  /** Fake duration for voice-note bubbles, in seconds. */
  durSec?: number
  /** Which asset a photo bubble shows (her sends). */
  photoId?: PhotoId
  /** His own uploaded frame (compressed data URL) — set instead of photoId. */
  photoSrc?: string
  /** He replied from her story viewer — quote chip + wire mark, not a seen tick. */
  storyReply?: StoryReplyMeta
}

/** One-line reply from the story viewer; she treats it as him watching that frame. */
export interface StoryReplyMeta {
  photoId: PhotoId
  caption: string
}

/** One piece of an Asya reply, rendered as its own bubble with a delay. */
export interface ReplyPart {
  kind: 'text' | 'voice' | 'photo'
  text: string
  photoId?: PhotoId
}

/**
 * Hidden arousal bookkeeping the model appends as "[MOOD:+8]" (delta) or
 * "[MOOD:64]" (absolute). Stripped from the reply before rendering — it never
 * becomes a bubble.
 */
export interface MoodSignal {
  kind: 'delta' | 'set'
  value: number
}

/**
 * Fantasy chips: 'devam' is the director chip (she advances the scene
 * herself, no photo payoff), 'sesli' asks for a voice note, the rest are
 * scene kickoffs. Scene chips without a fitting JPEG stay text-first.
 */
export type FantasyId =
  | 'devam'
  | 'sesli'
  | 'otel'
  | 'dus'
  | 'balkon'
  | 'taksi'
  | 'ofis'
  | 'mutfak'
  | 'asansor'
  | 'araba'
  | 'yatak'
  | 'merdiven'
  | 'cam'
  | 'kulup'
  | 'soyunma'

export function newId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function makeMsg(author: Author, kind: MsgKind, text: string, extra?: Partial<ChatMsg>): ChatMsg {
  return { id: newId(), author, kind, text, at: Date.now(), ...extra }
}
