import { create } from 'zustand'
import { decodeTokenRole } from '../api/auth'

interface AuthState {
  token: string | null
  role: string
  isLoggedIn: boolean
  setTokens: (access: string, refresh: string) => void
  logout: () => void
}

const storedToken = localStorage.getItem('access_token')

export const useAuthStore = create<AuthState>((set) => ({
  token: storedToken,
  role: storedToken ? decodeTokenRole(storedToken) : 'user',
  isLoggedIn: !!storedToken,

  setTokens: (access, refresh) => {
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    set({ token: access, role: decodeTokenRole(access), isLoggedIn: true })
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ token: null, role: 'user', isLoggedIn: false })
  },
}))
