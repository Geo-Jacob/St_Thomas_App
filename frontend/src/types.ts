export type Member = {
  id: number
  display_name: string
  first_name: string
  last_name: string
  house_name: string
  phone_number: string
  date_of_birth: string | null
  relation_to_family: 'FATHER' | 'MOTHER' | 'SON' | 'DAUGHTER' | 'OTHER'
  is_deceased?: boolean
  is_family_head?: boolean
  family: number | null
  family_name: string
  family_code?: string
  unit_name: string
  unit_code?: string
  ward_name: string
  ward_code?: string
}

export type CertificateType = 'BAPTISM' | 'MARRIAGE'

export type CertificateRequest = {
  id: number
  certificate_type: CertificateType
  user: number
  applicant_name: string
  notes: string
  status: 'PENDING' | 'APPROVED' | 'ISSUED'
  approval_token: string | null
  qr_payload: string
  qr_code: string
  pdf_file: string
  created_at: string
  updated_at: string
  issued_at: string | null
}

export type Ward = {
  id: number
  name: string
  name_ml: string
  code: string
}

export type Unit = {
  id: number
  ward: number
  ward_name: string
  name: string
  name_ml: string
  code: string
}

export type Family = {
  id: number
  unit: number
  unit_name: string
  ward: number
  ward_name: string
  name: string
  name_ml: string
  code: string
}

export type AuthUser = {
  id: number
  display_name: string
  first_name: string
  last_name: string
  phone_number: string
  house_name: string
  date_of_birth?: string | null
  relation_to_family?: 'FATHER' | 'MOTHER' | 'SON' | 'DAUGHTER' | 'OTHER'
  is_deceased?: boolean
  is_family_head?: boolean
  area_ward: string
  family: number | null
  family_name: string
  unit: string
  ward: string
  is_first_login: boolean
  is_staff: boolean
}

export type WeeklyScheduleDay = {
  id?: number
  weekday: number
  weekday_name: string
  weekday_key: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  is_active: boolean
  service_time: string | null
  service_label: string
  service_slots: Array<{ time: string; label: string }>
  effective_from: string
  effective_to: string | null
}

export type WeeklyScheduleResponse = {
  reference_date: string
  days: WeeklyScheduleDay[]
}

export type ScheduleEvent = {
  id: number
  title: string
  description: string
  type: 'MASS' | 'MEETING' | 'FESTIVAL' | 'OTHER'
  event_date: string
  location: string
  is_recurring: boolean
  recurrence_rule: string
  created_by: number
  created_by_name: string
}
