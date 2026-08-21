/**
 * Local-only relationship memory: a compact rolling digest of what Emin and
 * Asya said, folded after every successful reply and sent with every chat
 * request so she remembers earlier nights — what he likes, what she promised,
 * pet names, running bits, his hours. No accounts, no server storage, no
 * extra model calls: concatenate + trim, one browser, one relationship.
 *
 * Clearing the chat ("sil") does NOT touch this — she doesn't forget him.
 * The only wipe lives in the settings sheet.
 */

const MEMORY_KEY = 'asya.memory.v1'

/** Keeps the digest prompt-sized; the oldest exchanges fall off first. */
const MAX_MEMORY_CHARS = 2800
const MAX_USER_SNIPPET = 180
const MAX_ASYA_SNIPPET = 220

export function loadMemory(): string {
  try {
    return localStorage.getItem(MEMORY_KEY) ?? ''
  } catch {
    return ''
  }
}

function saveMemory(memory: string): void {
  try {
    localStorage.setItem(MEMORY_KEY, memory)
  } catch {
    /* private mode or storage full — she just remembers less */
  }
}

export function clearMemory(): void {
  try {
    localStorage.removeItem(MEMORY_KEY)
  } catch {
    /* ignore */
  }
}

function snippet(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`
}

/** "21.08 03:12" — time of day is a durable fact she shapes herself around. */
function stamp(at: number): string {
  const d = new Date(at)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Folds one exchange into the digest. Entries are line-based so trimming
 * always drops whole exchanges, never cuts one mid-line.
 */
export function foldMemoryTurn(userText: string, asyaText: string): void {
  const entry = `[${stamp(Date.now())}] emin: ${snippet(userText, MAX_USER_SNIPPET)} | asya: ${snippet(asyaText, MAX_ASYA_SNIPPET)}`
  const lines = loadMemory()
    .split('\n')
    .filter((line) => line.trim().length > 0)
  lines.push(entry)
  while (lines.join('\n').length > MAX_MEMORY_CHARS && lines.length > 1) {
    lines.shift()
  }
  saveMemory(lines.join('\n'))
}
