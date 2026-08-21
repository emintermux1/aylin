import { useState } from 'react'
import { useCurrentPfp } from '../lib/pfp'

interface AvatarProps {
  size: number
  className?: string
}

/**
 * Asya's profile photo — rotates hourly through /asya.jpg + /pfp/1-6.jpg
 * (same photo everywhere at a given hour), with a quiet serif-monogram
 * fallback if the current file is missing.
 */
export function Avatar({ size, className }: AvatarProps) {
  const src = useCurrentPfp()
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null)
  const cls = className ? `avatar ${className}` : 'avatar'
  if (brokenSrc === src) {
    return (
      <div className={`${cls} avatar-fallback`} style={{ width: size, height: size }} aria-hidden>
        a
      </div>
    )
  }
  return (
    <img
      className={cls}
      src={src}
      alt="Asya"
      width={size}
      height={size}
      onError={() => setBrokenSrc(src)}
    />
  )
}
