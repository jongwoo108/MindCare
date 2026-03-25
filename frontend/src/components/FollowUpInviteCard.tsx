import type { FollowUpRecommendation } from '../api/assessment'

const TYPE_META: Record<string, { title: string; color: string }> = {
  crisis_detailed: { title: '안전 확인 추가 검사', color: 'text-rose-400' },
  phq_extended:   { title: '우울 심화 검사',       color: 'text-indigo-400' },
  gad_extended:   { title: '불안 심화 검사',        color: 'text-violet-400' },
}

interface Props {
  recommendation: FollowUpRecommendation
  onStart: () => void
  onSkip: () => void
}

export default function FollowUpInviteCard({ recommendation, onStart, onSkip }: Props) {
  const meta = TYPE_META[recommendation.type] ?? { title: '심화 검사', color: 'text-indigo-400' }

  return (
    <div className="flex gap-3">
      {/* 아바타 */}
      <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center text-sm shrink-0 mt-1">
        🌙
      </div>

      <div className="max-w-[75%] flex flex-col items-start space-y-1">
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-slate-600">상담사</span>
        </div>

        {/* 말풍선 */}
        <div className="bg-[#111927] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3 space-y-3">
          <div>
            <p className={`text-xs font-medium mb-1.5 ${meta.color}`}>{meta.title}</p>
            <p className="text-sm text-slate-300 leading-relaxed">{recommendation.reason}</p>
          </div>
          <div className="space-y-1.5 pt-1">
            <button
              onClick={onStart}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition-colors"
            >
              검사 시작하기
            </button>
            <button
              onClick={onSkip}
              className="w-full py-1.5 text-xs text-slate-600 hover:text-slate-500 transition-colors"
            >
              괜찮아요, 건너뛸게요
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
