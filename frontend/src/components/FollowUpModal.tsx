import { useState, useEffect } from 'react'
import { assessmentApi, type FollowUpRecommendation, type FollowUpQuestion } from '../api/assessment'
import type { SceneTheme } from '../scene/sceneTheme'

interface Props {
  sessionId: string
  recommendation: FollowUpRecommendation
  onComplete: (updatedRisk: number) => void
  onSkip: () => void
  theme: SceneTheme
}

const TYPE_META: Record<string, { title: string; color: string }> = {
  crisis_detailed:  { title: '안전 확인 추가 검사', color: 'text-rose-400' },
  phq_extended:     { title: '우울 심화 검사',       color: 'text-indigo-400' },
  gad_extended:     { title: '불안 심화 검사',        color: 'text-violet-400' },
}

const SCALE_LABELS  = ['전혀 없음', '며칠', '일주일 이상', '거의 매일']
const BINARY_LABELS = ['아니오', '예']

export default function FollowUpModal({ sessionId, recommendation, onComplete, onSkip, theme }: Props) {
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
      <Modal theme={theme}>
        <div className={`text-center py-8 text-sm ${theme.modalBody}`}>잠시만 기다려주세요...</div>
      </Modal>
    )
  }

  if (step === 'intro') {
    return (
      <Modal theme={theme}>
        <div className="space-y-5">
          <div>
            <p className={`text-xs font-medium mb-1 ${meta.color}`}>{meta.title}</p>
            <p className={`text-sm leading-relaxed ${theme.modalTitle}`}>{recommendation.reason}</p>
            {questions.length > 0 && (
              <p className={`text-xs mt-2 ${theme.modalBody}`}>총 {questions.length}문항 · 약 1분 소요</p>
            )}
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="space-y-2">
            {questions.length > 0 && !error && (
              <button
                onClick={() => setStep('questions')}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${theme.modalPrimaryBtn}`}
              >
                검사 시작하기
              </button>
            )}
            <button
              onClick={onSkip}
              className={`w-full py-2 text-xs transition-colors ${theme.modalBody} hover:opacity-70`}
            >
              건너뛰기
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  if (step === 'submitting') {
    return (
      <Modal theme={theme}>
        <div className={`text-center py-6 text-sm ${theme.modalBody}`}>결과를 분석하는 중...</div>
      </Modal>
    )
  }

  return (
    <Modal theme={theme}>
      <div className="flex items-center justify-between mb-5">
        <span className={`text-xs font-medium ${meta.color}`}>{meta.title}</span>
        <span className={`text-xs ${theme.modalBody}`}>{currentQ + 1} / {questions.length}</span>
      </div>

      <div className={`h-0.5 rounded-full mb-6 overflow-hidden ${theme.modalProgressBg}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${theme.modalProgressFill}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className={`text-xs mb-1 ${theme.modalBody}`}>지난 2주 동안,</p>
      <p className={`text-sm leading-relaxed mb-6 ${theme.modalTitle}`}>{q?.text}</p>

      <div className="space-y-2">
        {labels.map((label, i) => (
          <button
            key={i}
            onClick={() => selectAnswer(i)}
            className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all
              ${answers[q?.key] === i ? theme.modalOptionSel : theme.modalOption}`}
          >
            {label}
          </button>
        ))}
      </div>

      {currentQ > 0 && (
        <button
          onClick={() => setCurrentQ(i => i - 1)}
          className={`mt-4 text-xs w-full text-center transition-colors ${theme.modalBody} hover:opacity-70`}
        >
          ← 이전
        </button>
      )}
    </Modal>
  )
}

function Modal({ children, theme }: { children: React.ReactNode; theme: SceneTheme }) {
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${theme.modalBackdrop}`}>
      <div className={`rounded-2xl shadow-2xl w-full max-w-sm p-6 ${theme.modalPanel}`}>
        {children}
      </div>
    </div>
  )
}
