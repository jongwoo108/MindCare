import { useMemo } from 'react'

interface Star {
  id: number
  x: number
  y: number       // % — within sky only (top 55%)
  size: number
  opacity: number
  duration: number
  delay: number
  bright: boolean // occasional bright star
}

function seededRand(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

export default function StarField({ count = 220 }: { count?: number }) {
  const stars = useMemo<Star[]>(() => {
    const r = seededRand(137)
    return Array.from({ length: count }, (_, i) => {
      const bright = r() > 0.93   // ~7% are brighter
      return {
        id: i,
        x: r() * 100,
        y: r() * 52,               // keep in sky area
        size: bright ? r() * 2 + 1.5 : r() * 1.2 + 0.4,
        opacity: bright ? r() * 0.3 + 0.7 : r() * 0.45 + 0.25,
        duration: r() * 4 + 2,
        delay: r() * 6,
        bright,
      }
    })
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
            backgroundColor: s.bright ? '#fffae8' : '#ddeeff',
            opacity: s.opacity,
            '--star-opacity': s.opacity,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
            boxShadow: s.bright ? `0 0 ${s.size * 2}px rgba(255,248,220,0.6)` : 'none',
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
