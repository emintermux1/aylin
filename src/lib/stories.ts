import { MOOD_EAGER_MIN } from '../../shared/mood'
import { isPhotoId, photoById } from './photos'
import type { PhotoId } from './types'
import { newId } from './types'

/**
 * Instagram/WhatsApp-style 24h stories she posts herself.
 * Persisted as asya.stories.v1. Frames are ALWAYS existing archive JPEGs
 * (public/asya + photo-archive.json) — never invented, never generated.
 * Istanbul clock picks the time-of-day family; her heat opens the hotter
 * solo frames. Opening a story mutes the ring; it never writes a chat
 * seen / left-on-read tick.
 */

export const STORIES_KEY = 'asya.stories.v1'
export const STORY_TTL_MS = 86_400_000
export const STORY_REPLY_MARK = '[HİKAYENE baktı]'

export type TimeBand = 'night' | 'morning' | 'day' | 'evening'

export interface StoryFrame {
  id: string
  photoId: PhotoId
  caption: string
}

export interface StoryPost {
  id: string
  postedAt: number
  expiresAt: number
  viewedAt: number | null
  frames: StoryFrame[]
}

interface StoriesState {
  posts: StoryPost[]
  lastSpawnSlot: string
  recentIds: PhotoId[]
}

const EMPTY: StoriesState = { posts: [], lastSpawnSlot: '', recentIds: [] }

/** Turkey stays UTC+3 year-round — same offset the surprise kickoff uses. */
export function istanbulHour(now: number = Date.now()): number {
  return (new Date(now).getUTCHours() + 3) % 24
}

export function timeBand(hour: number): TimeBand {
  if (hour < 6 || hour >= 22) return 'night'
  if (hour < 11) return 'morning'
  if (hour < 18) return 'day'
  return 'evening'
}

export function istanbulSlot(now: number = Date.now()): string {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(now))
  return `${date}-${timeBand(istanbulHour(now))}`
}

/**
 * Solo frames only — couple/fantasy two-shots stay in chat, not on the
 * story reel (those read as "someone else"). Every id is on disk.
 *
 * Soft pool: clothed / tease, always in play.
 * Hot pool: extra skin, azgın+ only.
 */
const SOFT_POOL: Record<TimeBand, readonly PhotoId[]> = {
  morning: ['gomlek', 'dekolte', 'hirka', 'dus', 'beyazatlet', 'ayna', 'dovme'],
  day: ['ofiscorap', 'mutfak1', 'kotkalca', 'dekolte', 'hirka', 'kanepede', 'dovme'],
  evening: ['dus', 'mutfak1', 'saten', 'balkon', 'kanepede', 'askili', 'gomlek'],
  night: ['yatak', 'saten', 'satenyatak', 'askili', 'siyahcorap', 'yesiletek', 'kalca1'],
}

const HOT_POOL: Record<TimeBand, readonly PhotoId[]> = {
  morning: ['acik', 'banyodudak', 'gomlek', 'hirka'],
  day: ['kalpgogus', 'bikinieller', 'mutfak1', 'saridekolte'],
  evening: ['banyodudak', 'kirmizietek', 'askili', 'acik'],
  night: ['kalca1', 'satenyatak', 'kirmizietek', 'fileli', 'acik', 'kalpgogus'],
}

const CAPTIONS: Record<TimeBand, readonly string[]> = {
  morning: [
    'kahve soğuyo',
    'gömleğim açık kaldı',
    'uyandığım hali bu',
    'duştan yeni çıktım',
    'sabah böyle',
    'gözlerim daha açılmadı',
  ],
  day: [
    'ofiste sıkıldım',
    'mutfaktayım bak',
    'öğlen molası',
    'işin arasında',
    'bunu senin için giydim',
  ],
  evening: [
    'duşa giriyom',
    'akşam oldu ya',
    'ıslak saçla',
    'eve geldim',
    'üstümü değiştirdim',
  ],
  night: [
    'uyku yok',
    'çarşaflar dağınık',
    'gece hali',
    'yataktayım',
    'seni düşünüyorum',
  ],
}

export function storyPool(band: TimeBand, mood: number): PhotoId[] {
  const soft = SOFT_POOL[band]
  if (mood < MOOD_EAGER_MIN) return [...soft]
  const seen = new Set<PhotoId>(soft)
  const merged = [...soft]
  for (const id of HOT_POOL[band]) {
    if (!seen.has(id)) {
      seen.add(id)
      merged.push(id)
    }
  }
  return merged
}

export function storyCaptions(band: TimeBand): readonly string[] {
  return CAPTIONS[band]
}

function pickOne<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function pickIds(pool: readonly PhotoId[], recent: readonly PhotoId[], n: number): PhotoId[] {
  const fresh = pool.filter((id) => !recent.includes(id))
  const source = fresh.length >= n ? fresh : pool
  const shuffled = [...source]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = tmp
  }
  const out: PhotoId[] = []
  for (const id of shuffled) {
    if (!out.includes(id)) out.push(id)
    if (out.length >= n) break
  }
  if (out.length === 0 && pool.length > 0) out.push(pool[0])
  return out.slice(0, n)
}

export function pickStoryFrames(
  mood: number,
  now: number = Date.now(),
  recentIds: readonly PhotoId[] = [],
): StoryFrame[] {
  const band = timeBand(istanbulHour(now))
  const pool = storyPool(band, mood)
  const want = pool.length >= 2 && Math.random() < 0.45 ? 2 : 1
  const ids = pickIds(pool, recentIds, want)
  const captions = CAPTIONS[band]
  return ids.map((photoId) => ({
    id: newId(),
    photoId,
    caption: Math.random() < 0.72 ? pickOne(captions) : '',
  }))
}

function isValidFrame(value: unknown): value is StoryFrame {
  if (typeof value !== 'object' || value === null) return false
  const f = value as Partial<StoryFrame>
  return typeof f.id === 'string' && typeof f.photoId === 'string' && isPhotoId(f.photoId) && typeof f.caption === 'string'
}

function isValidPost(value: unknown): value is StoryPost {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Partial<StoryPost>
  if (typeof p.id !== 'string' || typeof p.postedAt !== 'number' || typeof p.expiresAt !== 'number') return false
  if (p.viewedAt !== null && typeof p.viewedAt !== 'number') return false
  if (!Array.isArray(p.frames) || p.frames.length < 1 || p.frames.length > 2) return false
  return p.frames.every(isValidFrame)
}

function readState(): StoriesState {
  try {
    const raw = localStorage.getItem(STORIES_KEY)
    if (raw === null) return { ...EMPTY, recentIds: [] }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return { ...EMPTY, recentIds: [] }
    const { posts, lastSpawnSlot, recentIds } = parsed as Partial<StoriesState>
    const cleanPosts = Array.isArray(posts) ? posts.filter(isValidPost) : []
    const cleanRecent = Array.isArray(recentIds)
      ? recentIds.filter((id): id is PhotoId => typeof id === 'string' && isPhotoId(id)).slice(-8)
      : []
    return {
      posts: cleanPosts,
      lastSpawnSlot: typeof lastSpawnSlot === 'string' ? lastSpawnSlot : '',
      recentIds: cleanRecent,
    }
  } catch {
    return { ...EMPTY, recentIds: [] }
  }
}

function writeState(state: StoriesState): void {
  try {
    localStorage.setItem(STORIES_KEY, JSON.stringify(state))
  } catch {
    /* private mode — stories still work for this session in memory */
  }
}

export function isStoryLive(post: StoryPost, now: number = Date.now()): boolean {
  return post.expiresAt > now && post.frames.length > 0
}

export function livePosts(posts: readonly StoryPost[], now: number = Date.now()): StoryPost[] {
  return posts.filter((p) => isStoryLive(p, now)).sort((a, b) => a.postedAt - b.postedAt)
}

export function hasLiveStory(posts: readonly StoryPost[], now: number = Date.now()): boolean {
  return livePosts(posts, now).length > 0
}

export function hasUnseenStory(posts: readonly StoryPost[], now: number = Date.now()): boolean {
  return livePosts(posts, now).some((p) => p.viewedAt === null)
}

/**
 * Purge expired posts and, when this Istanbul slot has no spawn yet,
 * post 1–2 time-matched frames. Several slots can overlap (each lasts 24h).
 */
export function ensureStories(mood: number, now: number = Date.now()): StoryPost[] {
  const state = readState()
  const live = livePosts(state.posts, now)
  const slot = istanbulSlot(now)
  let posts = live
  let lastSpawnSlot = state.lastSpawnSlot
  let recentIds = state.recentIds
  if (lastSpawnSlot !== slot) {
    const frames = pickStoryFrames(mood, now, recentIds)
    const post: StoryPost = {
      id: newId(),
      postedAt: now,
      expiresAt: now + STORY_TTL_MS,
      viewedAt: null,
      frames,
    }
    posts = [...live, post]
    lastSpawnSlot = slot
    recentIds = [...recentIds, ...frames.map((f) => f.photoId)].slice(-8)
  }
  const changed =
    posts.length !== state.posts.length ||
    lastSpawnSlot !== state.lastSpawnSlot ||
    posts.some((p, i) => state.posts[i]?.id !== p.id)
  if (changed) writeState({ posts, lastSpawnSlot, recentIds })
  return posts
}

/** Opening the reel mutes the ring. Does not touch chat ticks. */
export function markStoriesViewed(now: number = Date.now()): StoryPost[] {
  const state = readState()
  const posts = state.posts.map((p) => {
    if (!isStoryLive(p, now) || p.viewedAt !== null) return p
    return { ...p, viewedAt: now }
  })
  writeState({ ...state, posts })
  return livePosts(posts, now)
}

export function loadStories(now: number = Date.now()): StoryPost[] {
  return livePosts(readState().posts, now)
}

export function storySrc(photoId: PhotoId): string {
  return photoById(photoId).src
}

export function storyAlt(photoId: PhotoId): string {
  return photoById(photoId).alt
}

export function storyAgeLabel(postedAt: number, now: number = Date.now()): string {
  const mins = Math.max(0, Math.round((now - postedAt) / 60_000))
  if (mins < 1) return 'şimdi'
  if (mins < 60) return `${mins}dk`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}sa`
  return '1g'
}
