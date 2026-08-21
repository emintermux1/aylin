import { useState } from 'react'

interface AvatarProps {
  size: number
  className?: string
}

/** Asya's photo (public/asya.jpg) with a quiet serif-monogram fallback. */
export function Avatar({ size, className }: AvatarProps) {
  const [broken, setBroken] = useState(false)
  const cls = className ? `avatar ${className}` : 'avatar'
  if (broken) {
    return (
      <div className={`${cls} avatar-fallback`} style={{ width: size, height: size }} aria-hidden>
        a
      </div>
    )
  }
  return (
    <img
      className={cls}
      src="/asya.jpg"
      alt="Asya"
      width={size}
      height={size}
      onError={() => setBroken(true)}
    />
  )
}
