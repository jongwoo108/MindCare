import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useExpertStore } from '../store/expertStore'
import { useExpertWS } from '../hooks/useExpertWS'
import { expertApi, type ReviewItem } from '../api/expert'
import RiskBadge from '../components/RiskBadge'

function ReviewCard({ item, token, onDone }: {
  item: ReviewItem
  token: string
  onDone: (id: string, status: ReviewItem['status']) => void
}) {
  const [mode, setMode] = useState<'view' | 'modify'>('view')
  const [modified, setModified] = useState(item.ai_response)
  const [note, setNote] = useState('')
  const [category, setCategory] = useState<'response_quality' | 'safety' | 'clinical_accuracy'>('response_quality')
  const [loading, setLoading] = useState(false)

  const handleApprove = async () => {
    setLoading(true)
    try {
      await expertApi.submitFeedback({
        session_id: item.session_id,
        pending_response_id: item.id,
        action: 'approve',
        feedback_note: note || undefined,
      }, token)
      onDone(item.id, 'approved')
    } finally {
      setLoading(false)
    }
  }

  const handleModify = async () => {
    setLoading(true)
    try {
      await expertApi.submitFeedback({
        session_id: item.session_id,
        pending_response_id: item.id,
        action: 'modify',
        modified_content: modified,
        feedback_category: category,
        feedback_note: note || undefined,
      }, token)
      onDone(item.id, 'modified')
    } finally {
      setLoading(false)
    }
  }

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return '방금'
    if (m < 60) return `${m}분 전`
    return `${Math.floor(m / 60)}시간 전`
  }

  return (
    <div className={`bg-white border rounded-xl p-4 shadow-sm space-y-3 ${item.risk_level >= 7 ? 'border-red-200' : 'border-slate-200'}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RiskBadge level={item.risk_level} showLabel />
          <span className="text-xs text-slate-400">{timeAgo(item.created_at)}</span>
        </div>
        <span className="text-xs text-slate-400 font-mono truncate max-w-[120px]">{item.session_id.slice(0, 8)}…</span>
      </div>

      {/* 위험 요인 */}
      {item.risk_factors.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.risk_factors.map((f, i) => (
            <span key={i} className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full border border-red-100">{f}</span>
          ))}
        </div>
      )}

      {/* 이전 세션 컨텍스트 */}
      {item.context_summary && (
        <details className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2 cursor-pointer">
          <summary className="font-medium text-slate-600 mb-1">이전 상담 기록</summary>
          <p className="whitespace-pre-wrap mt-1">{item.context_summary}</p>
        </details>
      )}

      {/* AI 응답 */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-500">AI 응답</p>
        {mode === 'view' ? (
          <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-3">{item.ai_response}</p>
        ) : (
          <textarea
            value={modified}
            onChange={(e) => setModified(e.target.value)}
            rows={5}
            className="w-full text-sm text-slate-700 bg-white border border-blue-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        )}
      </div>

      {/* 수정 모드 옵션 */}
      {mode === 'modify' && (
        <div className="space-y-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="response_quality">응답 품질</option>
            <option value="safety">안전성</option>
            <option value="clinical_accuracy">임상 정확성</option>
          </select>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="피드백 메모 (선택)"
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      )}

      {/* 액션 버튼 */}
      {item.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          {mode === 'view' ? (
            <>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
              >
                승인
              </button>
              <button
                onClick={() => setMode('modify')}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                수정
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleModify}
                disabled={loading || !modified.trim()}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
              >
                수정 완료
              </button>
              <button
                onClick={() => setMode('view')}
                className="px-4 py-2 border border-slate-300 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
            </>
          )}
        </div>
      )}

      {/* 처리 완료 배지 */}
      {item.status !== 'pending' && (
        <div className={`text-center py-1.5 rounded-lg text-sm font-medium ${
          item.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
        }`}>
          {item.status === 'approved' ? '✓ 승인됨' : '✓ 수정 완료'}
        </div>
      )}
    </div>
  )
}

export default function ExpertDashboard() {
  const navigate = useNavigate()
  const { token, logout } = useAuthStore()
  const { queue, pendingCount, isConnected, setQueue, updateStatus } = useExpertStore()
  const [filter, setFilter] = useState<'all' | 'pending'>('pending')
  const [loading, setLoading] = useState(true)

  // WS 연결 (실시간 알림)
  useExpertWS()

  // 초기 대기열 로드
  useEffect(() => {
    if (!token) return
    expertApi.getQueue(token)
      .then((res) => setQueue(res.data.items))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token, setQueue])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const displayed = filter === 'pending' ? queue.filter(i => i.status === 'pending') : queue

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">🩺</span>
          <span className="font-semibold text-slate-800">전문가 대시보드</span>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-slate-300'}`} title={isConnected ? '실시간 연결' : '연결 끊김'} />
        </div>
        <div className="flex items-center gap-4">
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingCount} 대기
            </span>
          )}
          <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-slate-700">
            로그아웃
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* 필터 탭 */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
          {(['pending', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                filter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f === 'pending' ? `대기 중 (${pendingCount})` : `전체 (${queue.length})`}
            </button>
          ))}
        </div>

        {/* 리뷰 목록 */}
        {loading ? (
          <div className="text-center text-slate-400 py-20">불러오는 중…</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20 space-y-2">
            <div className="text-4xl">✅</div>
            <p className="text-slate-400 text-sm">
              {filter === 'pending' ? '대기 중인 리뷰가 없습니다.' : '리뷰 항목이 없습니다.'}
            </p>
          </div>
        ) : (
          displayed.map((item) => (
            <ReviewCard
              key={item.id}
              item={item}
              token={token!}
              onDone={(id, status) => updateStatus(id, status)}
            />
          ))
        )}
      </div>
    </div>
  )
}
