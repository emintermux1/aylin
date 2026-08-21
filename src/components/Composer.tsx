import { useRef, useState } from 'react'
import { fileToCompressedDataUrl } from '../lib/attach'

interface ComposerProps {
  onSend: (text: string) => void
  onSendPhoto: (src: string, caption: string) => void
}

/**
 * Bare notes-field composer: hairline top border, no pill, quiet send.
 * Never locks — he can fire the next message while her burst is still
 * arriving, like a real chat. The "+" attaches a photo; whatever is typed
 * rides along as its caption.
 */
export function Composer({ onSend, onSendPhoto }: ComposerProps) {
  const [text, setText] = useState('')
  const [attaching, setAttaching] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const submit = () => {
    const clean = text.trim()
    if (clean.length === 0) return
    setText('')
    onSend(clean)
  }

  const attachPhoto = async (file: File) => {
    setAttaching(true)
    // Compressed data URL survives refreshes; the object URL is a last resort
    // (storage drops it on the next load instead of showing a broken frame).
    const src = (await fileToCompressedDataUrl(file)) ?? URL.createObjectURL(file)
    setAttaching(false)
    const caption = text.trim()
    setText('')
    onSendPhoto(src, caption)
  }

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <input
        ref={fileRef}
        className="attach-input"
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file !== undefined) void attachPhoto(file)
        }}
      />
      <button
        type="button"
        className="attach-btn"
        onClick={() => fileRef.current?.click()}
        disabled={attaching}
        aria-label="Fotoğraf gönder"
      >
        {attaching ? '…' : '+'}
      </button>
      <input
        className="composer-input"
        type="text"
        value={text}
        placeholder="yaz..."
        enterKeyHint="send"
        autoComplete="off"
        maxLength={600}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="submit"
        className="send-btn"
        disabled={text.trim().length === 0}
        aria-label="Gönder"
      >
        gönder
      </button>
    </form>
  )
}
