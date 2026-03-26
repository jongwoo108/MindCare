import { api } from './client'

export interface DoctorProfile {
  id: string
  user_id: string
  license_number: string
  hospital: string
  department: string
  specialties: string[]
  bio: string | null
  max_patients: number
  is_verified: boolean
  is_accepting: boolean
}

export interface DoctorRegisterRequest {
  license_number: string
  hospital: string
  department: string
  specialties: string[]
  bio?: string
  max_patients: number
}

export interface PatientCase {
  id: string
  summary: string
  keywords: string[]
  risk_label: string
  recommended_specialties: string[]
  is_matched: boolean
  created_at: string
}

export interface MatchRequest {
  patient_case_id: string
  doctor_message?: string
}

export interface MatchRecord {
  id: string
  doctor_id: string
  patient_case_id: string
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  doctor_message: string | null
  patient_message: string | null
  created_at: string
}

export interface PsychiatricReport {
  match_id: string
  case: {
    summary: string
    keywords: string[]
    risk_label: string
    risk_level: number
    recommended_specialties: string[]
    created_at: string
  }
  assessment: {
    phq_score: number
    gad_score: number
    suicide_flag: boolean
    initial_risk_level: number
    chief_complaint: string | null
  } | null
  clinical_note: {
    subjective: string
    objective: string
    assessment: string
    plan: string
    risk_level: number
    therapeutic_approach: string | null
    message_count: number
  } | null
}

export const doctorApi = {
  registerProfile: (data: DoctorRegisterRequest) =>
    api.post<DoctorProfile>('/doctors/register', data),

  getMyProfile: () =>
    api.get<DoctorProfile>('/doctors/me'),

  updateMyProfile: (data: DoctorRegisterRequest) =>
    api.patch<DoctorProfile>('/doctors/me', data),

  listCases: (page = 1, limit = 20, riskMin = 0) =>
    api.get<{ items: PatientCase[]; total: number; page: number; limit: number }>(
      `/doctors/cases?page=${page}&limit=${limit}&risk_min=${riskMin}`
    ),

  requestMatch: (data: MatchRequest) =>
    api.post<MatchRecord>('/doctors/matches', data),

  listMyMatches: () =>
    api.get<MatchRecord[]>('/doctors/matches'),

  getPatientMatch: () =>
    api.get<MatchRecord | null>('/doctors/my-match'),

  respondToMatch: (matchId: string, accept: boolean, patientMessage?: string) =>
    api.post<MatchRecord>(`/doctors/my-match/${matchId}/respond`, {
      accept,
      patient_message: patientMessage || null,
    }),

  getMatchReport: (matchId: string) =>
    api.get<PsychiatricReport>(`/doctors/matches/${matchId}/report`),
}
