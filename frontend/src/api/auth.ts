import { api } from './client'

export interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

export const authApi = {
  register: (email: string, password: string, name: string) =>
    api.post('/auth/register', { email, password, name }),

  login: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password }),
}
