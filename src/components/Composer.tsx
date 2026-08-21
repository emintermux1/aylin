import { useRef, useState } from 'react'
import { fileToCompressedDataUrl } from '../lib/attach'

interface ComposerProps {
  onSend: (text: string) => void
  onSendPhoto: (src: string, caption: string) => void
}

/**
 * WhatsApp-style attach: pick a photo, it sits as a preview, he types a
 * caption, then send. Empty caption still sends the frame.
 */
export function Composer({ onSend, onSendPhoto }: ComposerProps) {
  const [text, setText] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [attaching, setAttaching] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const submit = () => {
    const clean = text.trim()
    if (pending !== null) {
      const src = pending
      setPending(null)
      setText('')
      onSendPhoto(src, clean)
      return
    }
    if (clean.length === 0) return
    setText('')
    onSend(clean)
  }

  const pickPhoto = async (file: File) => {
    setAttaching(true)
    const src = (await fileToCompressedDataUrl(file)) ?? URL.createObjectURL(file)
    setAttaching(false)
    setPending(src)
  }

  const canSend = pending !== null || text.trim().length > 0

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {pending !== null && (
        <div className="attach-preview">
          <img src={pending} alt="" />
          <button
            type="button"
            className="attach-clear"
            onClick={() => setPending(null)}
            aria-label="Fotoğrafı kaldır"
          >
            ×
          </button>
        </div>
      )}
      <div className="composer-row">
        <input
          ref={fileRef}
          className="attach-input"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file !== undefined) void pickPhoto(file)
          }}
        />
        <button
          type="button"
          className="attach-btn"
          onClick={() => fileRef.current?.click()}
          disabled={attaching}
          aria-label="Fotoğraf ekle"
        >
          {attaching ? '…' : '+'}
        </button>
        <input
          className="composer-input"
          type="text"
          value={text}
          placeholder={pending !== null ? 'yorum yaz...' : 'yaz...'}
          enterKeyHint="send"
          autoComplete="off"
          maxLength={600}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="send-btn" disabled={!canSend} aria-label="Gönder">
          gönder
        </button>
      </div>
    </form>
  )
}
