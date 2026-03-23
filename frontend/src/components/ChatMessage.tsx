import type { Message } from '../store/chatStore'

interface Props {
  msg: Message
}

const agentLabel: Record<string, string> = {
  counseling: '상담',
  crisis: '위기지원',
  triage: '분석',
}

export default function ChatMessage({ msg }: Props) {
  const isUser = msg.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* 아바타 */}
      {!isUser && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-1
          ${msg.agent === 'crisis' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
          {msg.agent === 'crisis' ? '🆘' : '🌿'}
        </div>
      )}

      <div className={`max-w-[75%] space-y-1 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* 에이전트 레이블 */}
        {!isUser && msg.agent && (
          <span className="text-xs text-slate-400 px-1">
            {agentLabel[msg.agent] ?? msg.agent}
            {msg.risk_level !== undefined && msg.risk_level > 0 && (
              <span className={`ml-2 font-medium ${msg.risk_level >= 7 ? 'text-red-500' : 'text-slate-400'}`}>
                위험도 {msg.risk_level}
              </span>
            )}
          </span>
        )}

        {/* 말풍선 */}
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
          ${isUser
            ? 'bg-emerald-600 text-white rounded-tr-sm'
            : msg.agent === 'crisis'
              ? 'bg-red-50 border border-red-200 text-slate-800 rounded-tl-sm'
              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
          }`}>
          {msg.content}
        </div>

        <span className="text-xs text-slate-400 px-1">
          {msg.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}
