import type { FantasyId } from '../lib/types'

export interface ChipDef {
  id: FantasyId
  label: string
  userLine: string
}

export const CHIPS: ChipDef[] = [
  { id: 'otel', label: 'otel', userLine: 'otel ayarla. bu gece.' },
  { id: 'dus', label: 'duş', userLine: 'duşa gir, kapıyı kitleme' },
  { id: 'balkon', label: 'balkon', userLine: 'balkona çık' },
  { id: 'taksi', label: 'taksi', userLine: 'taksiye bin, arka koltuk' },
  { id: 'ofis', label: 'ofis', userLine: 'ofiste kal bu akşam' },
  { id: 'sesli', label: 'sesli', userLine: 'sesli at' },
]

interface ChipsProps {
  disabled: boolean
  onPick: (chip: ChipDef) => void
}

/** Tiny underlined text triggers, not candy pills. */
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
