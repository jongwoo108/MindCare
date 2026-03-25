import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../api/auth'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'user' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.register(form.email, form.password, form.name, form.role)
      navigate(form.role === 'doctor' ? '/doctor/setup' : '/login')
    } catch (err: any) {
      setError(err.response?.data?.detail || '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1420] flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(129,140,248,0.06) 0%, #0d1420 70%)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <span className="text-2xl">🌙</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-200">시작하기</h1>
          <p className="text-sm text-slate-500 mt-1">MindCare AI와 함께하세요</p>
        </div>

        <div className="bg-[#111927] border border-white/[0.06] rounded-2xl p-8">
          <form onSubmit={submit} className="space-y-4">
            {[
              { key: 'name', label: '이름', type: 'text', placeholder: '홍길동' },
              { key: 'email', label: '이메일', type: 'email', placeholder: 'example@email.com' },
              { key: 'password', label: '비밀번호', type: 'password', placeholder: '8자 이상' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={update(key as keyof typeof form)}
                  className="w-full px-3.5 py-2.5 bg-[#1a2535] border border-white/[0.08] rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                  placeholder={placeholder}
                  required
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">계정 유형</label>
              <select
                value={form.role}
                onChange={update('role')}
                className="w-full px-3.5 py-2.5 bg-[#1a2535] border border-white/[0.08] rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
              >
                <option value="user">일반 사용자</option>
                <option value="doctor">정신과 의사</option>
              </select>
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
              {loading ? '처리 중...' : form.role === 'doctor' ? '다음 (프로필 설정)' : '가입하기'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-6">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
