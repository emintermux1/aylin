/**
 * Tiny client-side flavor bits. NOT a reply corpus — all chat content comes
 * from Grok. This module only covers the in-character connection-error line
 * shown when the API fails after all retries; the adaptive pre-reply beats
 * live in beats.ts.
 */

const CONNECTION_LINES: readonly string[] = [
  'bağlantı koptu... yine yaz',
  'of telefon çekmiyo galiba... bi daha yaz',
  'mesajın düştü sanki... tekrar at',
]

let lastConnection = ''

export function connectionLine(): string {
  const from = CONNECTION_LINES.filter((v) => v !== lastConnection)
  lastConnection = from[Math.floor(Math.random() * from.length)]
  return lastConnection
}
