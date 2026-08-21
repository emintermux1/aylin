import type { FantasyId, PhotoId } from './types'

export interface AylinPhoto {
  id: PhotoId
  src: string
  alt: string
}

export const PHOTO_LIST: AylinPhoto[] = [
  { id: 'ayna', src: '/aylin/ayna.jpg', alt: 'ayna selfiesi' },
  { id: 'yatak', src: '/aylin/yatak.jpg', alt: 'dağınık yatak, saten çarşaf' },
  { id: 'balkon', src: '/aylin/balkon.jpg', alt: 'gece balkon, istanbul ışıkları' },
  { id: 'dus', src: '/aylin/dus.jpg', alt: 'buğulu duş camı' },
  { id: 'otel', src: '/aylin/otel.jpg', alt: 'otel odası, gece camı' },
  { id: 'taksi', src: '/aylin/taksi.jpg', alt: 'taksi arka koltuk, gece' },
  { id: 'saten', src: '/aylin/saten.jpg', alt: 'saten gecelik' },
  { id: 'dudak', src: '/aylin/dudak.jpg', alt: 'dudak yakın çekim' },
  { id: 'boyun', src: '/aylin/boyun.jpg', alt: 'boyun ve köprücük kemiği' },
]

const PHOTO_IDS = new Set<string>(PHOTO_LIST.map((p) => p.id))

export function isPhotoId(value: string): value is PhotoId {
  return PHOTO_IDS.has(value)
}

export function photoById(id: PhotoId): AylinPhoto {
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
