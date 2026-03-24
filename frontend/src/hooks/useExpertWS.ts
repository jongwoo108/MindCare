import { useRef, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { useExpertStore } from '../store/expertStore'
import type { ReviewItem } from '../api/expert'

export function useExpertWS() {
  const ws = useRef<WebSocket | null>(null)
  const { token } = useAuthStore()
  const { addToQueue, setPendingCount, setConnected } = useExpertStore()

  const connect = useCallback(() => {
    if (!token || ws.current?.readyState === WebSocket.OPEN) return

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${proto}://${window.location.host}/ws/expert?token=${token}`
    ws.current = new WebSocket(url)

    ws.current.onopen = () => setConnected(true)
    ws.current.onclose = () => setConnected(false)

    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data)

      if (data.type === 'connected') {
        setPendingCount(data.pending_count ?? 0)
        return
      }

      if (data.type === 'high_risk_alert') {
        // 서버 payload를 ReviewItem 형태로 변환
        const item: ReviewItem = {
          id: data.review_id,
          session_id: data.session_id,
          user_id: data.user_id,
          risk_level: data.risk_level,
          risk_factors: data.risk_factors ?? [],
          ai_response: data.ai_response,
          context_summary: data.context_summary ?? null,
          status: 'pending',
          created_at: new Date().toISOString(),
        }
        addToQueue(item)
        return
      }

      if (data.type === 'pong') return
    }
  }, [token, addToQueue, setPendingCount, setConnected])

  // 연결 유지 ping
  useEffect(() => {
    connect()
    const interval = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30_000)
    return () => {
      clearInterval(interval)
      ws.current?.close()
    }
  }, [connect])
}
