import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { sessionsApi } from '../api/sessions'
import { assessmentApi, type FollowUpRecommendation } from '../api/assessment'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { useChat } from '../hooks/useChat'
import ChatMessage from '../components/ChatMessage'
import AssessmentModal from '../components/AssessmentModal'
import FollowUpModal from '../components/FollowUpModal'
import MatchNotification from '../components/MatchNotification'

export default function ChatPage() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const { messages, sessionId, isConnected, isThinking, setSession, addMessage, reset } = useChatStore()
  const { send } = useChat(sessionId)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const [showAssessment, setShowAssessment] = useState(false)
  const [isGreeting, setIsGreeting] = useState(false)
  const [followUpQueue, setFollowUpQueue] = useState<FollowUpRecommendation[]>([])
  const [showMatchNotification, setShowMatchNotification] = useState(true)

  useEffect(() => {
    sessionsApi.create().then((res) => {
      setSession(res.data.id)
      setShowAssessment(true)
    })
    return () => reset()
  }, [])

  const handleAssessmentComplete = useCallback(async () => {
    setShowAssessment(false)
    if (!sessionId) return
    setIsGreeting(true)
    try {
      const res = await assessmentApi.greeting(sessionId)
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: res.data.content,
        agent: 'counseling',
        timestamp: new Date(),
      })
      if (res.data.follow_ups?.length > 0) {
        setFollowUpQueue(res.data.follow_ups)
      }
    } catch {
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '안녕하세요. 설문에 응해 주셔서 감사합니다. 오늘 어떤 이야기를 나눠볼까요?',
        agent: 'counseling',
        timestamp: new Date(),
      })
    } finally {
      setIsGreeting(false)
    }
  }, [sessionId, addMessage])

  const handleFollowUpComplete = useCallback((updatedRisk: number) => {
    const current = followUpQueue[0]
    setFollowUpQueue(q => q.slice(1))
    const typeLabels: Record<string, string> = {
      crisis_detailed: '안전 확인 검사',
      phq_extended: '우울 심화 검사',
      gad_extended: '불안 심화 검사',
    }
    const riskLabel =
      updatedRisk >= 9 ? '즉각적인 도움이 필요한 상태' :
      updatedRisk >= 7 ? '상당히 힘드신 상태' :
      updatedRisk >= 4 ? '주의가 필요한 상태' :
      '비교적 안정적인 상태'
    addMessage({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `${typeLabels[current?.type] ?? '심화 검사'} 결과를 확인했습니다. 전반적으로 ${riskLabel}로 보입니다. 지금 느끼시는 감정이나 상황에 대해 더 이야기해 주시겠어요?`,
      agent: 'counseling',
      timestamp: new Date(),
    })
  }, [followUpQueue, addMessage])

  const handleFollowUpSkip = useCallback(() => {
    setFollowUpQueue(q => q.slice(1))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking, isGreeting])

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
    <div className="flex flex-col h-screen bg-[#0d1420]">
      {showAssessment && sessionId && (
        <AssessmentModal sessionId={sessionId} onComplete={handleAssessmentComplete} />
      )}
      {!showAssessment && !isGreeting && followUpQueue.length > 0 && sessionId && (
        <FollowUpModal
          sessionId={sessionId}
          recommendation={followUpQueue[0]}
          onComplete={handleFollowUpComplete}
          onSkip={handleFollowUpSkip}
        />
      )}
      {!showAssessment && followUpQueue.length === 0 && showMatchNotification && (
        <MatchNotification onDismiss={() => setShowMatchNotification(false)} />
      )}

      {/* 헤더 */}
      <header className="bg-[#0d1420]/95 backdrop-blur-sm border-b border-white/[0.05] px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-sm">
            🌙
          </div>
          <span className="font-medium text-slate-300 text-sm">MindCare AI</span>
          <span className={`w-1.5 h-1.5 rounded-full transition-colors ${isConnected ? 'bg-indigo-400' : 'bg-slate-700'}`} />
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
        >
          나가기
        </button>
      </header>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {messages.length === 0 && !isGreeting && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center pb-20">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-xl">
              🌙
            </div>
            <p className="text-sm text-slate-500">잠시 후 상담이 시작됩니다</p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} msg={msg} />
        ))}

        {/* 타이핑 인디케이터 (greeting / thinking 공용) */}
        {(isGreeting || isThinking) && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center text-sm shrink-0 mt-1">
              🌙
            </div>
            <div className="bg-[#111927] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.18}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <div className="bg-[#0d1420]/95 backdrop-blur-sm border-t border-white/[0.05] px-4 py-4 shrink-0">
        <div className="flex gap-2.5 max-w-2xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="오늘 어떤 이야기를 나눠볼까요..."
            rows={1}
            disabled={!isConnected || showAssessment || followUpQueue.length > 0}
            className="flex-1 resize-none px-4 py-2.5 bg-[#1a2535] border border-white/[0.08] rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-colors disabled:opacity-30"
          />
          <button
            onClick={handleSend}
            disabled={!isConnected || isThinking || !input.trim() || showAssessment || followUpQueue.length > 0}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-xl text-sm font-medium transition-colors shrink-0"
          >
            전송
          </button>
        </div>
        <p className="text-center text-xs text-slate-700 mt-2.5">
          이 서비스는 전문적인 의료 서비스를 대체하지 않습니다.
        </p>
      </div>
    </div>
  )
}
