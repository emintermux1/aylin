import { useMemo, useRef, useState } from 'react'
import type { ChatMsg } from '../lib/types'
import { photoById } from '../lib/photos'

interface BubbleProps {
  msg: ChatMsg
  showTime: boolean
  onOpenPhoto: (src: string) => void
}

function timeLabel(at: number): string {
  return new Date(at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

function VoiceBubble({ msg }: { msg: ChatMsg }) {
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<number | null>(null)
  const durSec = msg.durSec ?? 8
  const bars = useMemo(
    () => Array.from({ length: 21 }, (_, i) => 6 + ((msg.text.charCodeAt(i % msg.text.length) * 7 + i * 13) % 17)),
    [msg.text],
  )

  const togglePlay = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (playing) {
      setPlaying(false)
      return
    }
    setPlaying(true)
    timerRef.current = window.setTimeout(() => {
      setPlaying(false)
      timerRef.current = null
    }, durSec * 1000)
  }

  return (
    <div className={`bubble aylin-bubble voice${playing ? ' playing' : ''}`}>
      <div className="voice-row">
        <button type="button" className="voice-play" onClick={togglePlay} aria-label="Sesli mesajı oynat">
          {playing ? '❚❚' : '▶'}
        </button>
        <div className="voice-bars" aria-hidden>
          {bars.map((h, i) => (
            <span key={i} style={{ height: `${h}px`, animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
        <span className="voice-dur">0:{String(durSec).padStart(2, '0')}</span>
      </div>
      <p className="voice-transcript">{msg.text}</p>
    </div>
  )
}

function PhotoBubble({ msg, onOpenPhoto }: { msg: ChatMsg; onOpenPhoto: (src: string) => void }) {
  const photo = photoById(msg.photoId ?? 'ayna')
  return (
    <div className="bubble photo-bubble">
      <button type="button" className="photo-tap" onClick={() => onOpenPhoto(photo.src)}>
        <img src={photo.src} alt={photo.alt} loading="lazy" />
      </button>
      {msg.text.length > 0 && <p className="photo-caption">{msg.text}</p>}
    </div>
  )
}

export function Bubble({ msg, showTime, onOpenPhoto }: BubbleProps) {
  const side = msg.author === 'user' ? 'user' : 'aylin'

  let inner: React.ReactNode
  switch (msg.kind) {
    case 'text':
    case 'beat': {
      inner = (
        <div className={`bubble ${side === 'user' ? 'user-bubble' : 'aylin-bubble'}${msg.kind === 'beat' ? ' beat' : ''}`}>
          {msg.text}
        </div>
      )
      break
    }
    case 'voice': {
      inner = <VoiceBubble msg={msg} />
      break
    }
    case 'photo': {
      inner = <PhotoBubble msg={msg} onOpenPhoto={onOpenPhoto} />
      break
    }
    default: {
      const exhaustive: never = msg.kind
      return exhaustive
    }
  }

  return (
    <div className={`row ${side}`}>
      <div className="stack">
        {inner}
        {showTime && <span className="time">{timeLabel(msg.at)}</span>}
      </div>
    </div>
  )
}
