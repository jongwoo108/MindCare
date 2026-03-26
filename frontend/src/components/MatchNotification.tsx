import { useState, useEffect } from 'react'
import { doctorApi, type MatchRecord } from '../api/doctor'

interface Props {
  onDismiss: () => void
}

export default function MatchNotification({ onDismiss }: Props) {
  const [match, setMatch] = useState<MatchRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)
  const [message, setMessage] = useState('')
  const [step, setStep] = useState<'loading' | 'none' | 'prompt' | 'done'>('loading')

  useEffect(() => {
    doctorApi.getPatientMatch()
      .then(res => {
        if (res.data) {
          setMatch(res.data)
          setStep('prompt')
        } else {
          setStep('none')
          onDismiss()
        }
      })
      .catch(() => {
        setStep('none')
        onDismiss()
      })
      .finally(() => setLoading(false))
  }, [onDismiss])

  async function respond(accept: boolean) {
    if (!match) return
    setResponding(true)
    try {
      await doctorApi.respondToMatch(match.id, accept, message || undefined)
      setStep('done')
      setTimeout(onDismiss, 2000)
    } catch {
      setResponding(false)
    }
  }

  if (loading || step === 'none') return null

  if (step === 'done') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-3 py-8">
          <div className="text-2xl">✓</div>
          <p className="text-sm text-white/60">응답이 전달되었습니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div>
          <p className="text-xs font-medium text-white/60 mb-1">정신과 의사의 연결 요청</p>
          <p className="text-sm text-white/80 leading-relaxed">
            AI 상담 내용을 검토한 정신과 의사가 직접 진료를 제안했습니다.
          </p>
          {match?.doctor_message && (
            <div className="mt-3 p-3 bg-white/10 rounded-xl border border-white/15">
              <p className="text-xs text-white/40 mb-1">의사 메시지</p>
              <p className="text-sm text-white/70">{match.doctor_message}</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5">답장 메시지 (선택)</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={2}
            placeholder="간단한 답장을 남겨도 됩니다..."
            className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20 backdrop-blur-sm transition-colors"
          />
        </div>

        <div className="space-y-2">
          <button
            onClick={() => respond(true)}
            disabled={responding}
            className="w-full py-2.5 bg-white/20 hover:bg-white/30 disabled:opacity-40 border border-white/30 hover:border-white/50 text-white rounded-xl text-sm font-medium transition-all backdrop-blur-sm"
          >
            {responding ? '처리 중...' : '수락하기'}
          </button>
          <button
            onClick={() => respond(false)}
            disabled={responding}
            className="w-full py-2 text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            괜찮습니다, 거절하기
          </button>
        </div>

        <button
          onClick={onDismiss}
          className="w-full py-1.5 text-xs text-white/20 hover:text-white/40 transition-colors"
        >
          나중에 결정하기
        </button>
      </div>
    </div>
  )
}
