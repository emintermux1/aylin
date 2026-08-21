import { useCallback, useEffect, useRef, useState } from 'react'
import { Avatar } from './Avatar'
import { storyAgeLabel, storyAlt, storySrc } from '../lib/stories'
import type { StoryFrame, StoryPost } from '../lib/stories'
import type { StoryReplyMeta } from '../lib/types'

interface ReelItem {
  frame: StoryFrame
  postedAt: number
}

interface StoryViewerProps {
  posts: StoryPost[]
  onClose: () => void
  onReply: (text: string, meta: StoryReplyMeta) => void
}

const FRAME_MS = 5500
const TAP_MS = 220
const SWIPE_X = 48
const SWIPE_Y = 80

function flatten(posts: StoryPost[]): ReelItem[] {
  const items: ReelItem[] = []
  for (const post of posts) {
    for (const frame of post.frames) {
      items.push({ frame, postedAt: post.postedAt })
    }
  }
  return items
}

export function StoryViewer({ posts, onClose, onReply }: StoryViewerProps) {
  const reel = flatten(posts)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [draft, setDraft] = useState('')
  const replying = draft.length > 0
  const holdRef = useRef(false)
  const pointerRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const count = reel.length
  const current = reel[Math.min(index, Math.max(0, count - 1))]

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next >= count) {
        onClose()
        return
      }
      setIndex(next)
    },
    [count, onClose],
  )

  useEffect(() => {
    if (paused || replying || count === 0) return
    const timer = window.setTimeout(() => go(index + 1), FRAME_MS)
    return () => window.clearTimeout(timer)
  }, [index, paused, replying, count, go])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(index + 1)
      if (e.key === 'ArrowLeft') go(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, index, onClose])

  if (current === undefined) return null

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, form')) return
    pointerRef.current = { x: e.clientX, y: e.clientY, t: Date.now() }
    holdRef.current = false
    window.setTimeout(() => {
      if (pointerRef.current !== null) {
        holdRef.current = true
        setPaused(true)
      }
    }, TAP_MS)
  }

  const finishPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerRef.current
    pointerRef.current = null
    if (start === null) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    const dt = Date.now() - start.t
    if (holdRef.current) {
      holdRef.current = false
      setPaused(false)
      return
    }
    if (dy > SWIPE_Y && Math.abs(dy) > Math.abs(dx)) {
      onClose()
      return
    }
    if (dx <= -SWIPE_X) {
      go(index + 1)
      return
    }
    if (dx >= SWIPE_X) {
      go(index - 1)
      return
    }
    if (dt <= TAP_MS && Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      if (x < rect.width * 0.3) go(index - 1)
      else go(index + 1)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (text.length === 0) return
    onReply(text, { photoId: current.frame.photoId, caption: current.frame.caption })
  }

  return (
    <div className="story-viewer" role="dialog" aria-label="Hikaye">
      <div className="story-progress" aria-hidden>
        {reel.map((item, i) => (
          <span key={item.frame.id} className="story-bar">
            <span
              className={`story-bar-fill${i < index ? ' is-done' : ''}${i === index ? ' is-active' : ''}`}
              style={
                i === index
                  ? { animationDuration: `${FRAME_MS}ms`, animationPlayState: paused || replying ? 'paused' : 'running' }
                  : undefined
              }
            />
          </span>
        ))}
      </div>

      <div className="story-head">
        <div className="story-who">
          <Avatar size={28} />
          <div className="story-who-meta">
            <span className="story-name">asya</span>
            <span className="story-age">{storyAgeLabel(current.postedAt)}</span>
          </div>
        </div>
        <button type="button" className="story-close" onClick={onClose} aria-label="Kapat">
          ✕
        </button>
      </div>

      <div
        className="story-stage"
        onPointerDown={onPointerDown}
        onPointerUp={finishPointer}
        onPointerCancel={() => {
          pointerRef.current = null
          if (holdRef.current) {
            holdRef.current = false
            setPaused(false)
          }
        }}
      >
        <img src={storySrc(current.frame.photoId)} alt={storyAlt(current.frame.photoId)} />
        <div className="story-hit story-hit-left" aria-hidden />
        <div className="story-hit story-hit-right" aria-hidden />
        {current.frame.caption.length > 0 && <p className="story-caption">{current.frame.caption}</p>}
      </div>

      <form className="story-reply" onSubmit={submit}>
        <input
          ref={inputRef}
          className="story-reply-input"
          type="text"
          maxLength={160}
          placeholder="yanıtla…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          enterKeyHint="send"
        />
        <button type="submit" className="story-reply-send" disabled={draft.trim().length === 0}>
          gönder
        </button>
      </form>
    </div>
  )
}
