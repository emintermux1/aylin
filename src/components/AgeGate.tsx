import { Avatar } from './Avatar'

interface AgeGateProps {
  onAccept: () => void
}

export function AgeGate({ onAccept }: AgeGateProps) {
  return (
    <div className="gate">
      <div className="gate-card">
        <div className="gate-avatar">
          <Avatar size={88} />
        </div>
        <h1 className="gate-brand">AYLIN</h1>
        <div className="gate-badge">21+</div>
        <p className="gate-text">
          Bu uygulama yetişkinlere özel, açık sözlü kurgusal sohbet içerir. Devam etmek için{' '}
          <strong>21 yaşından büyük</strong> olmalısın.
        </p>
        <p className="gate-small">
          Aylin kurgusal bir karakterdir (24, İstanbul). Tüm senaryolar ve görseller kurgudur ve
          yalnızca yetişkinler arasındadır.
        </p>
        <button type="button" className="gate-accept" onClick={onAccept}>
          21 yaşından büyüğüm — içeri gir
        </button>
        <button
          type="button"
          className="gate-leave"
          onClick={() => {
            window.location.replace('https://www.google.com')
          }}
        >
          değilim, çık
        </button>
      </div>
    </div>
  )
}
