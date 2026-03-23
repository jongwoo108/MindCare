import { create } from 'zustand'

interface AuthState {
  token: string | null
  isLoggedIn: boolean
  setTokens: (access: string, refresh: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('access_token'),
  isLoggedIn: !!localStorage.getItem('access_token'),

  setTokens: (access, refresh) => {
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    set({ token: access, isLoggedIn: true })
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ token: null, isLoggedIn: false })
  },
}))
