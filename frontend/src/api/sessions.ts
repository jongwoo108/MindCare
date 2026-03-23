import { api } from './client'

export interface Session {
  id: string
  status: string
  therapeutic_approach: string | null
  risk_level: number
  message_count: number
  created_at: string
  last_activity_at: string
}

export const sessionsApi = {
  create: () => api.post<Session>('/sessions'),
  list: () => api.get<{ items: Session[]; total: number }>('/sessions'),
}
