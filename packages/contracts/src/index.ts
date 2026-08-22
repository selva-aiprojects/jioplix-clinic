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

export const encounterStatusSchema = z.object({
  status: z.enum(['draft', 'in_progress', 'locked', 'cancelled']).optional(),
})
export type EncounterStatus = z.infer<typeof encounterStatusSchema>['status']

export const encounterCreateSchema = z.object({
  appointmentId: z.string().uuid().optional(),
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  chiefComplaint: z.string().max(2000).optional(),
  historyPresentIllness: z.string().max(4000).optional(),
  examinationFindings: z.string().max(4000).optional(),
  clinicalNotes: z.string().max(4000).optional(),
  followUpDate: z.string().date().optional(),
  followUpNotes: z.string().max(1000).optional(),
})
export type EncounterCreate = z.infer<typeof encounterCreateSchema>

export const encounterUpdateSchema = encounterCreateSchema.partial()
export type EncounterUpdate = z.infer<typeof encounterUpdateSchema>

export const encounterSchema = encounterCreateSchema.extend({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
  encounterDate: z.string().date(),
  isLocked: z.boolean(),
  lockedAt: z.string().datetime().optional(),
  lockedBy: z.string().uuid().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Encounter = z.infer<typeof encounterSchema>

export const vitalsCreateSchema = z.object({
  bpSystolic: z.number().int().positive().optional(),
  bpDiastolic: z.number().int().positive().optional(),
  pulse: z.number().int().positive().optional(),
  temperatureC: z.number().positive().optional(),
  spo2: z.number().int().min(0).max(100).optional(),
  weightKg: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
})
export type VitalsCreate = z.infer<typeof vitalsCreateSchema>

export const vitalsSchema = vitalsCreateSchema.extend({
  id: z.string().uuid(),
  encounterId: z.string().uuid(),
  bmi: z.number().optional(),
  recordedAt: z.string().datetime(),
  recordedBy: z.string().uuid(),
})
export type Vitals = z.infer<typeof vitalsSchema>

export const diagnosisCreateSchema = z.object({
  icd10Code: z.string().min(2).max(10),
  icd10Name: z.string().min(1).max(200),
  type: z.enum(['primary', 'secondary', 'differential']).default('primary'),
})
export type DiagnosisCreate = z.infer<typeof diagnosisCreateSchema>

export const diagnosisSchema = diagnosisCreateSchema.extend({
  id: z.string().uuid(),
  encounterId: z.string().uuid(),
  createdAt: z.string(),
})
export type Diagnosis = z.infer<typeof diagnosisSchema>

export const prescriptionCreateSchema = z.object({
  encounterId: z.string().uuid(),
  patientId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
})
export type PrescriptionCreate = z.infer<typeof prescriptionCreateSchema>

export const prescriptionStatusSchema = z.object({
  status: z.enum(['draft', 'issued', 'dispensed', 'cancelled']),
})
export type PrescriptionStatus = z.infer<typeof prescriptionStatusSchema>['status']

export const prescriptionItemCreateSchema = z.object({
  drugName: z.string().min(1).max(200),
  genericName: z.string().max(200).optional(),
  strength: z.string().max(50).optional(),
  form: z.enum(['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'other']).optional(),
  dosage: z.string().min(1).max(100),
  frequency: z.string().min(1).max(100),
  route: z.enum(['oral', 'topical', 'injection', 'inhaled', 'other']).optional(),
  durationDays: z.number().int().positive().optional(),
  quantity: z.number().int().positive().optional(),
  instructions: z.string().max(500).optional(),
})
export type PrescriptionItemCreate = z.infer<typeof prescriptionItemCreateSchema>

export const prescriptionSchema = prescriptionCreateSchema.extend({
  id: z.string().uuid(),
  doctorId: z.string().uuid(),
  status: z.enum(['draft', 'issued', 'dispensed', 'cancelled']),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(prescriptionItemCreateSchema.extend({
    id: z.string().uuid(),
    prescriptionId: z.string().uuid(),
    sequence: z.number().int().default(0),
  })).optional(),
})
export type Prescription = z.infer<typeof prescriptionSchema>

export const invoiceCreateSchema = z.object({
  encounterId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  patientId: z.string().uuid(),
  lines: z.array(z.object({
    itemType: z.enum(['consultation', 'procedure', 'pharmacy', 'lab', 'other']),
    itemName: z.string().min(1).max(200),
    hsnCode: z.string().max(20).optional(),
    quantity: z.number().int().min(1).default(1),
    unitPricePaise: z.number().int().min(0),
    cgstRate: z.number().min(0).max(100).default(0),
    sgstRate: z.number().min(0).max(100).default(0),
    igstRate: z.number().min(0).max(100).default(0),
  })).min(1),
  discountPaise: z.number().int().min(0).default(0),
})
export type InvoiceCreate = z.infer<typeof invoiceCreateSchema>

export const invoiceSchema = z.object({
  id: z.string().uuid(),
  invoiceNo: z.string(),
  encounterId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  patientId: z.string().uuid(),
  branchId: z.string().uuid(),
  subTotalPaise: z.number().int(),
  discountPaise: z.number().int(),
  cgstPaise: z.number().int(),
  sgstPaise: z.number().int(),
  igstPaise: z.number().int(),
  roundOffPaise: z.number().int(),
  totalPaise: z.number().int(),
  paidPaise: z.number().int(),
  balancePaise: z.number().int(),
  status: z.enum(['draft', 'issued', 'partial', 'paid', 'void', 'refunded']),
  issuedAt: z.string().datetime().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Invoice = z.infer<typeof invoiceSchema>

export const paymentCreateSchema = z.object({
  invoiceId: z.string().uuid(),
  amountPaise: z.number().int().min(1),
  mode: z.enum(['cash', 'upi', 'card', 'online', 'credit']),
  reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
})
export type PaymentCreate = z.infer<typeof paymentCreateSchema>

export const paymentSchema = paymentCreateSchema.extend({
  id: z.string().uuid(),
  receivedBy: z.string().uuid(),
  receivedAt: z.string().datetime(),
})
export type Payment = z.infer<typeof paymentSchema>

export const INVENTORY_CATEGORIES = [
  'medicines',
  'consumables',
  'lab_reagents',
  'dental_materials',
  'clinic_supplies',
  'equipment',
] as const
export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number]

export const STOCK_MOVEMENT_REASONS = ['purchase', 'dispense', 'transfer', 'adjustment'] as const
export type StockMovementReason = (typeof STOCK_MOVEMENT_REASONS)[number]

export const inventoryItemCreateSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(INVENTORY_CATEGORIES),
  unit: z.string().min(1).max(20).default('units'),
  quantity: z.number().int().min(0).default(0),
  reorderLevel: z.number().int().min(0).default(0),
  unitPricePaise: z.number().int().min(0).default(0),
  supplier: z.string().max(200).optional(),
  batchNo: z.string().max(60).optional(),
  expiryDate: z.string().date().optional(),
})
export type InventoryItemCreate = z.infer<typeof inventoryItemCreateSchema>

export const inventoryItemSchema = inventoryItemCreateSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type InventoryItem = z.infer<typeof inventoryItemSchema>

export const stockMovementCreateSchema = z.object({
  delta: z.number().int(),
  reason: z.enum(STOCK_MOVEMENT_REASONS),
  notes: z.string().max(500).optional(),
})
export type StockMovementCreate = z.infer<typeof stockMovementCreateSchema>

export const LAB_ORDER_PRIORITIES = ['routine', 'urgent', 'stat'] as const
export type LabOrderPriority = (typeof LAB_ORDER_PRIORITIES)[number]

export const LAB_ORDER_STATUSES = [
  'ordered',
  'collected',
  'processing',
  'completed',
  'reviewed',
  'cancelled',
] as const
export type LabOrderStatus = (typeof LAB_ORDER_STATUSES)[number]

export const LAB_ORDER_TRANSITIONS: Record<LabOrderStatus, LabOrderStatus[]> = {
  ordered: ['collected', 'cancelled'],
  collected: ['processing', 'cancelled'],
  processing: ['completed', 'cancelled'],
  completed: ['reviewed'],
  reviewed: [],
  cancelled: [],
}

export const labOrderCreateSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  encounterId: z.string().uuid().optional(),
  priority: z.enum(LAB_ORDER_PRIORITIES).default('routine'),
  investigations: z.array(z.object({
    name: z.string().min(1).max(150),
    sampleType: z.string().max(50).optional(),
  })).min(1).max(25),
  notes: z.string().max(1000).optional(),
})
export type LabOrderCreate = z.infer<typeof labOrderCreateSchema>

export const labOrderStatusSchema = z.object({
  status: z.enum(LAB_ORDER_STATUSES),
})

export const labResultEntrySchema = z.object({
  name: z.string().min(1).max(150),
  value: z.string().min(1).max(100),
  unit: z.string().max(30).optional(),
  flag: z.enum(['normal', 'low', 'high']).optional(),
})
export type LabResultEntry = z.infer<typeof labResultEntrySchema>

export const labResultsUpdateSchema = z.object({
  results: z.array(labResultEntrySchema).min(1).max(50),
  complete: z.boolean().default(false),
})

export interface LabOrder {
  id: string
  orderNo: string
  patientId: string
  patientName: string
  encounterId: string | null
  doctorId: string
  doctorName: string
  status: LabOrderStatus
  priority: LabOrderPriority
  investigations: { name: string; sampleType: string | null }[]
  results: { name: string; value: string; unit?: string; flag?: string }[] | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export const PROCEDURE_STATUSES = [
  'ordered',
  'prepared',
  'in_progress',
  'completed',
  'cancelled',
] as const
export type ProcedureStatus = (typeof PROCEDURE_STATUSES)[number]

export const PROCEDURE_TRANSITIONS: Record<ProcedureStatus, ProcedureStatus[]> = {
  ordered: ['prepared', 'cancelled'],
  prepared: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
}

export const procedureOrderCreateSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  name: z.string().min(1).max(200),
  pricePaise: z.number().int().min(0).default(0),
  room: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
})
export type ProcedureOrderCreate = z.infer<typeof procedureOrderCreateSchema>

export const procedureOrderStatusSchema = z.object({
  status: z.enum(PROCEDURE_STATUSES),
})

export interface ProcedureOrder {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  name: string
  pricePaise: number
  room: string | null
  status: ProcedureStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface DispenseQueueItem {
  prescriptionId: string
  patientId: string
  patientName: string
  patientAge: number | null
  patientGender: string | null
  doctorName: string
  status: string
  notes: string | null
  createdAt: string
  items: {
    drugName: string
    strength: string | null
    form: string | null
    dosage: string
    frequency: string
    quantity: number | null
    stockAvailable: boolean
  }[]
}

export { uuidv7 as newId }
