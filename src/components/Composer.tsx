import { useState } from 'react'

interface ComposerProps {
  disabled: boolean
  onSend: (text: string) => void
}

export function Composer({ disabled, onSend }: ComposerProps) {
  const [text, setText] = useState('')

  const submit = () => {
    const clean = text.trim()
    if (clean.length === 0 || disabled) return
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
        placeholder="yaz bana..."
        enterKeyHint="send"
        autoComplete="off"
        maxLength={600}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="submit"
        className="send-btn"
        disabled={disabled || text.trim().length === 0}
        aria-label="Gönder"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path d="M12 20V6M6 12l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </form>
  )
}
