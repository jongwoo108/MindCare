import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { sessionsApi } from '../api/sessions'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { useChat } from '../hooks/useChat'
import ChatMessage from '../components/ChatMessage'

export default function ChatPage() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const { messages, sessionId, isConnected, isThinking, setSession, reset } = useChatStore()
  const { send } = useChat(sessionId)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // 세션 생성
  useEffect(() => {
    sessionsApi.create().then((res) => setSession(res.data.id))
    return () => reset()
  }, [])

  // 스크롤 유지
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  const handleSend = () => {
    const content = input.trim()
    if (!content || !isConnected || isThinking) return
    send(content)
    setInput('')
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌿</span>
          <span className="font-semibold text-slate-800">MindCare AI</span>
          <span className={`w-2 h-2 rounded-full ml-2 ${isConnected ? 'bg-emerald-400' : 'bg-slate-300'}`} />
        </div>
        <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-slate-700">
          로그아웃
        </button>
      </header>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 mt-20 space-y-2">
            <div className="text-4xl">💬</div>
            <p className="text-sm">안녕하세요. 오늘 어떤 이야기를 나눠볼까요?</p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} msg={msg} />
        ))}

        {isThinking && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm shrink-0">
              🌿
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 shrink-0">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="메시지를 입력하세요... (Enter로 전송)"
            rows={1}
            className="flex-1 resize-none px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={handleSend}
            disabled={!isConnected || isThinking || !input.trim()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-colors"
          >
            전송
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">
          이 서비스는 전문적인 의료 서비스를 대체하지 않습니다.
        </p>
      </div>
    </div>
  )
}
