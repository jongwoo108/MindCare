import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../api/auth'
import loginBg from '../assets/login-bg.png'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'user' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.register(form.email, form.password, form.name, form.role)
      navigate(form.role === 'doctor' ? '/doctor/setup' : '/login')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md mb-4">
            <span className="text-2xl">🌙</span>
          </div>
          <h1 className="text-xl font-semibold text-white drop-shadow">시작하기</h1>
          <p className="text-sm text-white/60 mt-1 drop-shadow">MindCare AI와 함께하세요</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={submit} className="space-y-4">
            {[
              { key: 'name',     label: '이름',     type: 'text',     placeholder: '홍길동' },
              { key: 'email',    label: '이메일',   type: 'email',    placeholder: 'example@email.com' },
              { key: 'password', label: '비밀번호', type: 'password', placeholder: '8자 이상' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-white/70 mb-1.5">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={update(key as keyof typeof form)}
                  className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20 backdrop-blur-sm transition-colors"
                  placeholder={placeholder}
                  required
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">계정 유형</label>
              <select
                value={form.role}
                onChange={update('role')}
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20 backdrop-blur-sm transition-colors"
              >
                <option value="user" className="bg-slate-900">일반 사용자</option>
                <option value="doctor" className="bg-slate-900">정신과 의사</option>
              </select>
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
              {loading ? '처리 중...' : form.role === 'doctor' ? '다음 (프로필 설정)' : '가입하기'}
            </button>
          </form>

          <p className="text-center text-xs text-white/40 mt-6">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-white/70 hover:text-white transition-colors">
              로그인
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-white/25 mt-6">
          이 서비스는 전문적인 의료 서비스를 대체하지 않습니다.
        </p>
      </div>
    </div>
  )
}
