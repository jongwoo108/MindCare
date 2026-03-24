import { api } from './client'

export interface ReviewItem {
  id: string
  session_id: string
  user_id: string
  risk_level: number
  risk_factors: string[]
  ai_response: string
  context_summary: string | null
  status: 'pending' | 'approved' | 'modified'
  created_at: string
}

export interface FeedbackPayload {
  session_id: string
  pending_response_id: string
  action: 'approve' | 'modify'
  modified_content?: string
  feedback_category?: 'response_quality' | 'safety' | 'clinical_accuracy'
  feedback_note?: string
}

export const expertApi = {
  getQueue: (token: string) =>
    api.get<{ items: ReviewItem[]; total: number }>(`/expert/queue?token=${token}`),

  submitFeedback: (payload: FeedbackPayload, token: string) =>
    api.post(`/expert/feedback?token=${token}`, payload),
}
