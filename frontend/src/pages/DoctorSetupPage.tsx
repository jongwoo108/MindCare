import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doctorApi } from '../api/doctor'

const SPECIALTY_OPTIONS = ['우울증', '불안장애', 'PTSD', '수면장애', '대인관계', '청소년', '중독', '조현병', '양극성장애']

export default function DoctorSetupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    license_number: '',
    hospital: '',
    department: '정신건강의학과',
    bio: '',
    max_patients: 0,
  })
  const [specialties, setSpecialties] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  function toggleSpecialty(s: string) {
    setSpecialties(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (specialties.length === 0) {
      setError('전문 분야를 하나 이상 선택해주세요.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await doctorApi.registerProfile({
        ...form,
        max_patients: Number(form.max_patients),
        specialties,
      })
      navigate('/doctor/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || '프로필 등록에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1420] flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(129,140,248,0.06) 0%, #0d1420 70%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <span className="text-2xl">🩺</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-200">의사 프로필 설정</h1>
          <p className="text-sm text-slate-500 mt-1">관리자 승인 후 케이스 게시판에 접근할 수 있습니다</p>
        </div>

        <div className="bg-[#111927] border border-white/[0.06] rounded-2xl p-8">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">의사 면허 번호</label>
              <input
                value={form.license_number}
                onChange={update('license_number')}
                className="w-full px-3.5 py-2.5 bg-[#1a2535] border border-white/[0.08] rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                placeholder="12345"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">소속 병원</label>
              <input
                value={form.hospital}
                onChange={update('hospital')}
                className="w-full px-3.5 py-2.5 bg-[#1a2535] border border-white/[0.08] rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                placeholder="서울 정신건강 의원"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">진료과</label>
              <input
                value={form.department}
                onChange={update('department')}
                className="w-full px-3.5 py-2.5 bg-[#1a2535] border border-white/[0.08] rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">전문 분야</label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTY_OPTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSpecialty(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      specialties.includes(s)
                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                        : 'bg-[#1a2535] border-white/[0.08] text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">자기소개 (선택)</label>
              <textarea
                value={form.bio}
                onChange={update('bio')}
                rows={3}
                placeholder="전문 분야나 진료 철학을 간략히 소개해주세요"
                className="w-full px-3.5 py-2.5 bg-[#1a2535] border border-white/[0.08] rounded-xl text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-medium transition-colors mt-2"
            >
              {loading ? '등록 중...' : '프로필 등록하기'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
