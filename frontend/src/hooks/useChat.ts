import { useRef, useCallback, useEffect } from 'react'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'

export function useChat(sessionId: string | null) {
  const ws = useRef<WebSocket | null>(null)
  const { token } = useAuthStore()
  const { addMessage, setConnected, setThinking } = useChatStore()

  const connect = useCallback(() => {
    if (!sessionId || !token || ws.current?.readyState === WebSocket.OPEN) return

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${proto}://${window.location.host}/ws/chat/${sessionId}?token=${token}`
    ws.current = new WebSocket(url)

    ws.current.onopen = () => setConnected(true)
    ws.current.onclose = () => setConnected(false)

    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data)

      if (data.type === 'risk_alert') {
        // 위기 알림은 별도 처리 (메시지 내용에 포함됨)
        return
      }
      if (data.type === 'pong') return

      setThinking(false)
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content,
        agent: data.metadata?.agent,
        risk_level: data.metadata?.risk_level,
        therapeutic_approach: data.metadata?.therapeutic_approach,
        safety_flags: data.metadata?.safety_flags,
        crisis_escalated: data.metadata?.crisis_escalated,
        quick_replies: data.quick_replies,
        timestamp: new Date(),
      })
    }
  }, [sessionId, token, addMessage, setConnected, setThinking])

  const send = useCallback((content: string) => {
    if (ws.current?.readyState !== WebSocket.OPEN) return
    setThinking(true)
    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    })
    ws.current.send(JSON.stringify({ type: 'message', content }))
  }, [addMessage, setThinking])

  useEffect(() => {
    connect()
    return () => ws.current?.close()
  }, [connect])

  return { send }
}
