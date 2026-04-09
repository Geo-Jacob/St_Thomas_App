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
