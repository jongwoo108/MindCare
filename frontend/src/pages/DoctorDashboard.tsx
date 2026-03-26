import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { doctorApi, type PatientCase, type DoctorProfile, type MatchRecord, type PsychiatricReport } from '../api/doctor'
import { useAuthStore } from '../store/authStore'
import dashboardBg from '../assets/dashboard.png'

const RISK_COLOR: Record<string, string> = {
  '안정':           'text-emerald-400 bg-emerald-950/30 border-emerald-900/30',
  '주의 필요':      'text-amber-400 bg-amber-950/30 border-amber-900/30',
  '위기 상태':      'text-red-400 bg-red-950/30 border-red-900/30',
  '즉각 지원 필요': 'text-red-300 bg-red-950/40 border-red-900/40',
}

function ReportModal({ report, onClose }: { report: PsychiatricReport; onClose: () => void }) {
  const { case: c, assessment: a, clinical_note: n } = report

  const phqLevel = a
    ? a.phq_score <= 4 ? '정상' : a.phq_score <= 9 ? '경미' : a.phq_score <= 14 ? '중등도' : '심함'
    : null
  const gadLevel = a
    ? a.gad_score <= 4 ? '정상' : a.gad_score <= 9 ? '경미' : '중등도 이상'
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-4 py-8">
      <div className="bg-[#0d1420] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div>
            <p className="text-xs text-indigo-400 font-medium mb-0.5">정신과 사전 리포트</p>
            <h2 className="text-sm font-semibold text-slate-200">AI 상담 분석 요약</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-400 transition-colors text-xs"
          >
            닫기
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* 케이스 개요 */}
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">케이스 개요</h3>
            <div className="bg-[#111927] border border-white/[0.06] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${RISK_COLOR[c.risk_label] ?? 'text-slate-400 border-slate-800/40'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {c.risk_label} (위험도 {c.risk_level}/10)
                </span>
                {c.keywords.map(k => (
                  <span key={k} className="px-2 py-0.5 rounded-full text-xs bg-[#1a2535] text-slate-500 border border-white/[0.06]">
                    {k}
                  </span>
                ))}
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{c.summary}</p>
              {c.recommended_specialties.length > 0 && (
                <p className="text-xs text-slate-600">
                  추천 전문분야: <span className="text-slate-500">{c.recommended_specialties.join(', ')}</span>
                </p>
              )}
            </div>
          </section>

          {/* 초기 평가 점수 */}
          {a && (
            <section>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">초기 선별 평가</h3>
              <div className="bg-[#111927] border border-white/[0.06] rounded-xl p-4 space-y-3">
                {a.chief_complaint && (
                  <div>
                    <p className="text-xs text-slate-600 mb-1">주 호소</p>
                    <p className="text-sm text-slate-300">"{a.chief_complaint}"</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#0d1420] rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-600 mb-1">PHQ 우울</p>
                    <p className="text-lg font-semibold text-slate-200">{a.phq_score}<span className="text-xs text-slate-600">/15</span></p>
                    <p className="text-xs text-slate-500 mt-0.5">{phqLevel}</p>
                  </div>
                  <div className="bg-[#0d1420] rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-600 mb-1">GAD 불안</p>
                    <p className="text-lg font-semibold text-slate-200">{a.gad_score}<span className="text-xs text-slate-600">/9</span></p>
                    <p className="text-xs text-slate-500 mt-0.5">{gadLevel}</p>
                  </div>
                  <div className={`bg-[#0d1420] rounded-lg p-3 text-center ${a.suicide_flag ? 'border border-red-900/40' : ''}`}>
                    <p className="text-xs text-slate-600 mb-1">자해 사고</p>
                    <p className={`text-sm font-semibold mt-1 ${a.suicide_flag ? 'text-red-400' : 'text-emerald-400'}`}>
                      {a.suicide_flag ? '보고됨' : '없음'}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SOAP 임상 노트 */}
          {n ? (
            <section>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                SOAP 임상 노트
                <span className="ml-2 text-slate-700 normal-case">· 메시지 {n.message_count}개 · {n.therapeutic_approach ?? '지지적 상담'}</span>
              </h3>
              <div className="space-y-2">
                {([
                  { key: 'S', label: '주관적 (Subjective)', value: n.subjective, color: 'border-l-sky-700' },
                  { key: 'O', label: '객관적 (Objective)',  value: n.objective,  color: 'border-l-indigo-700' },
                  { key: 'A', label: '임상 평가 (Assessment)', value: n.assessment, color: 'border-l-violet-700' },
                  { key: 'P', label: '계획 (Plan)',         value: n.plan,       color: 'border-l-emerald-700' },
                ] as const).map(({ key, label, value, color }) => (
                  <div key={key} className={`bg-[#111927] border border-white/[0.06] border-l-2 ${color} rounded-xl rounded-l-sm px-4 py-3`}>
                    <p className="text-xs text-slate-600 font-medium mb-1.5">{label}</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">SOAP 임상 노트</h3>
              <div className="bg-[#111927] border border-white/[0.06] rounded-xl p-4 text-center text-sm text-slate-600">
                아직 생성되지 않았습니다.
              </div>
            </section>
          )}

          {/* 면책 고지 */}
          <p className="text-xs text-slate-700 text-center pb-1">
            이 리포트는 AI가 생성한 참고 자료입니다. 임상 진단을 대체하지 않습니다.
          </p>
        </div>
      </div>
    </div>
  )
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
  const [report, setReport] = useState<PsychiatricReport | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

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

  async function openReport(matchId: string) {
    setReportLoading(true)
    try {
      const res = await doctorApi.getMatchReport(matchId)
      setReport(res.data)
    } catch {
      setError('리포트를 불러오는데 실패했습니다.')
    } finally {
      setReportLoading(false)
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const matchedCaseIds = new Set(myMatches.map(m => m.patient_case_id))

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundImage: `url(${dashboardBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative text-white/50 text-sm">불러오는 중...</div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundImage: `url(${dashboardBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-black/50" />
      {report && <ReportModal report={report} onClose={() => setReport(null)} />}

      {/* 헤더 */}
      <header className="relative z-10 bg-white/5 backdrop-blur-xl border-b border-white/10 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-sm">
            🩺
          </div>
          <span className="font-medium text-white text-sm">MindCare — 의사 대시보드</span>
          {profile && (
            <span className="text-xs text-white/40">
              {profile.hospital} · {profile.department}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {profile && !profile.is_verified && (
            <span className="text-xs text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2.5 py-1 rounded-full">
              승인 대기 중
            </span>
          )}
          <button onClick={handleLogout} className="text-xs text-white/30 hover:text-white/60 transition-colors">
            나가기
          </button>
        </div>
      </header>

      {/* 탭 */}
      <div className="relative z-10 border-b border-white/10 px-6 flex gap-6 bg-white/5 backdrop-blur-xl">
        {(['cases', 'matches'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-white/60 text-white'
                : 'border-transparent text-white/30 hover:text-white/60'
            }`}
          >
            {t === 'cases' ? `케이스 게시판 (${cases.length})` : `내 매칭 요청 (${myMatches.length})`}
          </button>
        ))}
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 py-6 max-w-4xl mx-auto w-full">
        {error && (
          <p className="text-xs text-red-300 bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2 mb-4 backdrop-blur-sm">
            {error}
          </p>
        )}

        {/* 케이스 게시판 탭 */}
        {tab === 'cases' && (
          <>
            {!profile?.is_verified && (
              <div className="bg-amber-950/30 border border-amber-500/20 backdrop-blur-sm rounded-xl p-4 mb-6 text-sm text-amber-300">
                관리자 승인 후 케이스 게시판을 이용할 수 있습니다. 승인까지 1-2 영업일이 소요됩니다.
              </div>
            )}
            {cases.length === 0 ? (
              <div className="text-center py-20 text-white/30 text-sm">
                현재 매칭 가능한 케이스가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {cases.map(c => {
                  const alreadyRequested = matchedCaseIds.has(c.id)
                  return (
                    <div
                      key={c.id}
                      className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-5 hover:bg-white/15 hover:border-white/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${RISK_COLOR[c.risk_label] ?? 'text-white/50 bg-white/10 border-white/20'}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {c.risk_label}
                            </span>
                            {c.keywords.map(k => (
                              <span key={k} className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-white/50 border border-white/15">
                                {k}
                              </span>
                            ))}
                          </div>
                          <p className="text-sm text-white/80 leading-relaxed">{c.summary}</p>
                          {c.recommended_specialties.length > 0 && (
                            <p className="text-xs text-white/30 mt-2">
                              추천 전문 분야: {c.recommended_specialties.join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0">
                          {alreadyRequested ? (
                            <span className="text-xs text-white/50 bg-white/10 border border-white/20 px-3 py-1.5 rounded-lg">
                              요청됨
                            </span>
                          ) : (
                            <button
                              onClick={() => { setSelected(c); setMessage('') }}
                              disabled={!profile?.is_verified}
                              className="text-xs bg-white/20 hover:bg-white/30 disabled:opacity-30 border border-white/30 hover:border-white/50 text-white px-3 py-1.5 rounded-lg transition-all backdrop-blur-sm"
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

        {/* 내 매칭 요청 탭 */}
        {tab === 'matches' && (
          <div className="space-y-3">
            {myMatches.length === 0 ? (
              <div className="text-center py-20 text-white/30 text-sm">
                아직 매칭 요청 내역이 없습니다.
              </div>
            ) : (
              myMatches.map(m => {
                const statusLabel: Record<string, string> = {
                  pending: '대기 중', accepted: '수락됨', rejected: '거절됨', cancelled: '취소됨',
                }
                const statusColor: Record<string, string> = {
                  pending: 'text-amber-300', accepted: 'text-emerald-300',
                  rejected: 'text-red-300', cancelled: 'text-white/30',
                }
                return (
                  <div key={m.id} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-medium ${statusColor[m.status]}`}>
                        {statusLabel[m.status] ?? m.status}
                      </span>
                      <div className="flex items-center gap-3">
                        {m.status === 'accepted' && (
                          <button
                            onClick={() => openReport(m.id)}
                            disabled={reportLoading}
                            className="text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 rounded-lg transition-all disabled:opacity-40 backdrop-blur-sm"
                          >
                            {reportLoading ? '로딩...' : '📋 리포트 보기'}
                          </button>
                        )}
                        <span className="text-xs text-white/25">
                          {new Date(m.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>
                    {m.doctor_message && (
                      <p className="text-xs text-white/40 mt-1">내 메시지: {m.doctor_message}</p>
                    )}
                    {m.patient_message && (
                      <p className="text-xs text-white/60 mt-1">환자 답장: {m.patient_message}</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div>
              <p className="text-xs font-medium text-white/60 mb-1">매칭 요청</p>
              <p className="text-sm text-white/80 leading-relaxed">{selected.summary}</p>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">자기소개 메시지 (선택)</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                placeholder="환자에게 보낼 간략한 소개 메시지..."
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20 backdrop-blur-sm transition-colors"
              />
            </div>
            <div className="space-y-2">
              <button
                onClick={sendMatchRequest}
                disabled={sending}
                className="w-full py-2.5 bg-white/20 hover:bg-white/30 disabled:opacity-40 border border-white/30 hover:border-white/50 text-white rounded-xl text-sm font-medium transition-all backdrop-blur-sm"
              >
                {sending ? '요청 중...' : '매칭 요청 보내기'}
              </button>
              <button
                onClick={() => setSelected(null)}
                className="w-full py-2 text-xs text-white/30 hover:text-white/50 transition-colors"
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
