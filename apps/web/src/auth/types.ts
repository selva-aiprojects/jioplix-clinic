export interface ClinicInfo {
  id: string
  name: string
  slug: string
  clinicType: string
}

export interface SessionUser {
  id: string
  fullName: string
  phone: string
  specialty: string | null
  roles: string[]
  permissions: string[]
  clinic: ClinicInfo
}
