import { useState } from 'react'
import { dailyChips, type ChipDef } from '../lib/chips'

interface ChipsProps {
  onPick: (chip: ChipDef) => void
}

/**
 * Tiny underlined text triggers, not candy pills. Never locked, like the
 * composer. The row shows devam + a rotating daily subset of scene chips +
 * sesli (8 total) — the full catalog stays reachable across days.
 */
export function Chips({ onPick }: ChipsProps) {
  const [chips] = useState(dailyChips)
  return (
    <div className="chips" role="toolbar" aria-label="Fanteziler">
      {chips.map((chip) => (
        <button key={chip.id} type="button" className="chip" onClick={() => onPick(chip)}>
          {chip.label}
        </button>
      ))}
    </div>
  )
}
