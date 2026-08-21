import { useCallback, useEffect, useRef, useState } from 'react'
import { VOICE_OPTIONS, getVoiceId, isLeadModeOn, setLeadMode, setVoiceId } from '../lib/settings'
import { dropVoiceCache } from '../lib/voice'
import { clearMemory } from '../lib/memory'
import { resetMood } from '../lib/mood'

interface SettingsSheetProps {
  onClose: () => void
}

/** Short Turkish moan line for the "dinle" preview — never English. */
const PREVIEW_LINE = 'ahh... aşkım... gel buraya... mmm... seni çok istiyorum'

type PreviewState = 'idle' | 'loading' | 'playing'

/**
 * Private settings sheet (gear on the header): pick which of the five
 * allowlisted xAI voices reads her voice notes, preview it, and — tucked away
 * here, never on the main chat — wipe the relationship memory.
 */
export function SettingsSheet({ onClose }: SettingsSheetProps) {
  const [voiceId, setVoiceIdState] = useState(getVoiceId)
  const [preview, setPreview] = useState<PreviewState>('idle')
  const [lead, setLead] = useState(isLeadModeOn)
  const [memoryWiped, setMemoryWiped] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const disposedRef = useRef(false)

  const stopPreview = useCallback(() => {
    audioRef.current?.pause()
    audioRef.current = null
    if (urlRef.current !== null) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
    setPreview('idle')
  }, [])

  useEffect(
    () => () => {
      disposedRef.current = true
      stopPreview()
    },
    [stopPreview],
  )

  const selectVoice = (id: string) => {
    if (id === voiceId) return
    setVoiceId(id)
    setVoiceIdState(id)
    // Old blobs must never play as the new voice.
    dropVoiceCache()
    stopPreview()
  }

  const playPreview = async () => {
    if (preview === 'playing') {
      stopPreview()
      return
    }
    if (preview === 'loading') return
    setPreview('loading')
    try {
      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: PREVIEW_LINE, voice: voiceId }),
      })
      const contentType = response.headers.get('content-type') ?? ''
      if (!response.ok || !contentType.startsWith('audio/')) throw new Error('preview_failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      if (disposedRef.current) {
        URL.revokeObjectURL(url)
        return
      }
      urlRef.current = url
      const el = new Audio(url)
      el.addEventListener('ended', stopPreview)
      audioRef.current = el
      await el.play()
      setPreview('playing')
    } catch {
      stopPreview()
    }
  }

  const toggleLead = () => {
    const next = !lead
    setLeadMode(next)
    setLead(next)
  }

  // Forgetting the relationship also cools the body: mood restarts with it.
  const wipeMemory = () => {
    if (!window.confirm('hafıza silinsin mi? yaşadıklarınızı unutur.')) return
    clearMemory()
    resetMood()
    setMemoryWiped(true)
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="sheet-close" onClick={onClose} aria-label="Kapat">
          ✕
        </button>
        <h2 className="settings-title">ayarlar</h2>

        <div className="settings-section">
          <p className="settings-label">sesi</p>
          <div className="voice-options" role="radiogroup" aria-label="Ses seçimi">
            {VOICE_OPTIONS.map((option) => {
              const selected = option.id === voiceId
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`voice-option${selected ? ' selected' : ''}`}
                  onClick={() => selectVoice(option.id)}
                >
                  <span>{option.label}</span>
                  {selected && <span className="voice-option-mark" aria-hidden>●</span>}
                </button>
              )
            })}
          </div>
          <button type="button" className="voice-preview" onClick={() => void playPreview()}>
            {preview === 'loading' ? 'yükleniyor…' : preview === 'playing' ? 'dur' : 'dinle'}
          </button>
        </div>

        <div className="settings-section">
          <p className="settings-label">o yönetsin</p>
          <p className="settings-hint">
            açıkken ipler onda: sana görev verir, ne yapacağını ve ne zaman duracağını o söyler.
          </p>
          <button
            type="button"
            role="switch"
            aria-checked={lead}
            className={`lead-toggle${lead ? ' on' : ''}`}
            onClick={toggleLead}
          >
            {lead ? 'açık' : 'kapalı'}
          </button>
        </div>

        <div className="settings-section">
          <p className="settings-label">hafıza</p>
          <p className="settings-hint">
            yaşadıklarınızı bu telefonda tutar; "sil" sohbeti temizlese de o seni unutmaz.
          </p>
          <button type="button" className="memory-wipe" onClick={wipeMemory} disabled={memoryWiped}>
            {memoryWiped ? 'silindi' : 'hafızayı sil'}
          </button>
        </div>
      </div>
    </div>
  )
}
