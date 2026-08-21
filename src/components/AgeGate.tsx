interface AgeGateProps {
  onAccept: () => void
}

/**
 * Full-bleed asya.jpg behind a dark veil + film grain. Late-night private
 * note, not a corporate consent card.
 */
export function AgeGate({ onAccept }: AgeGateProps) {
  return (
    <div className="gate">
      <img className="gate-photo" src="/asya.jpg" alt="" aria-hidden />
      <div className="gate-veil" />
      <div className="gate-body">
        <p className="gate-kicker">gece için</p>
        <h1 className="gate-name">asya</h1>
        <p className="gate-meta">24 · istanbul · kurgu</p>
        <p className="gate-text">
          buradaki her şey yetişkinlere yazılmış, açık sözlü bir kurgu. girmek için 21 yaşından
          büyük olman gerekiyor.
        </p>
        <button type="button" className="gate-accept" onClick={onAccept}>
          21 yaşından büyüğüm — gir
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
        <p className="gate-fine">
          asya kurgusal bir karakterdir. tüm senaryolar ve görseller kurgudur, yalnızca
          yetişkinler (21+) arasındadır.
        </p>
      </div>
    </div>
  )
}
