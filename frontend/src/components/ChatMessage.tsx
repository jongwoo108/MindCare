import type { Message } from '../store/chatStore'
import type { SceneTheme } from '../scene/sceneTheme'
import RiskBadge from './RiskBadge'

interface Props {
  msg: Message
  theme: SceneTheme
  showQuickReplies?: boolean
  onQuickReply?: (text: string) => void
}

const agentLabel: Record<string, string> = {
  counseling: '상담사',
  crisis: '위기지원',
  triage: '분석',
}

export default function ChatMessage({ msg, theme, showQuickReplies, onQuickReply }: Props) {
  const isUser = msg.role === 'user'
  const isCrisis = msg.agent === 'crisis'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* 아바타 */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-1 border bg-white/10 border-white/20">
          {isCrisis ? '🆘' : '🌙'}
        </div>
      )}

      <div className={`max-w-[75%] space-y-1 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* 에이전트 레이블 + 뱃지 */}
        {!isUser && msg.agent && (
          <div className="flex items-center gap-2 px-1">
            <span className={`text-xs ${theme.sub}`}>{agentLabel[msg.agent] ?? msg.agent}</span>
            {msg.risk_level !== undefined && msg.risk_level >= 4 && (
              <RiskBadge level={msg.risk_level} />
            )}
          </div>
        )}

        {/* 말풍선 */}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
          ${isUser
            ? `${theme.userBubble} ${theme.userText} rounded-tr-sm`
            : isCrisis
              ? `${theme.crisisBubble} ${theme.crisisText} rounded-tl-sm`
              : `${theme.aiBubble} ${theme.aiText} rounded-tl-sm`
          }`}>
          {msg.content}
        </div>

        <span className={`text-xs px-1 ${theme.sub}`}>
          {msg.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </span>

        {/* Quick reply chips */}
        {showQuickReplies && msg.quick_replies && msg.quick_replies.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {msg.quick_replies.map((reply) => (
              <button
                key={reply}
                onClick={() => onQuickReply?.(reply)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all backdrop-blur-sm ${theme.chip}`}
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
