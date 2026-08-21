import { useState } from 'react'

interface ComposerProps {
  onSend: (text: string) => void
}

/**
 * Bare notes-field composer: hairline top border, no pill, quiet send.
 * Never locks — he can fire the next message while her burst is still
 * arriving, like a real chat.
 */
export function Composer({ onSend }: ComposerProps) {
  const [text, setText] = useState('')

  const submit = () => {
    const clean = text.trim()
    if (clean.length === 0) return
    setText('')
    onSend(clean)
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
