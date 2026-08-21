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

export interface ChatMsg {
  id: string
  author: Author
  kind: MsgKind
  text: string
  at: number
  /** Fake duration for voice-note bubbles, in seconds. */
  durSec?: number
  /** Which asset a photo bubble shows. */
  photoId?: PhotoId
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
