import { useState, useEffect } from 'react'

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

export interface TimeState {
  period: TimeOfDay
  hour: number
}

function getPeriod(hour: number): TimeOfDay {
  if (hour >= 6  && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

export function useTimeOfDay(): TimeState {
  const [state, setState] = useState<TimeState>(() => {
    const h = new Date().getHours()
    return { period: getPeriod(h), hour: h }
  })

  useEffect(() => {
    // 매 분마다 체크 (시간대 전환 감지)
    const id = setInterval(() => {
      const h = new Date().getHours()
      setState(prev => {
        const next = getPeriod(h)
        return prev.period === next && prev.hour === h ? prev : { period: next, hour: h }
      })
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  return state
}
