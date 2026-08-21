import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChatMsg, ReplyPart, StoryReplyMeta } from './lib/types'
import { makeMsg } from './lib/types'
import { hasMinorContent, pickRefusal } from '../shared/safety'
import { moodStage } from '../shared/mood'
import { requestAsyaReply, requestOpener, requestSurprise } from './lib/api'
import { parseModelReply } from './lib/parse'
import { connectionLine } from './lib/flavor'
import { instantBeat, photoReceivedBeat, typingStatus } from './lib/beats'
import { pickOpener, type ChipDef } from './lib/chips'
import { chipPhotoOffer, detectPhotoAsk, enforcePhotoAsk, sentPhotoIdSet } from './lib/photos'
import { clearMessages, isAgeVerified, loadMessages, saveMessages, setAgeVerified } from './lib/storage'
import { isLeadModeOn } from './lib/settings'
import { foldMemoryTurn, loadMemory } from './lib/memory'
import { applyModelMood, applyMoodDelta, loadMood, nudgeMoodFromUser } from './lib/mood'
import { isDirectorLine } from './lib/director'
import { syncFavicon, useCurrentPfp } from './lib/pfp'
import { AgeGate } from './components/AgeGate'
import { Avatar } from './components/Avatar'
import { Bubble } from './components/Bubble'
import { TypingDots } from './components/TypingDots'
import { Chips } from './components/Chips'
import { Composer } from './components/Composer'
import { ProfileSheet } from './components/ProfileSheet'
import { SettingsSheet } from './components/SettingsSheet'
import { PhotoViewer } from './components/PhotoViewer'
import { StoryViewer } from './components/StoryViewer'
import { ensureStories, hasLiveStory, hasUnseenStory, loadStories, markStoriesViewed } from './lib/stories'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Her "text first" clock: irregular on purpose — 4 to 14 minutes of silence
 * before she might reach for the phone herself, never a metronome.
 */
function surpriseDelay(): number {
  return 240_000 + Math.random() * 600_000
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

/**
 * Her whole burst as one compact line for the relationship-memory digest.
 * Photo entries keep their id ("[foto:acik]") so she remembers across
 * sessions which shots he already got and reaches for a fresh one.
 */
function partsToDigest(parts: ReplyPart[]): string {
  return parts
    .map((p) => {
      if (p.kind === 'photo') return `[foto:${p.photoId ?? '?'}] ${p.text}`.trim()
      if (p.kind === 'voice') return `🎙 ${p.text}`.trim()
      return p.text
    })
    .filter((t) => t.length > 0)
    .join(' / ')
}

export default function App() {
  const [gateOk, setGateOk] = useState(isAgeVerified)
  const [msgs, setMsgs] = useState<ChatMsg[]>(loadMessages)
  const [typing, setTyping] = useState(false)
  // The header word while she types — mostly "yazıyor…", occasionally the
  // sloppier variant, rolled once per typing run so it never flickers.
  const [typingWord, setTypingWord] = useState('yazıyor…')
  const [mood, setMood] = useState(loadMood)
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [viewerSrc, setViewerSrc] = useState<string | null>(null)
  const [storyOpen, setStoryOpen] = useState(false)
  const [storyTick, setStoryTick] = useState(0)
  const pfp = useCurrentPfp()
  const stories = useMemo(() => (gateOk ? loadStories() : []), [gateOk, storyTick])
  const storyLive = hasLiveStory(stories)
  const storyUnseen = hasUnseenStory(stories)

  const msgsRef = useRef(msgs)
  // Reply-generation counter: every new send (or reset) bumps it, which makes
  // the previous run drop its queued bubbles and ignore its late fetch result.
  // Bubbles already on screen stay; the new reply accounts for them.
  const genRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const timersRef = useRef<number[]>([])
  const introStartedRef = useRef(false)
  const endRef = useRef<HTMLDivElement | null>(null)
  // When her next self-started turn may fire; armed once the gate passes,
  // then re-armed by every generation.
  const surpriseAtRef = useRef(0)

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
    // Any activity re-arms her "text first" clock: surprises grow out of
    // real silence, never seconds after an exchange.
    surpriseAtRef.current = Date.now() + surpriseDelay()
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
    setTypingWord(typingStatus())
    setTyping(true)
    let parts: ReplyPart[] | null = null
    try {
      const parsed = parseModelReply(await requestOpener(loadMemory(), loadMood(), signal))
      parts = parsed.parts
      if (parsed.mood !== null) setMood(applyModelMood(parsed.mood))
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

  // The tab icons follow the same hourly rotation as her avatars.
  useEffect(() => {
    syncFavicon(pfp)
  }, [pfp])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [msgs, typing])

  // Keep the header status honest while the tab idles: mood cools over hours.
  useEffect(() => {
    const timer = window.setInterval(() => setMood(loadMood()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  // She posts stories on her own Istanbul slot (morning coffee, night bed…).
  // Expired frames vanish; a new slot lights the ring again.
  useEffect(() => {
    if (!gateOk) return
    ensureStories(loadMood())
    setStoryTick((n) => n + 1)
    const timer = window.setInterval(() => {
      ensureStories(loadMood())
      setStoryTick((n) => n + 1)
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [gateOk])

  const sentPhotoIds = useMemo(() => sentPhotoIdSet(msgs), [msgs])

  // The composer never locks: sending mid-burst starts a new generation,
  // which stops her leftover queued bubbles and re-asks with his new message
  // (plus whatever bubbles already landed) in the history.
  const send = useCallback(
    async (text: string, chip: ChipDef | null = null, storyReply?: StoryReplyMeta) => {
      pushMsg(makeMsg('user', 'text', text, storyReply ? { storyReply } : undefined))
      const { gen, signal } = beginGen()
      setTypingWord(typingStatus())
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

      // Director turn: he hands her the wheel via the chip or a short
      // hand-over line — the server tells her to advance the scene herself.
      const director = chip?.id === 'devam' || (chip === null && isDirectorLine(text))

      // His message warms or cools her before the model even answers, so the
      // request already carries the nudged state. A hand-over is engagement,
      // never a brush-off.
      const moodNow = director ? applyMoodDelta(2) : nudgeMoodFromUser(text)
      setMood(moodNow)

      // Instant first beat so send never feels hung, then the Grok fill.
      // The beat reacts to HIS message (pet name → pet name back, photo ask
      // → "dur bakiyom", cold "tamam" → quiet "hmm"). Skipped when a beat is
      // already dangling (he double-texted fast).
      schedule(() => {
        if (genRef.current !== gen || hasDanglingBeat(msgsRef.current)) return
        pushMsg(makeMsg('asya', 'beat', instantBeat(text)))
      }, 450 + Math.random() * 400)

      const started = Date.now()
      let parts: ReplyPart[] | null = null
      try {
        const parsed = parseModelReply(
          await requestAsyaReply(msgsRef.current, loadMemory(), { mood: moodNow, director, lead: isLeadModeOn() }, signal),
        )
        parts = parsed.parts
        // Her side of the exchange moves the state too (hidden [MOOD:±n] tag).
        if (parsed.mood !== null) setMood(applyModelMood(parsed.mood))
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

      // Chip payoffs: sesli still guarantees a voice note. Scene chips are
      // text-first — the themed photo is only injected when Grok sent none
      // AND a mood-scaled roll says yes (never a rerun id), so ten ofis taps
      // don't end in ten identical ayna shots. devam promises a scene beat
      // instead — never a forced photo.
      if (chip && chip.id !== 'devam') {
        if (chip.id === 'sesli') {
          if (!parts.some((p) => p.kind === 'voice')) {
            const firstText = parts.find((p) => p.kind === 'text')
            if (firstText) firstText.kind = 'voice'
          }
        } else if (!parts.some((p) => p.kind === 'photo')) {
          const offered = chipPhotoOffer(chip.id, moodNow, sentPhotoIdSet(msgsRef.current))
          if (offered !== null) {
            parts.splice(Math.min(1, parts.length), 0, { kind: 'photo', text: '', photoId: offered })
          }
        }
        parts = parts.slice(0, 4)
      }

      // Body-part safety net: on an unambiguous ask ("meme at") a wrong-id
      // photo is swapped to one that shows the part; a missing one is
      // injected only when she is already azgın — naz stays naz.
      const ask = chip === null ? detectPhotoAsk(text) : null
      if (ask !== null) {
        parts = enforcePhotoAsk(parts, ask, moodNow, sentPhotoIdSet(msgsRef.current))
      }

      // Fold the finished exchange into the local relationship memory so she
      // carries it across sessions ("sil" clears bubbles, never this).
      foldMemoryTurn(storyReply ? `[hikaye:${storyReply.photoId}] ${text}` : text, partsToDigest(parts))

      const elapsed = Date.now() - started
      if (elapsed < 1400) await sleep(1400 - elapsed)
      if (genRef.current !== gen) return
      await pushParts(gen, parts)
      if (genRef.current !== gen) return
      setTyping(false)
    },
    [beginGen, pushMsg, pushParts, schedule],
  )

  /**
   * He sends a photo: his frame lands as a user bubble, the wire carries an
   * "[EMİN FOTO attı]" mark (plus his caption) and requestAsyaReply posts
   * the JPEG data URL as images[] so she actually sees the pixels. No chip
   * payoffs, no body-ask enforcement: he is showing, not asking.
   */
  const sendPhoto = useCallback(
    async (src: string, caption: string) => {
      pushMsg(makeMsg('user', 'photo', caption, { photoSrc: src }))
      const { gen, signal } = beginGen()
      setTypingWord(typingStatus())
      setTyping(true)

      // Hard 21+ guard on his caption: refuse instantly, never call the model.
      if (hasMinorContent(caption)) {
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

      // His frame warms her before the model even answers; a hot caption stacks.
      if (caption.length > 0) nudgeMoodFromUser(caption)
      const moodNow = applyMoodDelta(4)
      setMood(moodNow)

      // The gasp lands while she "opens" it, then Grok writes the reaction.
      schedule(() => {
        if (genRef.current !== gen || hasDanglingBeat(msgsRef.current)) return
        pushMsg(makeMsg('asya', 'beat', photoReceivedBeat()))
      }, 450 + Math.random() * 400)

      const started = Date.now()
      let parts: ReplyPart[] | null = null
      try {
        const parsed = parseModelReply(
          await requestAsyaReply(msgsRef.current, loadMemory(), { mood: moodNow, lead: isLeadModeOn() }, signal),
        )
        parts = parsed.parts
        if (parsed.mood !== null) setMood(applyModelMood(parsed.mood))
      } catch {
        parts = null
      }
      if (genRef.current !== gen) return

      if (parts === null) {
        pushMsg(makeMsg('asya', 'text', connectionLine()))
        setTyping(false)
        return
      }

      foldMemoryTurn(`[foto] ${caption}`.trim(), partsToDigest(parts))

      const elapsed = Date.now() - started
      if (elapsed < 1400) await sleep(1400 - elapsed)
      if (genRef.current !== gen) return
      await pushParts(gen, parts)
      if (genRef.current !== gen) return
      setTyping(false)
    },
    [beginGen, pushMsg, pushParts, schedule],
  )

  /**
   * A surprise turn: she opens the thread herself — flirty check-in, a 🎙️
   * note or an archive [FOTO:id], shaped server-side by the Istanbul clock
   * and her heat. A failure stays invisible: he asked for nothing, so no
   * error bubble, no trace — the clock just re-arms.
   */
  const runSurprise = useCallback(async () => {
    const { gen, signal } = beginGen()
    setTypingWord(typingStatus())
    setTyping(true)
    let parts: ReplyPart[] | null = null
    try {
      const parsed = parseModelReply(
        await requestSurprise(msgsRef.current, loadMemory(), { mood: loadMood(), lead: isLeadModeOn() }, signal),
      )
      parts = parsed.parts
      if (parsed.mood !== null) setMood(applyModelMood(parsed.mood))
    } catch {
      parts = null
    }
    if (genRef.current !== gen) return
    if (parts === null) {
      setTyping(false)
      return
    }
    foldMemoryTurn('(yazmadı, sen başlattın)', partsToDigest(parts))
    await sleep(500 + Math.random() * 400)
    if (genRef.current !== gen) return
    await pushParts(gen, parts)
    if (genRef.current !== gen) return
    setTyping(false)
  }, [beginGen, pushParts])

  // The clock ticks coarsely and fires only into real idle silence: tab
  // visible, no generation in flight (his in-flight turn is never stomped —
  // busy or hidden just pushes the clock a minute). There is no "seen", no
  // grey-tick mechanic anywhere: she initiates, she never accuses.
  useEffect(() => {
    if (!gateOk) return
    if (surpriseAtRef.current === 0) surpriseAtRef.current = Date.now() + surpriseDelay()
    const timer = window.setInterval(() => {
      if (Date.now() < surpriseAtRef.current) return
      if (typing || document.visibilityState === 'hidden' || msgsRef.current.length === 0) {
        surpriseAtRef.current = Date.now() + 60_000 + Math.random() * 90_000
        return
      }
      void runSurprise()
    }, 20_000)
    return () => window.clearInterval(timer)
  }, [gateOk, typing, runSurprise])

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
        <div className="peer">
          <button
            type="button"
            className={`peer-pfp${storyLive ? ` story-ring${storyUnseen ? ' is-new' : ' is-seen'}` : ''}`}
            onClick={() => {
              if (storyLive) {
                markStoriesViewed()
                setStoryTick((n) => n + 1)
                setStoryOpen(true)
              } else {
                setProfileOpen(true)
              }
            }}
            aria-label={storyLive ? 'Hikayeyi aç' : 'Profili aç'}
          >
            <Avatar size={38} />
          </button>
          <button type="button" className="peer-meta" onClick={() => setProfileOpen(true)} aria-label="Profili aç">
            <span className="peer-name">asya</span>
            <span className={`peer-status${typing ? ' is-typing' : ''}`}>
              {typing ? (
                typingWord
              ) : (
                <>
                  çevrimiçi · <span className={`mood-word mood-${moodStage(mood).id}`}>{moodStage(mood).label}</span>
                </>
              )}
            </span>
          </button>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className="gear-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label="Ayarlar"
          >
            ⚙︎
          </button>
          <button type="button" className="reset-btn" onClick={resetChat}>
            sil
          </button>
        </div>
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
        <Chips onPick={(chip) => void send(pickOpener(chip.id), chip)} />
        <Composer onSend={(text) => void send(text)} onSendPhoto={(src, caption) => void sendPhoto(src, caption)} />
        <p className="fineprint">asya kurgusal bir karakterdir · 21+</p>
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
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
      {viewerSrc !== null && <PhotoViewer src={viewerSrc} onClose={() => setViewerSrc(null)} />}
      {storyOpen && stories.length > 0 && (
        <StoryViewer
          posts={stories}
          onClose={() => setStoryOpen(false)}
          onReply={(text, meta) => {
            setStoryOpen(false)
            void send(text, null, meta)
          }}
        />
      )}
      <div className="grain" aria-hidden />
    </div>
  )
}
