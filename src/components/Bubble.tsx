import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChatMsg } from '../lib/types'
import { photoById } from '../lib/photos'
import { getVoiceAudio, prefetchVoice } from '../lib/voice'
import { getVoiceId } from '../lib/settings'

interface BubbleProps {
  msg: ChatMsg
  showTime: boolean
  onOpenPhoto: (src: string) => void
}

function timeLabel(at: number): string {
  return new Date(at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

function durationLabel(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

function VoiceBubble({ msg }: { msg: ChatMsg }) {
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [realDur, setRealDur] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioVoiceRef = useRef<string | null>(null)
  const fakeTimerRef = useRef<number | null>(null)
  const durSec = realDur ?? msg.durSec ?? 8
  const bars = useMemo(
    () => Array.from({ length: 21 }, (_, i) => 6 + ((msg.text.charCodeAt(i % msg.text.length) * 7 + i * 13) % 17)),
    [msg.text],
  )

  // Warm the TTS cache as soon as the bubble appears so tap = instant play.
  useEffect(() => {
    prefetchVoice(msg.id, msg.text)
  }, [msg.id, msg.text])

  useEffect(
    () => () => {
      audioRef.current?.pause()
      if (fakeTimerRef.current !== null) window.clearTimeout(fakeTimerRef.current)
    },
    [],
  )

  const clearFakeTimer = () => {
    if (fakeTimerRef.current !== null) {
      window.clearTimeout(fakeTimerRef.current)
      fakeTimerRef.current = null
    }
  }

  const togglePlay = async () => {
    if (playing) {
      audioRef.current?.pause()
      clearFakeTimer()
      setPlaying(false)
      return
    }
    if (loading) return

    // Voice changed in settings since this note last played: rebuild the
    // element so replays use the new voice, not a stale blob.
    const voice = getVoiceId()
    if (audioRef.current !== null && audioVoiceRef.current !== voice) {
      audioRef.current.pause()
      audioRef.current = null
      setRealDur(null)
    }

    if (audioRef.current === null) {
      setLoading(true)
      const url = await getVoiceAudio(msg.id, msg.text)
      setLoading(false)
      if (url !== null) {
        const el = new Audio(url)
        el.preload = 'auto'
        el.addEventListener('loadedmetadata', () => {
          if (Number.isFinite(el.duration) && el.duration > 0) {
            setRealDur(Math.max(1, Math.round(el.duration)))
          }
        })
        el.addEventListener('play', () => setPlaying(true))
        el.addEventListener('pause', () => setPlaying(false))
        el.addEventListener('ended', () => {
          el.currentTime = 0
          setPlaying(false)
        })
        audioRef.current = el
        audioVoiceRef.current = voice
      }
    }

    const audio = audioRef.current
    if (audio !== null) {
      try {
        await audio.play()
        return
      } catch {
        // Autoplay blocked or decode failure: fall through to the silent bars.
      }
    }

    // TTS unavailable — keep the old silent waveform animation as fallback.
    setPlaying(true)
    fakeTimerRef.current = window.setTimeout(() => {
      setPlaying(false)
      fakeTimerRef.current = null
    }, durSec * 1000)
  }

  return (
    <div className={`bubble asya-bubble voice${playing ? ' playing' : ''}`}>
      <div className="voice-row">
        <button
          type="button"
          className="voice-play"
          onClick={() => void togglePlay()}
          aria-label="Sesli mesajı oynat"
        >
          {loading ? '…' : playing ? '❚❚' : '▶'}
        </button>
        <div className="voice-bars" aria-hidden>
          {bars.map((h, i) => (
            <span key={i} style={{ height: `${h}px`, animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
        <span className="voice-dur">{durationLabel(durSec)}</span>
      </div>
      <p className="voice-transcript">{msg.text}</p>
    </div>
  )
}

function PhotoBubble({ msg, onOpenPhoto }: { msg: ChatMsg; onOpenPhoto: (src: string) => void }) {
  const photo = photoById(msg.photoId ?? 'ben')
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
  const side = msg.author === 'user' ? 'user' : 'asya'

  let inner: React.ReactNode
  switch (msg.kind) {
    case 'text':
    case 'beat': {
      inner = (
        <div className={`bubble ${side === 'user' ? 'user-bubble' : 'asya-bubble'}${msg.kind === 'beat' ? ' beat' : ''}`}>
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
