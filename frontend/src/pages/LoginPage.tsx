import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import loginBg from '../assets/login-bg.png'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setTokens } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.login(email, password)
      setTokens(res.data.access_token, res.data.refresh_token)
      const { decodeTokenRole } = await import('../api/auth')
      const userRole = decodeTokenRole(res.data.access_token)
      navigate(userRole === 'doctor' ? '/doctor/dashboard' : '/chat')
    } catch {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
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
      {/* 어두운 오버레이 */}
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md mb-4">
            <span className="text-2xl">🌙</span>
          </div>
          <h1 className="text-xl font-semibold text-white drop-shadow">MindCare AI</h1>
          <p className="text-sm text-white/60 mt-1 drop-shadow">마음이 힘들 때, 조용히 곁에 있을게요</p>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20 backdrop-blur-sm transition-colors"
                placeholder="example@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20 backdrop-blur-sm transition-colors"
                placeholder="비밀번호 입력"
                required
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
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <p className="text-center text-xs text-white/40 mt-6">
            계정이 없으신가요?{' '}
            <Link to="/register" className="text-white/70 hover:text-white transition-colors">
              회원가입
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
