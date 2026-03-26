import { api } from './client'

export interface AssessmentAnswers {
  q1: number; q2: number; q3: number; q4: number; q5: number
  q6: number; q7: number; q8: number; q9: number
}

export interface AssessmentResult {
  id: string
  session_id: string
  phq_score: number
  gad_score: number
  suicide_flag: boolean
  initial_risk_level: number
  chief_complaint: string | null
}

export interface AssessmentStatus {
  has_recent: boolean
  days_since_last: number | null
  last_risk_level: number | null
  last_chief_complaint: string | null
}

export interface FollowUpRecommendation {
  type: 'phq_extended' | 'gad_extended' | 'crisis_detailed'
  reason: string
  priority: number
}

export interface GreetingResult {
  content: string
  quick_replies: string[]
  follow_ups: FollowUpRecommendation[]
}

export interface FollowUpQuestion {
  key: string
  text: string
  scale?: 'binary'
}

export const assessmentApi = {
  getStatus: () =>
    api.get<AssessmentStatus>('/users/me/assessment-status'),

  submit: (sessionId: string, answers: AssessmentAnswers, chief_complaint?: string) =>
    api.post<AssessmentResult>(`/sessions/${sessionId}/assessment`, {
      answers,
      chief_complaint: chief_complaint || null,
    }),

  greeting: (sessionId: string) =>
    api.post<GreetingResult>(`/sessions/${sessionId}/greeting`),

  returningGreeting: (sessionId: string) =>
    api.post<GreetingResult>(`/sessions/${sessionId}/returning-greeting`),

  getFollowUpQuestions: (sessionId: string, type: string) =>
    api.get<{ followup_type: string; questions: FollowUpQuestion[] }>(
      `/sessions/${sessionId}/followup/${type}`
    ),

  submitFollowUp: (sessionId: string, followup_type: string, answers: Record<string, number>) =>
    api.post<{ followup_type: string; updated_risk_level: number }>(
      `/sessions/${sessionId}/followup`,
      { followup_type, answers }
    ),
}
