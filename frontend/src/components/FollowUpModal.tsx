import { useState, useEffect } from 'react'
import { assessmentApi, type FollowUpRecommendation, type FollowUpQuestion } from '../api/assessment'

interface Props {
  sessionId: string
  recommendation: FollowUpRecommendation
  onComplete: (updatedRisk: number) => void
  onSkip: () => void
}

const TYPE_META: Record<string, { title: string; color: string }> = {
  crisis_detailed:  { title: '안전 확인 추가 검사', color: 'text-rose-400' },
  phq_extended:     { title: '우울 심화 검사',       color: 'text-indigo-400' },
  gad_extended:     { title: '불안 심화 검사',        color: 'text-violet-400' },
}

const SCALE_LABELS  = ['전혀 없음', '며칠', '일주일 이상', '거의 매일']
const BINARY_LABELS = ['아니오', '예']

export default function FollowUpModal({ sessionId, recommendation, onComplete, onSkip }: Props) {
  const [questions, setQuestions] = useState<FollowUpQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [currentQ, setCurrentQ] = useState(0)
  const [step, setStep] = useState<'loading' | 'intro' | 'questions' | 'submitting'>('loading')
  const [error, setError] = useState('')

  const meta = TYPE_META[recommendation.type] ?? { title: '심화 검사', color: 'text-indigo-400' }

  useEffect(() => {
    assessmentApi.getFollowUpQuestions(sessionId, recommendation.type)
      .then(res => { setQuestions(res.data.questions); setStep('intro') })
      .catch(() => { setError('문항을 불러오는 데 실패했습니다.'); setStep('intro') })
  }, [sessionId, recommendation.type])

  const q = questions[currentQ]
  const isBinary = q?.scale === 'binary'
  const labels = isBinary ? BINARY_LABELS : SCALE_LABELS
  const progress = questions.length > 0 ? Math.round((currentQ / questions.length) * 100) : 0

  function selectAnswer(value: number) {
    if (!q) return
    const next = { ...answers, [q.key]: value }
    setAnswers(next)
    if (currentQ < questions.length - 1) {
      setTimeout(() => setCurrentQ(i => i + 1), 200)
    } else {
      submitAnswers(next)
    }
  }

  async function submitAnswers(finalAnswers: Record<string, number>) {
    setStep('submitting')
    try {
      const res = await assessmentApi.submitFollowUp(sessionId, recommendation.type, finalAnswers)
      onComplete(res.data.updated_risk_level)
    } catch {
      setError('제출에 실패했습니다.')
      setStep('questions')
    }
  }

  if (step === 'loading') {
    return (
      <NightModal>
        <div className="text-center text-slate-500 py-8 text-sm">잠시만 기다려주세요...</div>
      </NightModal>
    )
  }

  if (step === 'intro') {
    return (
      <NightModal>
        <div className="space-y-5">
          <div>
            <p className={`text-xs font-medium mb-1 ${meta.color}`}>{meta.title}</p>
            <p className="text-sm text-slate-300 leading-relaxed">{recommendation.reason}</p>
            {questions.length > 0 && (
              <p className="text-xs text-slate-600 mt-2">총 {questions.length}문항 · 약 1분 소요</p>
            )}
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="space-y-2">
            {questions.length > 0 && !error && (
              <button
                onClick={() => setStep('questions')}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
              >
                검사 시작하기
              </button>
            )}
            <button
              onClick={onSkip}
              className="w-full py-2 text-xs text-slate-600 hover:text-slate-500 transition-colors"
            >
              건너뛰기
            </button>
          </div>
        </div>
      </NightModal>
    )
  }

  if (step === 'submitting') {
    return (
      <NightModal>
        <div className="text-center py-6 text-sm text-slate-500">결과를 분석하는 중...</div>
      </NightModal>
    )
  }

  return (
    <NightModal>
      <div className="flex items-center justify-between mb-5">
        <span className={`text-xs font-medium ${meta.color}`}>{meta.title}</span>
        <span className="text-xs text-slate-600">{currentQ + 1} / {questions.length}</span>
      </div>

      <div className="h-0.5 bg-white/[0.05] rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-indigo-500/60 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-xs text-slate-500 mb-1">지난 2주 동안,</p>
      <p className="text-slate-200 text-sm leading-relaxed mb-6">{q?.text}</p>

      <div className="space-y-2">
        {labels.map((label, i) => (
          <button
            key={i}
            onClick={() => selectAnswer(i)}
            className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all
              ${answers[q?.key] === i
                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200'
                : 'bg-[#1a2535] border-white/[0.06] text-slate-400 hover:border-white/[0.12] hover:text-slate-300'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {currentQ > 0 && (
        <button
          onClick={() => setCurrentQ(i => i - 1)}
          className="mt-4 text-xs text-slate-600 hover:text-slate-500 w-full text-center transition-colors"
        >
          ← 이전
        </button>
      )}
    </NightModal>
  )
}

function NightModal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
      <div className="bg-[#111927] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-sm p-6">
        {children}
      </div>
    </div>
  )
}
