import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { doctorApi, type PatientCase, type DoctorProfile, type MatchRecord } from '../api/doctor'
import { useAuthStore } from '../store/authStore'

const RISK_COLOR: Record<string, string> = {
  '안정':         'text-emerald-400 bg-emerald-950/30 border-emerald-900/30',
  '주의 필요':    'text-amber-400 bg-amber-950/30 border-amber-900/30',
  '위기 상태':    'text-red-400 bg-red-950/30 border-red-900/30',
  '즉각 지원 필요': 'text-red-300 bg-red-950/40 border-red-900/40',
}

export default function DoctorDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const [profile, setProfile] = useState<DoctorProfile | null>(null)
  const [cases, setCases] = useState<PatientCase[]>([])
  const [myMatches, setMyMatches] = useState<MatchRecord[]>([])
  const [selected, setSelected] = useState<PatientCase | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [tab, setTab] = useState<'cases' | 'matches'>('cases')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [profileRes, casesRes, matchesRes] = await Promise.all([
        doctorApi.getMyProfile(),
        doctorApi.listCases(),
        doctorApi.listMyMatches(),
      ])
      setProfile(profileRes.data)
      setCases(casesRes.data.items)
      setMyMatches(matchesRes.data)
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } }
      if (e.response?.status === 404) {
        navigate('/doctor/setup')
      } else {
        setError('데이터를 불러오는데 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => { load() }, [load])

  async function sendMatchRequest() {
    if (!selected) return
    setSending(true)
    try {
      await doctorApi.requestMatch({ patient_case_id: selected.id, doctor_message: message || undefined })
      setSelected(null)
      setMessage('')
      await load()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || '매칭 요청에 실패했습니다.')
    } finally {
      setSending(false)
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const matchedCaseIds = new Set(myMatches.map(m => m.patient_case_id))

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1420] flex items-center justify-center">
        <div className="text-slate-600 text-sm">불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d1420] flex flex-col">
      {/* 헤더 */}
      <header className="bg-[#0d1420]/95 backdrop-blur-sm border-b border-white/[0.05] px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-sm">
            🩺
          </div>
          <span className="font-medium text-slate-300 text-sm">MindCare — 의사 대시보드</span>
          {profile && (
            <span className="text-xs text-slate-600">
              {profile.hospital} · {profile.department}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {profile && !profile.is_verified && (
            <span className="text-xs text-amber-400 bg-amber-950/30 border border-amber-900/30 px-2.5 py-1 rounded-full">
              승인 대기 중
            </span>
          )}
          <button onClick={handleLogout} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
            나가기
          </button>
        </div>
      </header>

      {/* 탭 */}
      <div className="border-b border-white/[0.05] px-6 flex gap-6">
        {(['cases', 'matches'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-600 hover:text-slate-400'
            }`}
          >
            {t === 'cases' ? `케이스 게시판 (${cases.length})` : `내 매칭 요청 (${myMatches.length})`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-4xl mx-auto w-full">
        {error && (
          <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {tab === 'cases' && (
          <>
            {!profile?.is_verified && (
              <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-4 mb-6 text-sm text-amber-300">
                관리자 승인 후 케이스 게시판을 이용할 수 있습니다. 승인까지 1-2 영업일이 소요됩니다.
              </div>
            )}

            {cases.length === 0 ? (
              <div className="text-center py-20 text-slate-600 text-sm">
                현재 매칭 가능한 케이스가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {cases.map(c => {
                  const alreadyRequested = matchedCaseIds.has(c.id)
                  return (
                    <div
                      key={c.id}
                      className="bg-[#111927] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.10] transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${RISK_COLOR[c.risk_label] ?? 'text-slate-400 bg-slate-900/30 border-slate-800/40'}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {c.risk_label}
                            </span>
                            {c.keywords.map(k => (
                              <span key={k} className="px-2 py-0.5 rounded-full text-xs bg-[#1a2535] text-slate-500 border border-white/[0.06]">
                                {k}
                              </span>
                            ))}
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed">{c.summary}</p>
                          {c.recommended_specialties.length > 0 && (
                            <p className="text-xs text-slate-600 mt-2">
                              추천 전문 분야: {c.recommended_specialties.join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0">
                          {alreadyRequested ? (
                            <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg">
                              요청됨
                            </span>
                          ) : (
                            <button
                              onClick={() => { setSelected(c); setMessage('') }}
                              disabled={!profile?.is_verified}
                              className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white px-3 py-1.5 rounded-lg transition-colors"
                            >
                              매칭 요청
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {tab === 'matches' && (
          <div className="space-y-3">
            {myMatches.length === 0 ? (
              <div className="text-center py-20 text-slate-600 text-sm">
                아직 매칭 요청 내역이 없습니다.
              </div>
            ) : (
              myMatches.map(m => {
                const statusLabel: Record<string, string> = {
                  pending: '대기 중', accepted: '수락됨', rejected: '거절됨', cancelled: '취소됨',
                }
                const statusColor: Record<string, string> = {
                  pending: 'text-amber-400', accepted: 'text-emerald-400',
                  rejected: 'text-red-400', cancelled: 'text-slate-500',
                }
                return (
                  <div key={m.id} className="bg-[#111927] border border-white/[0.06] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-medium ${statusColor[m.status]}`}>
                        {statusLabel[m.status] ?? m.status}
                      </span>
                      <span className="text-xs text-slate-700">
                        {new Date(m.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                    {m.doctor_message && (
                      <p className="text-xs text-slate-500">내 메시지: {m.doctor_message}</p>
                    )}
                    {m.patient_message && (
                      <p className="text-xs text-slate-400 mt-1">환자 답장: {m.patient_message}</p>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* 매칭 요청 모달 */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
          <div className="bg-[#111927] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div>
              <p className="text-xs font-medium text-indigo-400 mb-1">매칭 요청</p>
              <p className="text-sm text-slate-300 leading-relaxed">{selected.summary}</p>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">자기소개 메시지 (선택)</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                placeholder="환자에게 보낼 간략한 소개 메시지..."
                className="w-full px-3.5 py-2.5 bg-[#1a2535] border border-white/[0.08] rounded-xl text-sm text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500/40 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <button
                onClick={sendMatchRequest}
                disabled={sending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {sending ? '요청 중...' : '매칭 요청 보내기'}
              </button>
              <button
                onClick={() => setSelected(null)}
                className="w-full py-2 text-xs text-slate-600 hover:text-slate-500 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
