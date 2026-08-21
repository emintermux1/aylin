import { useState } from 'react'

interface ComposerProps {
  disabled: boolean
  onSend: (text: string) => void
}

/** Bare notes-field composer: hairline top border, no pill, quiet send. */
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
        placeholder="yaz..."
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
        gönder
      </button>
    </form>
  )
}
