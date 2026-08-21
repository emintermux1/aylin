import { useEffect, useState } from 'react'

/**
 * Hourly-rotating profile photo. One clock hour → one photo, the same
 * everywhere it appears (header avatar, profile sheet, favicon). All of them
 * are Asya — different nights, different looks.
 */
export const PFP_LIST: readonly string[] = [
  '/asya.jpg',
  '/pfp/1.jpg',
  '/pfp/2.jpg',
  '/pfp/3.jpg',
  '/pfp/4.jpg',
  '/pfp/5.jpg',
  '/pfp/6.jpg',
]

const HOUR_MS = 3_600_000
/** Re-check every minute so the photo flips on the hour without a refresh. */
const RECHECK_MS = 60_000

export function currentPfp(now: number = Date.now()): string {
  return PFP_LIST[Math.floor(now / HOUR_MS) % PFP_LIST.length]
}

export function useCurrentPfp(): string {
  const [src, setSrc] = useState(() => currentPfp())
  useEffect(() => {
    const timer = window.setInterval(() => setSrc(currentPfp()), RECHECK_MS)
    return () => window.clearInterval(timer)
  }, [])
  return src
}

/** Keeps the tab icons on the same hourly rotation as the avatars. */
export function syncFavicon(src: string): void {
  for (const rel of ['icon', 'apple-touch-icon']) {
    const link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
    if (link !== null) link.href = src
  }
}
