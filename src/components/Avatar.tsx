import { useState } from 'react'

interface AvatarProps {
  size: number
  className?: string
}

/** Aylin's avatar with a graceful gradient-monogram fallback if the jpg is missing. */
export function Avatar({ size, className }: AvatarProps) {
  const [broken, setBroken] = useState(false)
  const cls = className ? `avatar ${className}` : 'avatar'
  if (broken) {
    return (
      <div className={`${cls} avatar-fallback`} style={{ width: size, height: size }} aria-hidden>
        A
      </div>
    )
  }
  return (
    <img
      className={cls}
      src="/aylin.jpg"
      alt="Aylin"
      width={size}
      height={size}
      onError={() => setBroken(true)}
    />
  )
}
