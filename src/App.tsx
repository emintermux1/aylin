import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChatMsg, PhotoId, ReplyPart } from './lib/types'
import { makeMsg } from './lib/types'
import { hasMinorContent, pickRefusal } from '../shared/safety'
import { requestAylinReply } from './lib/api'
import { parseModelReply } from './lib/parse'
import { instantBeat, introParts, offlineReply, themedPhotoPart, voiceNotePart } from './lib/fallback'
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

function partToMsg(part: ReplyPart): ChatMsg {
  if (part.kind === 'voice') {
    return makeMsg('aylin', 'voice', part.text, { durSec: voiceDuration(part.text) })
  }
  if (part.kind === 'photo') {
    return makeMsg('aylin', 'photo', part.text, { photoId: part.photoId })
  }
  return makeMsg('aylin', 'text', part.text)
}

export default function App() {
  const [gateOk, setGateOk] = useState(isAgeVerified)
  const [msgs, setMsgs] = useState<ChatMsg[]>(loadMessages)
  const [typing, setTyping] = useState(false)
  const [pending, setPending] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [viewerSrc, setViewerSrc] = useState<string | null>(null)

  const msgsRef = useRef(msgs)
  const sessionRef = useRef(0)
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

  const seedIntro = useCallback(() => {
    const session = sessionRef.current
    setTyping(true)
    let delay = 900
    for (const part of introParts()) {
      schedule(() => {
        if (sessionRef.current === session) pushMsg(partToMsg(part))
      }, delay)
      delay += 950 + Math.random() * 450
    }
    schedule(() => {
      if (sessionRef.current === session) setTyping(false)
    }, delay)
  }, [pushMsg, schedule])

  useEffect(() => {
    if (gateOk && msgsRef.current.length === 0 && !introStartedRef.current) {
      introStartedRef.current = true
      seedIntro()
    }
  }, [gateOk, seedIntro])

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

  const send = useCallback(
    async (text: string, chip: ChipDef | null = null) => {
      if (pending) return
      const session = sessionRef.current
      pushMsg(makeMsg('user', 'text', text))
      setPending(true)
      setTyping(true)

      // Hard 21+ guard: refuse instantly, never call the model.
      if (hasMinorContent(text)) {
        await sleep(700)
        if (sessionRef.current !== session) return
        const refusalParts = pickRefusal().split('\n\n')
        for (let i = 0; i < refusalParts.length; i++) {
          if (i > 0) await sleep(850)
          if (sessionRef.current !== session) return
          pushMsg(makeMsg('aylin', 'text', refusalParts[i]))
        }
        setTyping(false)
        setPending(false)
        return
      }

      // Instant first beat so send never feels hung, then the real fill.
      schedule(() => {
        if (sessionRef.current === session) pushMsg(makeMsg('aylin', 'beat', instantBeat()))
      }, 450 + Math.random() * 400)

      const started = Date.now()
      let parts: ReplyPart[]
      try {
        const raw = await requestAylinReply(msgsRef.current)
        parts = parseModelReply(raw)
      } catch {
        parts = offlineReply(text, msgsRef.current)
      }
      if (sessionRef.current !== session) return

      // Chips promise a payoff: force the themed photo / voice note if the
      // reply didn't include one.
      if (chip) {
        if (chip.id === 'sesli' && !parts.some((p) => p.kind === 'voice')) {
          parts.unshift(voiceNotePart())
        } else if (chip.id !== 'sesli' && !parts.some((p) => p.kind === 'photo')) {
          parts.splice(Math.min(1, parts.length), 0, themedPhotoPart(msgsRef.current, CHIP_PHOTO[chip.id]))
        }
        parts = parts.slice(0, 3)
      }

      const elapsed = Date.now() - started
      if (elapsed < 1400) await sleep(1400 - elapsed)

      for (let i = 0; i < parts.length; i++) {
        if (i > 0) {
          await sleep(parts[i].kind === 'photo' ? 1100 + Math.random() * 500 : 650 + Math.random() * 450)
        }
        if (sessionRef.current !== session) return
        pushMsg(partToMsg(parts[i]))
      }
      setTyping(false)
      setPending(false)
    },
    [pending, pushMsg, schedule],
  )

  const resetChat = useCallback(() => {
    if (!window.confirm('sohbet silinsin mi?')) return
    sessionRef.current += 1
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []
    clearMessages()
    msgsRef.current = []
    setMsgs([])
    setTyping(false)
    setPending(false)
    seedIntro()
  }, [seedIntro])

  if (!gateOk) {
    return (
      <AgeGate
        onAccept={() => {
          setAgeVerified()
          setGateOk(true)
        }}
      />
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="peer" onClick={() => setProfileOpen(true)} aria-label="Profili aç">
          <div className="peer-avatar">
            <Avatar size={40} />
            <span className="online-dot" />
          </div>
          <div className="peer-meta">
            <span className="peer-name">
              aylin <span className="peer-verified" aria-hidden>✦</span>
            </span>
            <span className={`peer-status${typing ? ' is-typing' : ''}`}>
              {typing ? 'yazıyor…' : 'çevrimiçi'}
            </span>
          </div>
        </button>
        <button type="button" className="reset-btn" onClick={resetChat} aria-label="Sohbeti sıfırla">
          <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
            <path d="M4 10a8 8 0 1 1 2 6M4 10V4m0 6h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      <main className="thread">
        <div className="day-sep">bugün</div>
        {msgs.map((msg, i) => {
          const next = msgs[i + 1]
          const showTime = !next || next.author !== msg.author
          return <Bubble key={msg.id} msg={msg} showTime={showTime} onOpenPhoto={setViewerSrc} />
        })}
        {typing && <TypingDots />}
        <div ref={endRef} />
      </main>

      <footer className="dock">
        <Chips disabled={pending} onPick={(chip) => void send(chip.userLine, chip)} />
        <Composer disabled={pending} onSend={(text) => void send(text)} />
        <p className="fineprint">aylin kurgusal bir karakterdir · 21+</p>
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
    </div>
  )
}
