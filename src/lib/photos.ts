import type { FantasyId, PhotoId } from './types'

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
]

const PHOTO_IDS = new Set<string>(PHOTO_LIST.map((p) => p.id))

export function isPhotoId(value: string): value is PhotoId {
  return PHOTO_IDS.has(value)
}

export function photoById(id: PhotoId): AsyaPhoto {
  return PHOTO_LIST.find((p) => p.id === id) ?? PHOTO_LIST[0]
}

/** Which photo a fantasy chip should pull. 'sesli' sends a voice note instead. */
export const CHIP_PHOTO: Record<Exclude<FantasyId, 'sesli'>, PhotoId> = {
  otel: 'otel',
  dus: 'dus',
  balkon: 'balkon',
  taksi: 'taksi',
  ofis: 'ayna',
}
