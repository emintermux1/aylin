/**
 * Turkish-tolerant text folding for keyword matching: lowercases with the
 * Turkish locale and strips diacritics, so "GÖĞSÜNÜ", "gogsunu" and "göğsünü"
 * all land on the same ascii form. Patterns elsewhere are written against
 * this folded form.
 */
export function foldTr(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
}

/** Folded text with punctuation removed and whitespace collapsed, for exact-phrase matching. */
export function normalizePhrase(text: string): string {
  return foldTr(text)
    .replace(/[.,!?…:;"'()-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
