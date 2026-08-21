import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChatMsg, PhotoId, ReplyPart } from './lib/types'
import { makeMsg } from './lib/types'
import { hasMinorContent, pickRefusal } from '../shared/safety'
import { requestAsyaReply, requestOpener } from './lib/api'
import { parseModelReply } from './lib/parse'
import { connectionLine, instantBeat } from './lib/flavor'
import { CHIP_PHOTO } from './lib/photos'
import { clearMessages, isAgeVerified, loadMessages, saveMessages, setAgeVerified } from './lib/storage'
import { AgeGate } from './components/AgeGate'
import { Avatar } from './components/Avatar'
import { Bubble } from './components/Bubble'
import { TypingDots } from './components/TypingDots'
import { Chips, type ChipDef } from './components/Chips'
import { Composer } from './components/Composer'
import { ProfileSheet } from './components/ProfileSheet'
import { PhotoViewer } from './components/PhotoViewer'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function voiceDuration(text: string): number {
  return Math.min(19, Math.max(6, 5 + Math.round(text.length / 14)))
}

/**
 * Human-thumb stagger between bubbles of one burst: roughly 400-1200ms,
 * longer lines take a bit more (she "typed" them), photos take the longest.
 */
function revealDelay(part: ReplyPart): number {
  if (part.kind === 'photo') return 900 + Math.random() * 500
  return 400 + Math.random() * 350 + Math.min(650, part.text.length * 14)
}

/** True while a beat ("dur", "off") is the newest thing she has said. */
function hasDanglingBeat(msgs: ChatMsg[]): boolean {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]
    if (m.author === 'asya') return m.kind === 'beat'
  }
  return false
}

function partToMsg(part: ReplyPart): ChatMsg {
  if (part.kind === 'voice') {
    return makeMsg('asya', 'voice', part.text, { durSec: voiceDuration(part.text) })
  }
  if (part.kind === 'photo') {
    return makeMsg('asya', 'photo', part.text, { photoId: part.photoId })
  }
  return makeMsg('asya', 'text', part.text)
}

export default function App() {
  const [gateOk, setGateOk] = useState(isAgeVerified)
  const [msgs, setMsgs] = useState<ChatMsg[]>(loadMessages)
  const [typing, setTyping] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [viewerSrc, setViewerSrc] = useState<string | null>(null)

  const msgsRef = useRef(msgs)
  // Reply-generation counter: every new send (or reset) bumps it, which makes
  // the previous run drop its queued bubbles and ignore its late fetch result.
  // Bubbles already on screen stay; the new reply accounts for them.
  const genRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const timersRef = useRef<number[]>([])
  const introStartedRef = useRef(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  const pushMsg = useCallback((msg: ChatMsg) => {
    msgsRef.current = [...msgsRef.current, msg]
    setMsgs(msgsRef.current)
  }, [])

  const schedule = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms))
  }, [])

  /** Claims a new generation, cancelling the previous run's fetch + reveals. */
  const beginGen = useCallback((): { gen: number; signal: AbortSignal } => {
    const gen = ++genRef.current
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    return { gen, signal: controller.signal }
  }, [])

  const pushParts = useCallback(
    async (gen: number, parts: ReplyPart[]) => {
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) {
          await sleep(revealDelay(parts[i]))
          if (genRef.current !== gen) return
        }
        pushMsg(partToMsg(parts[i]))
      }
    },
    [pushMsg],
  )

  /** Session opener: Grok writes it via the server-side hidden kickoff. */
  const openSession = useCallback(async () => {
    const { gen, signal } = beginGen()
    setTyping(true)
    let parts: ReplyPart[] | null = null
    try {
      parts = parseModelReply(await requestOpener(signal))
    } catch {
      parts = null
    }
    if (genRef.current !== gen) return
    if (parts === null) {
      pushMsg(makeMsg('asya', 'text', connectionLine()))
    } else {
      await sleep(500)
      if (genRef.current !== gen) return
      await pushParts(gen, parts)
    }
    if (genRef.current !== gen) return
    setTyping(false)
  }, [beginGen, pushMsg, pushParts])

  useEffect(() => {
    if (gateOk && msgsRef.current.length === 0 && !introStartedRef.current) {
      introStartedRef.current = true
      void openSession()
    }
  }, [gateOk, openSession])

  useEffect(() => {
    saveMessages(msgs)
  }, [msgs])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [msgs, typing])

  const sentPhotoIds = useMemo(() => {
    const ids = new Set<PhotoId>()
    for (const m of msgs) {
      if (m.kind === 'photo' && m.photoId) ids.add(m.photoId)
    }
    return ids
  }, [msgs])

  // The composer never locks: sending mid-burst starts a new generation,
  // which stops her leftover queued bubbles and re-asks with his new message
  // (plus whatever bubbles already landed) in the history.
  const send = useCallback(
    async (text: string, chip: ChipDef | null = null) => {
      pushMsg(makeMsg('user', 'text', text))
      const { gen, signal } = beginGen()
      setTyping(true)

      // Hard 21+ guard: refuse instantly, never call the model.
      if (hasMinorContent(text)) {
        await sleep(700)
        if (genRef.current !== gen) return
        const refusalParts = pickRefusal().split('\n\n')
        for (let i = 0; i < refusalParts.length; i++) {
          if (i > 0) {
            await sleep(850)
            if (genRef.current !== gen) return
          }
          pushMsg(makeMsg('asya', 'text', refusalParts[i]))
        }
        setTyping(false)
        return
      }

      // Instant first beat so send never feels hung, then the Grok fill.
      // Skipped when a beat is already dangling (he double-texted fast).
      schedule(() => {
        if (genRef.current !== gen || hasDanglingBeat(msgsRef.current)) return
        pushMsg(makeMsg('asya', 'beat', instantBeat()))
      }, 450 + Math.random() * 400)

      const started = Date.now()
      let parts: ReplyPart[] | null = null
      try {
        parts = parseModelReply(await requestAsyaReply(msgsRef.current, signal))
      } catch {
        parts = null
      }
      if (genRef.current !== gen) return

      if (parts === null) {
        // All retries failed: one in-character connection note, nothing canned.
        pushMsg(makeMsg('asya', 'text', connectionLine()))
        setTyping(false)
        return
      }

      // Chips promise a payoff: if Grok didn't send one, force the themed
      // photo (captionless) or turn the reply into a voice note.
      if (chip) {
        if (chip.id === 'sesli' && !parts.some((p) => p.kind === 'voice')) {
          const firstText = parts.find((p) => p.kind === 'text')
          if (firstText) firstText.kind = 'voice'
        } else if (chip.id !== 'sesli' && !parts.some((p) => p.kind === 'photo')) {
          parts.splice(Math.min(1, parts.length), 0, {
            kind: 'photo',
            text: '',
            photoId: CHIP_PHOTO[chip.id],
          })
        }
        parts = parts.slice(0, 4)
      }

      const elapsed = Date.now() - started
      if (elapsed < 1400) await sleep(1400 - elapsed)
      if (genRef.current !== gen) return
      await pushParts(gen, parts)
      if (genRef.current !== gen) return
      setTyping(false)
    },
    [beginGen, pushMsg, pushParts, schedule],
  )

  const resetChat = useCallback(() => {
    if (!window.confirm('sohbet silinsin mi?')) return
    genRef.current += 1
    abortRef.current?.abort()
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []
    clearMessages()
    msgsRef.current = []
    setMsgs([])
    setTyping(false)
    void openSession()
  }, [openSession])

  if (!gateOk) {
    return (
      <>
        <AgeGate
          onAccept={() => {
            setAgeVerified()
            setGateOk(true)
          }}
        />
        <div className="grain" aria-hidden />
      </>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="peer" onClick={() => setProfileOpen(true)} aria-label="Profili aç">
          <Avatar size={38} />
          <div className="peer-meta">
            <span className="peer-name">asya artin</span>
            <span className={`peer-status${typing ? ' is-typing' : ''}`}>
              {typing ? 'yazıyor…' : 'çevrimiçi'}
            </span>
          </div>
        </button>
        <button type="button" className="reset-btn" onClick={resetChat}>
          sil
        </button>
      </header>

      <main className="thread">
        <div className="day-sep">bu gece</div>
        {msgs.map((msg, i) => {
          const next = msgs[i + 1]
          const showTime = !next || next.author !== msg.author
          return <Bubble key={msg.id} msg={msg} showTime={showTime} onOpenPhoto={setViewerSrc} />
        })}
        {typing && <TypingDots />}
        <div ref={endRef} />
      </main>

      <footer className="dock">
        <Chips onPick={(chip) => void send(chip.userLine, chip)} />
        <Composer onSend={(text) => void send(text)} />
        <p className="fineprint">asya artin kurgusal bir karakterdir · 21+</p>
      </footer>

      {profileOpen && (
        <ProfileSheet
          sentIds={sentPhotoIds}
          onClose={() => setProfileOpen(false)}
          onOpenPhoto={(src) => {
            setProfileOpen(false)
            setViewerSrc(src)
          }}
        />
      )}
      {viewerSrc !== null && <PhotoViewer src={viewerSrc} onClose={() => setViewerSrc(null)} />}
      <div className="grain" aria-hidden />
    </div>
  )
}
