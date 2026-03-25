import { api } from './client'

export interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

export const authApi = {
  register: (email: string, password: string, name: string, role = 'user') =>
    api.post('/auth/register', { email, password, name, role }),

  login: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password }),
}

/** JWT payload 디코딩 (서명 검증 없음 — 클라이언트 라우팅용) */
export function decodeTokenRole(token: string): string {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return decoded.role ?? 'user'
  } catch {
    return 'user'
  }
}
