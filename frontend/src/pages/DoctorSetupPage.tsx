import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doctorApi } from '../api/doctor'
import doctorProfileBg from '../assets/doctor-profile.png'

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

  async function submit(e: { preventDefault(): void }) {
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
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || '프로필 등록에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: `url(${doctorProfileBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md mb-4">
            <span className="text-2xl">🩺</span>
          </div>
          <h1 className="text-xl font-semibold text-white drop-shadow">의사 프로필 설정</h1>
          <p className="text-sm text-white/60 mt-1 drop-shadow">관리자 승인 후 케이스 게시판에 접근할 수 있습니다</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">의사 면허 번호</label>
              <input
                value={form.license_number}
                onChange={update('license_number')}
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20 backdrop-blur-sm transition-colors"
                placeholder="12345"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">소속 병원</label>
              <input
                value={form.hospital}
                onChange={update('hospital')}
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20 backdrop-blur-sm transition-colors"
                placeholder="서울 정신건강 의원"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">진료과</label>
              <input
                value={form.department}
                onChange={update('department')}
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20 backdrop-blur-sm transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">전문 분야</label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTY_OPTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSpecialty(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all backdrop-blur-sm ${
                      specialties.includes(s)
                        ? 'bg-white/25 border-white/50 text-white'
                        : 'bg-white/10 border-white/20 text-white/50 hover:text-white/80 hover:bg-white/15'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">자기소개 (선택)</label>
              <textarea
                value={form.bio}
                onChange={update('bio')}
                rows={3}
                placeholder="전문 분야나 진료 철학을 간략히 소개해주세요"
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20 backdrop-blur-sm transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-red-300 bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2 backdrop-blur-sm">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white/20 hover:bg-white/30 disabled:opacity-40 border border-white/30 hover:border-white/50 text-white py-2.5 rounded-xl text-sm font-medium transition-all backdrop-blur-sm mt-2"
            >
              {loading ? '등록 중...' : '프로필 등록하기'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/25 mt-6">
          이 서비스는 전문적인 의료 서비스를 대체하지 않습니다.
        </p>
      </div>
    </div>
  )
}
