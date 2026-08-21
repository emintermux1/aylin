/**
 * Hard safety guard, shared by the client (instant local check) and the
 * serverless API (authoritative check before any model call).
 *
 * AYLIN is a 21+ adult-fiction app. Any mention of minors, school/teen
 * settings or ages under 21 is refused in-character and steered back to
 * adult play. This guard runs on top of the locked system prompt.
 */

const MINOR_PATTERNS: RegExp[] = [
  // Any age below 21 next to a Turkish "yaş" form: "17 yaşında", "20 yas"...
  /\b(?:[1-9]|1[0-9]|20)\s*(?:yaş|yas)(?:[ıi]nda(?:y[ıi]m)?|[ıi]na|[ıi]ndaki)?\b/,
  // "16'lık", "18lik" slang age forms
  /\b(?:1[0-8]|[1-9])\s*'?l[iı]k\b/,
  // School / teen coded Turkish
  /l[iı]sel[iı]|okullu/,
  /\bl[iı]se(?:de|ye|den|n[iı]n|l[iı])?\b/,
  /\bokul(?:da|a|dan|un|u)?\b/,
  /öğrenc[iı]|ogrenc[iı]/,
  /çocuk|cocuk|çoçuk/,
  /reş[iı]t\s*değ[iı]l|res[iı]t\s*deg[iı]l|reş[iı]t\s*olmayan/,
  /\bergen\w*/,
  // English equivalents
  /\bminors?\b|underage|\bteen\w*\b|high\s*school|schoolgirl|schoolboy|jailbait|\bloli\b|\bshota\b|\bchild\b|\bkids?\b/,
]

/**
 * Turkish casing is tricky (İ/i, I/ı differ from ASCII), so the text is
 * lowercased with both the default and the Turkish locale and patterns are
 * written in lowercase with [iı] classes where needed.
 */
export function hasMinorContent(text: string): boolean {
  const variants = [text.toLowerCase(), text.toLocaleLowerCase('tr-TR')]
  return MINOR_PATTERNS.some((re) => variants.some((v) => re.test(v)))
}

const REFUSALS: string[] = [
  'dur. orada dur. benim dünyamda herkes yetişkin — 21 yaş altı kimse yok, olmadı, olmayacak. bu çizgiyi tartışmam bile.\n\nşimdi bana dön... burada sadece ikimiz varız ve ikimiz de kocaman yetişkiniz. söyle: otel mi, balkon mu? 😏',
  'hayır. küçüklerle, okulla, o tarz şeylerle ilgili tek kelime daha yazma — ben sadece yetişkinlerle oynarım, nokta.\n\nkonuyu değiştiriyorum: bu gece seni İstanbul’da bir yere kaçırıyorum. neresi olsun? 😏',
]

export function pickRefusal(): string {
  return REFUSALS[Math.floor(Math.random() * REFUSALS.length)]
}
