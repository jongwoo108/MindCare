import type { Message } from '../store/chatStore'
import RiskBadge from './RiskBadge'

interface Props {
  msg: Message
  showQuickReplies?: boolean
  onQuickReply?: (text: string) => void
}

const agentLabel: Record<string, string> = {
  counseling: '상담사',
  crisis: '위기지원',
  triage: '분석',
}

export default function ChatMessage({ msg, showQuickReplies, onQuickReply }: Props) {
  const isUser = msg.role === 'user'
  const isCrisis = msg.agent === 'crisis'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* 아바타 */}
      {!isUser && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-1 border
          ${isCrisis
            ? 'bg-red-950/40 border-red-900/30 text-red-300'
            : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
          }`}>
          {isCrisis ? '🆘' : '🌙'}
        </div>
      )}

      <div className={`max-w-[75%] space-y-1 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* 에이전트 레이블 + 뱃지 */}
        {!isUser && msg.agent && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs text-slate-600">{agentLabel[msg.agent] ?? msg.agent}</span>
            {msg.risk_level !== undefined && msg.risk_level >= 4 && (
              <RiskBadge level={msg.risk_level} />
            )}
          </div>
        )}

        {/* 말풍선 */}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
          ${isUser
            ? 'bg-indigo-900/70 backdrop-blur-sm text-indigo-100 rounded-tr-sm border border-indigo-700/40'
            : isCrisis
              ? 'bg-red-950/50 backdrop-blur-sm border border-red-900/30 text-red-200 rounded-tl-sm'
              : 'bg-slate-900/60 backdrop-blur-sm border border-white/[0.09] text-slate-200 rounded-tl-sm'
          }`}>
          {msg.content}
        </div>

        <span className="text-xs text-slate-700 px-1">
          {msg.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </span>

        {/* Quick reply chips */}
        {showQuickReplies && msg.quick_replies && msg.quick_replies.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {msg.quick_replies.map((reply) => (
              <button
                key={reply}
                onClick={() => onQuickReply?.(reply)}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-indigo-500/35 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-400/50 transition-all backdrop-blur-sm"
              >
                {reply}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
