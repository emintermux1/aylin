import type { FantasyId } from '../lib/types'

export interface ChipDef {
  id: FantasyId
  label: string
  userLine: string
}

export const CHIPS: ChipDef[] = [
  { id: 'otel', label: 'OTEL', userLine: 'bu gece otel...' },
  { id: 'dus', label: 'DUŞ', userLine: 'duştasın şu an dimi' },
  { id: 'balkon', label: 'BALKON', userLine: 'balkona çık hava güzel' },
  { id: 'taksi', label: 'TAKSİ', userLine: 'taksideyiz arka koltuk...' },
  { id: 'ofis', label: 'OFİS', userLine: 'ofiste geç saat ikimiz kaldık' },
  { id: 'sesli', label: 'SESLİ', userLine: 'bana sesli at 🎙️' },
]

interface ChipsProps {
  disabled: boolean
  onPick: (chip: ChipDef) => void
}

export function Chips({ disabled, onPick }: ChipsProps) {
  return (
    <div className="chips" role="toolbar" aria-label="Fanteziler">
      {CHIPS.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className="chip"
          disabled={disabled}
          onClick={() => onPick(chip)}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
