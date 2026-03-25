import { useState } from 'react'
import { assessmentApi, type AssessmentAnswers } from '../api/assessment'

interface Question {
  key: keyof AssessmentAnswers
  text: string
  category: 'phq' | 'gad' | 'safety'
}

const QUESTIONS: Question[] = [
  { key: 'q1', text: '기분이 가라앉거나 우울하거나 희망이 없다고 느끼셨나요?', category: 'phq' },
  { key: 'q2', text: '일이나 여가 활동에 흥미나 즐거움이 거의 없었나요?', category: 'phq' },
  { key: 'q3', text: '잠들기 어렵거나 자다가 깨거나, 너무 많이 잠을 자셨나요?', category: 'phq' },
  { key: 'q4', text: '피로하거나 기운이 없다고 느끼셨나요?', category: 'phq' },
  { key: 'q5', text: '자신이 나쁜 사람이라거나 스스로를 실패자라고 느끼셨나요?', category: 'phq' },
  { key: 'q6', text: '초조하거나 불안하거나 긴장되어 있다고 느끼셨나요?', category: 'gad' },
  { key: 'q7', text: '걱정을 멈추거나 조절할 수 없다고 느끼셨나요?', category: 'gad' },
  { key: 'q8', text: '쉽게 짜증이 나거나 화가 나셨나요?', category: 'gad' },
  { key: 'q9', text: '자신을 해치거나 죽고 싶다는 생각이 드셨나요?', category: 'safety' },
]

const SCALE = [
  { label: '전혀 없음', sub: '0일' },
  { label: '며칠', sub: '1–6일' },
  { label: '일주일 이상', sub: '7–11일' },
  { label: '거의 매일', sub: '12–14일' },
]

const CATEGORY_META = {
  phq: { label: '기분', color: 'text-indigo-400' },
  gad: { label: '불안', color: 'text-violet-400' },
  safety: { label: '안전', color: 'text-rose-400' },
}

interface Props {
  sessionId: string
  onComplete: () => void
}

const INITIAL_ANSWERS: AssessmentAnswers = { q1:0, q2:0, q3:0, q4:0, q5:0, q6:0, q7:0, q8:0, q9:0 }
type Step = 'intro' | 'questions' | 'complaint' | 'submitting' | 'done'

export default function AssessmentModal({ sessionId, onComplete }: Props) {
  const [step, setStep] = useState<Step>('intro')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<AssessmentAnswers>(INITIAL_ANSWERS)
  const [complaint, setComplaint] = useState('')
  const [error, setError] = useState('')

  const q = QUESTIONS[currentQ]
  const progress = Math.round((currentQ / QUESTIONS.length) * 100)
  const meta = CATEGORY_META[q?.category ?? 'phq']

  function selectAnswer(value: number) {
    setAnswers(prev => ({ ...prev, [q.key]: value }))
    if (currentQ < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(i => i + 1), 200)
    } else {
      setTimeout(() => setStep('complaint'), 200)
    }
  }

  async function handleSubmit() {
    setStep('submitting')
    setError('')
    try {
      await assessmentApi.submit(sessionId, answers, complaint || undefined)
      setStep('done')
      setTimeout(onComplete, 900)
    } catch {
      setError('제출에 실패했습니다. 다시 시도해주세요.')
      setStep('complaint')
    }
  }

  if (step === 'intro') {
    return (
      <NightModal>
        <div className="text-center space-y-5">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 items-center justify-center text-2xl mx-auto">
            🌙
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-200">안녕하세요</h2>
            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
              상담을 시작하기 전, 지난 2주 동안의<br />기분과 상태를 간단히 여쭤볼게요.
            </p>
          </div>
          <p className="text-xs text-slate-600">총 9문항 · 약 2분 소요</p>
          <div className="space-y-2 pt-1">
            <button
              onClick={() => setStep('questions')}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
            >
              시작하기
            </button>
            <button
              onClick={onComplete}
              className="w-full py-2 text-xs text-slate-600 hover:text-slate-500 transition-colors"
            >
              건너뛰기
            </button>
          </div>
        </div>
      </NightModal>
    )
  }

  if (step === 'questions') {
    return (
      <NightModal>
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
          <span className="text-xs text-slate-600">{currentQ + 1} / {QUESTIONS.length}</span>
        </div>

        {/* 진행 바 */}
        <div className="h-0.5 bg-white/[0.05] rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-indigo-500/60 rounded-full transition-all duration-400"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 질문 */}
        <p className="text-xs text-slate-500 mb-1">지난 2주 동안,</p>
        <p className="text-slate-200 text-sm leading-relaxed mb-6 min-h-[2.5rem]">{q.text}</p>

        {/* 선택지 */}
        <div className="space-y-2">
          {SCALE.map((s, i) => (
            <button
              key={i}
              onClick={() => selectAnswer(i)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all
                ${answers[q.key] === i
                  ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200'
                  : 'bg-[#1a2535] border-white/[0.06] text-slate-400 hover:border-white/[0.12] hover:text-slate-300'
                }`}
            >
              <span>{s.label}</span>
              <span className="text-xs opacity-50">{s.sub}</span>
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

  if (step === 'complaint' || step === 'submitting') {
    return (
      <NightModal>
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-200">오늘 어떤 이야기를 나눠볼까요?</h2>
            <p className="text-xs text-slate-600 mt-1">선택 사항이에요. 비워두셔도 괜찮아요.</p>
          </div>
          <textarea
            value={complaint}
            onChange={e => setComplaint(e.target.value)}
            placeholder="예: 직장 스트레스, 관계 문제, 불면증..."
            maxLength={500}
            rows={4}
            className="w-full px-3.5 py-3 bg-[#1a2535] border border-white/[0.08] rounded-xl text-sm text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-colors"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={step === 'submitting'}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-colors"
          >
            {step === 'submitting' ? '저장 중...' : '상담 시작하기'}
          </button>
        </div>
      </NightModal>
    )
  }

  return (
    <NightModal>
      <div className="text-center space-y-3 py-4">
        <div className="text-3xl">✨</div>
        <p className="text-sm text-slate-400">잠시 후 상담이 시작됩니다</p>
      </div>
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
