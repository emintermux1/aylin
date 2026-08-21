export type Author = 'user' | 'asya'

export type MsgKind = 'text' | 'beat' | 'voice' | 'photo'

export type PhotoId = 'ben' | 'ayna' | 'yatak' | 'balkon' | 'dus' | 'otel' | 'taksi' | 'saten'

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

export type FantasyId = 'otel' | 'dus' | 'balkon' | 'taksi' | 'ofis' | 'sesli'

export function newId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function makeMsg(author: Author, kind: MsgKind, text: string, extra?: Partial<ChatMsg>): ChatMsg {
  return { id: newId(), author, kind, text, at: Date.now(), ...extra }
}
