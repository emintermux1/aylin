/**
 * Tiny client-side flavor bits. NOT a reply corpus — all chat content comes
 * from Grok. These only cover the instant pre-reply beat and the in-character
 * connection-error line shown when the API fails after all retries.
 */

const BEATS: readonly string[] = [
  'dur',
  'bi sn',
  'off',
  'mmm',
  'bekle...',
  'dur dur dur',
  'offff',
  'hmm',
  'geldim',
  'sus şimdi',
]

const CONNECTION_LINES: readonly string[] = [
  'bağlantı koptu... yine yaz',
  'of telefon çekmiyo galiba... bi daha yaz',
  'mesajın düştü sanki... tekrar at',
]

let lastBeat = ''
let lastConnection = ''

function pickDifferent(pool: readonly string[], last: string): string {
  const from = pool.filter((v) => v !== last)
  return from[Math.floor(Math.random() * from.length)]
}

export function instantBeat(): string {
  lastBeat = pickDifferent(BEATS, lastBeat)
  return lastBeat
}

export function connectionLine(): string {
  lastConnection = pickDifferent(CONNECTION_LINES, lastConnection)
  return lastConnection
}
