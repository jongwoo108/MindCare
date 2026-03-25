import { useMemo } from 'react'

interface Star {
  id: number
  x: number   // % from left
  y: number   // % from top (within sky area — 0..52%)
  size: number
  opacity: number
  duration: number
  delay: number
}

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

export default function StarField({ count = 180 }: { count?: number }) {
  const stars = useMemo<Star[]>(() => {
    const rand = seededRandom(42)
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: rand() * 100,
      y: rand() * 50,          // keep within sky (top 52%)
      size: rand() * 1.6 + 0.4, // 0.4 – 2px
      opacity: rand() * 0.6 + 0.4,
      duration: rand() * 3 + 2, // 2–5s twinkle
      delay: rand() * 5,
    }))
  }, [count])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full animate-star-twinkle"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            backgroundColor: '#fff',
            opacity: s.opacity,
            '--star-opacity': s.opacity,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
