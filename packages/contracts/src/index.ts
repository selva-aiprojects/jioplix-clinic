import { uuidv7 } from 'uuidv7'
import { z } from 'zod'

export const API_PREFIX = 'api/v1'

export const ERROR_CODES = {
  MODULE_DISABLED: 'MODULE_DISABLED',
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  TENANT_SUSPENDED: 'TENANT_SUSPENDED',
  ENCOUNTER_SIGNED: 'ENCOUNTER_SIGNED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

export const ADDON_MODULES = ['pharmacy', 'laboratory', 'inventory', 'procedures', 'multi_branch'] as const
export type AddonModule = (typeof ADDON_MODULES)[number]

export const PLAN_CODES = ['starter', 'professional', 'clinic', 'enterprise'] as const
export type PlanCode = (typeof PLAN_CODES)[number]

export const CLINIC_TYPES = ['general', 'dental', 'pediatric', 'dermatology', 'gynecology'] as const
export type ClinicType = (typeof CLINIC_TYPES)[number]

export const CLINIC_TYPE_LABELS: Record<ClinicType, string> = {
  general: 'General Practice',
  dental: 'Dental Clinic',
  pediatric: 'Pediatric Clinic',
  dermatology: 'Dermatology Clinic',
  gynecology: 'Gynecology Clinic',
}

export function clinicTypeLabel(t: string): string {
  return CLINIC_TYPE_LABELS[t as ClinicType] ?? 'Clinic'
}

export const patientCreateSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().date().optional(),
  gender: z.enum(['M', 'F', 'O']).optional(),
  phone: z.string().regex(/^[0-9+\-\s]{8,15}$/),
  email: z.string().email().optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  abhaNumber: z.string().max(36).optional(),
})
export type PatientCreate = z.infer<typeof patientCreateSchema>

export const patientSchema = patientCreateSchema.extend({
  id: z.string().uuid(),
  mrn: z.string(),
  createdAt: z.string(),
})
export type Patient = z.infer<typeof patientSchema>

export const APPOINTMENT_SOURCES = ['walk_in', 'online', 'whatsapp', 'phone'] as const
export type AppointmentSource = (typeof APPOINTMENT_SOURCES)[number]

export const APPOINTMENT_STATUSES = [
  'scheduled',
  'confirmed',
  'checked_in',
  'in_consultation',
  'completed',
  'cancelled',
  'no_show',
] as const
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

export const QUEUE_STATUSES = ['waiting', 'checked_in', 'consulting', 'completed', 'skipped'] as const
export type QueueStatus = (typeof QUEUE_STATUSES)[number]

export const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ['confirmed', 'checked_in', 'cancelled', 'no_show'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['in_consultation', 'cancelled'],
  in_consultation: ['completed'],
  completed: [],
  cancelled: [],
  no_show: [],
}

export const QUEUE_TRANSITIONS: Record<QueueStatus, QueueStatus[]> = {
  waiting: ['checked_in', 'skipped'],
  checked_in: ['consulting', 'skipped'],
  consulting: ['completed', 'skipped'],
  completed: [],
  skipped: ['waiting'],
}

export const appointmentCreateSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  scheduledAt: z.string().datetime({ offset: true }),
  durationMin: z.number().int().min(5).max(240).optional(),
  source: z.enum(APPOINTMENT_SOURCES).optional(),
  notes: z.string().max(1000).optional(),
})
export type AppointmentCreate = z.infer<typeof appointmentCreateSchema>

export const appointmentStatusSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES),
})

export const queueStatusSchema = z.object({
  status: z.enum(QUEUE_STATUSES),
})

export const loginSchema = z.object({
  clinic: z.string().min(2).max(63).regex(/^[a-z0-9-]+$/),
  phone: z.string().regex(/^[0-9+\-\s]{8,15}$/),
  password: z.string().min(8).max(128),
})
export type LoginRequest = z.infer<typeof loginSchema>

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
})
export type RefreshRequest = z.infer<typeof refreshSchema>

export interface AuthContext {
  userId: string
  tenantId: string
  schemaName: string
  slug: string
  roles: string[]
  permissions: string[]
}

export function permissionMatches(granted: string[], required: string): boolean {
  if (granted.includes('*')) return true
  if (granted.includes(required)) return true
  const mod = required.split(':')[0]
  return granted.includes(`${mod}:*`)
}

export function hasAllPermissions(granted: string[], required: string[]): boolean {
  return required.every((r) => permissionMatches(granted, r))
}

export { uuidv7 as newId }
