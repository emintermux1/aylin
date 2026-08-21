import type { FantasyId } from '../lib/types'

export interface ChipDef {
  id: FantasyId
  label: string
  userLine: string
}

export const CHIPS: ChipDef[] = [
  // Director hand-over: she advances the scene one beat herself, no typing needed.
  { id: 'devam', label: 'devam', userLine: 'devam' },
  { id: 'otel', label: 'otel', userLine: 'otel ayarla. bu gece.' },
  { id: 'dus', label: 'duş', userLine: 'duşa gir, kapıyı kitleme' },
  { id: 'balkon', label: 'balkon', userLine: 'balkona çık' },
  { id: 'taksi', label: 'taksi', userLine: 'taksiye bin, arka koltuk' },
  { id: 'ofis', label: 'ofis', userLine: 'ofiste kal bu akşam' },
  { id: 'sesli', label: 'sesli', userLine: 'sesli at' },
]

interface ChipsProps {
  onPick: (chip: ChipDef) => void
}

/** Tiny underlined text triggers, not candy pills. Never locked, like the composer. */
export function Chips({ onPick }: ChipsProps) {
  return (
    <div className="chips" role="toolbar" aria-label="Fanteziler">
      {CHIPS.map((chip) => (
        <button key={chip.id} type="button" className="chip" onClick={() => onPick(chip)}>
          {chip.label}
        </button>
      ))}
    </div>
  )
}
