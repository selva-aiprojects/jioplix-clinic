import type { SessionUser } from '../auth/types'

const BASE_URL = import.meta.env.VITE_API_URL
  ?? (import.meta.env.PROD
    ? 'https://jioplix-clinic-svc.onrender.com/api/v1'
    : 'http://localhost:3000/api/v1')
const STORAGE_KEY = 'jioplix.session.v1'

export interface Session {
  accessToken: string
  refreshToken: string
  user: SessionUser
}

export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, status: number) {
    super(code)
    this.code = code
    this.status = status
  }
}

export function loadStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Session
    return parsed.accessToken && parsed.refreshToken && parsed.user ? parsed : null
  } catch {
    return null
  }
}

export function storeSession(session: Session | null): void {
  if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  else localStorage.removeItem(STORAGE_KEY)
}

let currentSession: Session | null = loadStoredSession()
let sessionExpiredHandler: (() => void) | null = null

export function getSession(): Session | null {
  return currentSession
}

export function setSession(session: Session | null): void {
  currentSession = session
  storeSession(session)
}

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  sessionExpiredHandler = handler
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  auth?: boolean
}

let refreshInFlight: Promise<boolean> | null = null

async function requestRefresh(): Promise<boolean> {
  const session = currentSession
  if (!session) return false

  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      })
      if (!res.ok) {
        setSession(null)
        return false
      }
      const body = (await res.json()) as { data: Session }
      setSession(body.data)
      return true
    } catch {
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

export async function api<T>(path: string, opts: RequestOptions = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = {}
  if (opts.body !== undefined) headers['content-type'] = 'application/json'
  if (opts.auth !== false) {
    const session = currentSession
    if (session) headers.authorization = `Bearer ${session.accessToken}`
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  } catch {
    throw new ApiError('NETWORK_ERROR', 0)
  }

  if (res.status === 401 && !retried && opts.auth !== false) {
    const refreshed = await requestRefresh()
    if (refreshed) return api<T>(path, opts, true)
    sessionExpiredHandler?.()
  }

  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    const envelope = body as { error?: { code?: string } } | null
    throw new ApiError(envelope?.error?.code ?? 'UNKNOWN', res.status)
  }

  return (body as { data: T }).data
}

export async function loginRequest(
  clinic: string,
  phone: string,
  password: string,
): Promise<Session> {
  const data = await api<Session>('/auth/login', {
    method: 'POST',
    body: { clinic, phone, password },
    auth: false,
  })
  setSession(data)
  return data
}

export async function logoutRequest(): Promise<void> {
  const session = currentSession
  if (!session) return
  try {
    await api('/auth/logout', {
      method: 'POST',
      body: { refreshToken: session.refreshToken },
      auth: false,
    })
  } catch {
    /* best-effort */
  }
  setSession(null)
}

export interface Patient {
  id: string
  mrn: string
  firstName: string
  lastName: string
  dateOfBirth?: string
  gender?: string
  phone: string
  email?: string
  address?: Record<string, string>
  bloodGroup?: string
  abhaNumber?: string
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export interface Appointment {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  scheduledAt: string
  durationMin: number
  source: string
  status: string
  notes?: string
}

export interface QueueToken {
  id: string
  tokenNo: number
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  appointmentId?: string
  status: string
  issuedAt: string
}

export async function listPatients(): Promise<Patient[]> {
  return api<Patient[]>('/patients')
}

export async function getPatient(id: string): Promise<Patient> {
  return api<Patient>(`/patients/${id}`)
}

export async function listAppointments(date: string, doctorId?: string): Promise<Appointment[]> {
  const qs = new URLSearchParams({ date })
  if (doctorId) qs.set('doctorId', doctorId)
  return api<Appointment[]>(`/appointments?${qs.toString()}`)
}

export async function updateAppointmentStatus(id: string, status: string): Promise<{ id: string; status: string }> {
  return api(`/appointments/${id}/status`, { method: 'PATCH', body: { status } })
}

export async function listQueue(date: string): Promise<{ tokens: QueueToken[]; waiting: number }> {
  return api<{ tokens: QueueToken[]; waiting: number }>(`/queue?date=${encodeURIComponent(date)}`)
}

export interface Encounter {
  id: string
  patientId: string
  patientName: string
  appointmentId?: string
  doctorId: string
  doctorName: string
  encounterDate: string
  chiefComplaint?: string
  historyPresentIllness?: string
  examinationFindings?: string
  clinicalNotes?: string
  followUpDate?: string
  followUpNotes?: string
  isLocked: boolean
  lockedAt?: string
  lockedBy?: string
  vitals?: Vitals | null
  diagnoses: Diagnosis[]
  createdAt: string
  updatedAt: string
}

export interface Vitals {
  id: string
  encounterId: string
  bpSystolic?: number
  bpDiastolic?: number
  pulse?: number
  temperatureC?: number
  spo2?: number
  weightKg?: number
  heightCm?: number
  bmi?: number
  recordedAt: string
  recordedBy: string
}

export interface Diagnosis {
  id: string
  encounterId: string
  icd10Code: string
  icd10Name: string
  type: string
  createdAt: string
}

export interface Prescription {
  id: string
  encounterId: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  status: string
  notes?: string
  items: PrescriptionItem[]
  createdAt: string
  updatedAt: string
}

export interface PrescriptionItem {
  id: string
  prescriptionId: string
  drugName: string
  genericName?: string
  strength?: string
  form?: string
  dosage: string
  frequency: string
  route?: string
  durationDays?: number
  quantity?: number
  instructions?: string
  sequence: number
}

export interface Invoice {
  id: string
  invoiceNo: string
  encounterId?: string
  appointmentId?: string
  patientId: string
  patientName: string
  branchId: string
  subTotalPaise: number
  discountPaise: number
  cgstPaise: number
  sgstPaise: number
  igstPaise: number
  roundOffPaise: number
  totalPaise: number
  paidPaise: number
  balancePaise: number
  status: string
  issuedAt?: string
  lines: InvoiceLine[]
  payments: Payment[]
  createdAt: string
  updatedAt: string
}

export interface InvoiceLine {
  id: string
  itemType: string
  itemName: string
  hsnCode?: string
  quantity: number
  unitPricePaise: number
  lineTotalPaise: number
  cgstRate: number
  sgstRate: number
  igstRate: number
}

export interface Payment {
  id: string
  invoiceId: string
  amountPaise: number
  mode: string
  reference?: string
  receivedBy: string
  receivedAt: string
  notes?: string
}

export async function createEncounter(data: {
  patientId: string
  doctorId: string
  appointmentId?: string
  chiefComplaint?: string
  historyPresentIllness?: string
  examinationFindings?: string
  clinicalNotes?: string
  followUpDate?: string
  followUpNotes?: string
}): Promise<Encounter> {
  return api<Encounter>('/encounters', { method: 'POST', body: data })
}

export async function getEncounter(id: string): Promise<Encounter> {
  return api<Encounter>(`/encounters/${id}`)
}

export interface PatientEncounterSummary {
  id: string
  doctorName: string
  encounterDate: string
  chiefComplaint: string | null
  examinationFindings: string | null
  isLocked: boolean
  diagnoses: { icd10Code: string; icd10Name: string; type: string }[]
  createdAt: string
}

export async function listPatientEncounters(patientId: string): Promise<PatientEncounterSummary[]> {
  return api<PatientEncounterSummary[]>(`/patients/${patientId}/encounters`)
}

export async function updateEncounter(id: string, data: {
  chiefComplaint?: string
  historyPresentIllness?: string
  examinationFindings?: string
  clinicalNotes?: string
  followUpDate?: string
  followUpNotes?: string
}): Promise<{ id: string; updatedAt: string }> {
  return api(`/encounters/${id}`, { method: 'PATCH', body: data })
}

export async function addVitals(encounterId: string, data: {
  bpSystolic?: number
  bpDiastolic?: number
  pulse?: number
  temperatureC?: number
  spo2?: number
  weightKg?: number
  heightCm?: number
}): Promise<Vitals> {
  return api<Vitals>(`/encounters/${encounterId}/vitals`, { method: 'POST', body: data })
}

export async function addDiagnosis(encounterId: string, data: {
  icd10Code: string
  icd10Name: string
  type?: 'primary' | 'secondary' | 'differential'
}): Promise<Diagnosis> {
  return api<Diagnosis>(`/encounters/${encounterId}/diagnoses`, { method: 'POST', body: data })
}

export async function lockEncounter(id: string): Promise<{ id: string; isLocked: boolean; lockedAt?: string }> {
  return api(`/encounters/${id}/lock`, { method: 'POST' })
}

export async function createPrescription(data: {
  encounterId: string
  patientId: string
  notes?: string
}): Promise<Prescription> {
  return api<Prescription>('/prescriptions', { method: 'POST', body: data })
}

export async function getPrescription(id: string): Promise<Prescription> {
  return api<Prescription>(`/prescriptions/${id}`)
}

export async function listPrescriptionsByEncounter(encounterId: string): Promise<Prescription[]> {
  return api<Prescription[]>(`/prescriptions?encounterId=${encodeURIComponent(encounterId)}`)
}

export async function updatePrescriptionStatus(id: string, status: string): Promise<{ id: string; status: string; updatedAt: string }> {
  return api(`/prescriptions/${id}/status`, { method: 'PATCH', body: { status } })
}

export async function addPrescriptionItem(prescriptionId: string, data: {
  drugName: string
  genericName?: string
  strength?: string
  form?: string
  dosage: string
  frequency: string
  route?: string
  durationDays?: number
  quantity?: number
  instructions?: string
}): Promise<PrescriptionItem> {
  return api<PrescriptionItem>(`/prescriptions/${prescriptionId}/items`, { method: 'POST', body: data })
}

export async function createInvoice(data: {
  patientId: string
  encounterId?: string
  appointmentId?: string
  lines: Array<{
    itemType: 'consultation' | 'procedure' | 'pharmacy' | 'lab' | 'other'
    itemName: string
    hsnCode?: string
    quantity?: number
    unitPricePaise: number
    cgstRate?: number
    sgstRate?: number
    igstRate?: number
  }>
  discountPaise?: number
}): Promise<Invoice> {
  return api<Invoice>('/invoices', { method: 'POST', body: data })
}

export async function getInvoice(id: string): Promise<Invoice> {
  return api<Invoice>(`/invoices/${id}`)
}

export async function listInvoices(filters?: { patientId?: string; status?: string }): Promise<Invoice[]> {
  const qs = new URLSearchParams()
  if (filters?.patientId) qs.set('patientId', filters.patientId)
  if (filters?.status) qs.set('status', filters.status)
  const q = qs.toString()
  return api<Invoice[]>(`/invoices${q ? `?${q}` : ''}`)
}

export async function addPayment(invoiceId: string, data: {
  amountPaise: number
  mode: 'cash' | 'upi' | 'card' | 'online' | 'credit'
  reference?: string
  notes?: string
}): Promise<{ id: string; paidPaise: number; balancePaise: number; status: string; updatedAt: string }> {
  return api(`/invoices/${invoiceId}/payments`, { method: 'POST', body: { ...data, invoiceId } })
}

export async function getPatientOutstanding(patientId: string): Promise<{ patientId: string; outstandingPaise: number }> {
  return api(`/invoices/patient/${patientId}/outstanding`)
}

export function describeApiError(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case 'NETWORK_ERROR': return 'Cannot reach the server. Check your connection and try again.'
      case 'VALIDATION_FAILED': return 'Some details are invalid. Please review the highlighted fields.'
      case 'PERMISSION_DENIED': return 'Your account does not have permission to perform this action.'
      case 'PATIENT_NOT_FOUND': return 'The selected patient no longer exists.'
      case 'DOCTOR_NOT_FOUND': return 'The selected doctor is no longer available.'
      case 'ITEM_NOT_FOUND': return 'That inventory item no longer exists.'
      case 'LAB_ORDER_NOT_FOUND': return 'That lab order no longer exists.'
      case 'PROCEDURE_ORDER_NOT_FOUND': return 'That procedure order no longer exists.'
      case 'INSUFFICIENT_STOCK': return 'Not enough stock on hand for that movement.'
      case 'INVALID_TRANSITION': return 'That status change is not allowed for this record.'
      case 'RESULTS_REQUIRED': return 'Enter results before completing this lab order.'
      case 'SAMPLE_NOT_COLLECTED': return 'Collect the sample before entering results.'
      case 'PRESCRIPTION_NOT_ISSUED': return 'Only issued prescriptions can be dispensed.'
      default: return e.code.replaceAll('_', ' ').toLowerCase()
    }
  }
  return 'Something went wrong. Please try again.'
}

export interface PatientCreateInput {
  firstName: string
  lastName: string
  phone: string
  dateOfBirth?: string
  gender?: 'M' | 'F' | 'O'
  email?: string
  bloodGroup?: string
  abhaNumber?: string
}

export async function createPatient(data: PatientCreateInput): Promise<Patient> {
  return api<Patient>('/patients', { method: 'POST', body: data })
}

export interface DoctorOption {
  id: string
  fullName: string
  specialty: string | null
}

export async function listDoctors(): Promise<DoctorOption[]> {
  return api<DoctorOption[]>('/appointments/doctors')
}

export interface AppointmentCreateInput {
  patientId: string
  doctorId: string
  scheduledAt: string
  durationMin?: number
  source?: 'walk_in' | 'online' | 'whatsapp' | 'phone'
  notes?: string
}

export async function createAppointment(data: AppointmentCreateInput): Promise<Appointment> {
  return api<Appointment>('/appointments', { method: 'POST', body: data })
}

export interface InventoryItem {
  id: string
  name: string
  category: 'medicines' | 'consumables' | 'lab_reagents' | 'dental_materials' | 'clinic_supplies' | 'equipment'
  unit: string
  quantity: number
  reorderLevel: number
  unitPricePaise: number
  supplier?: string
  batchNo?: string
  expiryDate?: string
  createdAt: string
  updatedAt: string
}

export async function listInventoryItems(filters?: { category?: string; search?: string }): Promise<InventoryItem[]> {
  const qs = new URLSearchParams()
  if (filters?.category) qs.set('category', filters.category)
  if (filters?.search) qs.set('search', filters.search)
  const q = qs.toString()
  return api<InventoryItem[]>(`/inventory/items${q ? `?${q}` : ''}`)
}

export async function createInventoryItem(data: {
  name: string
  category: InventoryItem['category']
  unit?: string
  quantity?: number
  reorderLevel?: number
  unitPricePaise?: number
  supplier?: string
  batchNo?: string
  expiryDate?: string
}): Promise<InventoryItem> {
  return api<InventoryItem>('/inventory/items', { method: 'POST', body: data })
}

export async function adjustStock(id: string, data: {
  delta: number
  reason: 'purchase' | 'dispense' | 'transfer' | 'adjustment'
  notes?: string
}): Promise<InventoryItem> {
  return api<InventoryItem>(`/inventory/items/${id}/stock`, { method: 'PATCH', body: data })
}

export interface LabOrder {
  id: string
  orderNo: string
  patientId: string
  patientName: string
  encounterId?: string
  doctorId: string
  doctorName: string
  status: 'ordered' | 'collected' | 'processing' | 'completed' | 'reviewed' | 'cancelled'
  priority: 'routine' | 'urgent' | 'stat'
  investigations: { name: string; sampleType?: string }[]
  results: { name: string; value: string; unit?: string; flag?: string }[] | null
  notes?: string
  createdAt: string
  updatedAt: string
}

export async function listLabOrders(date?: string): Promise<LabOrder[]> {
  return api<LabOrder[]>(`/lab-orders${date ? `?date=${encodeURIComponent(date)}` : ''}`)
}

export async function createLabOrder(data: {
  patientId: string
  doctorId: string
  priority?: 'routine' | 'urgent' | 'stat'
  investigations: { name: string; sampleType?: string }[]
  notes?: string
}): Promise<LabOrder> {
  return api<LabOrder>('/lab-orders', { method: 'POST', body: data })
}

export async function updateLabOrderStatus(id: string, status: LabOrder['status']): Promise<LabOrder> {
  return api<LabOrder>(`/lab-orders/${id}/status`, { method: 'PATCH', body: { status } })
}

export async function saveLabResults(id: string, results: { name: string; value: string; unit?: string; flag?: 'normal' | 'low' | 'high' }[], complete: boolean): Promise<LabOrder> {
  return api<LabOrder>(`/lab-orders/${id}/results`, { method: 'PUT', body: { results, complete } })
}

export interface ProcedureOrder {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  name: string
  pricePaise: number
  room?: string
  status: 'ordered' | 'prepared' | 'in_progress' | 'completed' | 'cancelled'
  notes?: string
  createdAt: string
  updatedAt: string
}

export async function listProcedureOrders(date?: string): Promise<ProcedureOrder[]> {
  return api<ProcedureOrder[]>(`/procedure-orders${date ? `?date=${encodeURIComponent(date)}` : ''}`)
}

export async function createProcedureOrder(data: {
  patientId: string
  doctorId: string
  name: string
  pricePaise?: number
  room?: string
  notes?: string
}): Promise<ProcedureOrder> {
  return api<ProcedureOrder>('/procedure-orders', { method: 'POST', body: data })
}

export async function updateProcedureOrderStatus(id: string, status: ProcedureOrder['status']): Promise<ProcedureOrder> {
  return api<ProcedureOrder>(`/procedure-orders/${id}/status`, { method: 'PATCH', body: { status } })
}

export interface DispenseQueueItem {
  prescriptionId: string
  patientId: string
  patientName: string
  patientAge?: number
  patientGender?: string
  doctorName: string
  status: string
  notes?: string
  createdAt: string
  items: {
    drugName: string
    strength?: string
    form?: string
    dosage: string
    frequency: string
    quantity?: number
    stockAvailable: boolean
  }[]
}

export async function listDispenseQueue(): Promise<DispenseQueueItem[]> {
  return api<DispenseQueueItem[]>('/pharmacy/dispense-queue')
}

export async function dispensePrescription(prescriptionId: string): Promise<DispenseQueueItem> {
  return api<DispenseQueueItem>(`/pharmacy/prescriptions/${prescriptionId}/dispense`, { method: 'POST' })
}

/* ============================ Drug Master ============================ */

export interface DrugMasterEntry {
  id: string
  brand: string
  generic: string
  strength: string | null
  form: string | null
  commonDosages: string[]
  commonFrequencies: string[]
  commonDurations: number[]
  category: string | null
}

export async function searchDrugsApi(q = '', limit = 12): Promise<DrugMasterEntry[]> {
  const qs = new URLSearchParams({ q, limit: String(limit) })
  return api<DrugMasterEntry[]>(`/drugs?${qs.toString()}`)
}

/* ============================ ICD-10 ============================ */

export interface Icd10Entry {
  id: string
  code: string
  name: string
  isCommon: boolean
}

export async function searchIcd10Api(q = '', limit = 12): Promise<Icd10Entry[]> {
  const qs = new URLSearchParams({ q, limit: String(limit) })
  return api<Icd10Entry[]>(`/icd10?${qs.toString()}`)
}

/* ============================ Rx Templates ============================ */

export interface RxTemplateItem {
  id: string
  drugName: string
  genericName: string | null
  strength: string | null
  form: string | null
  dosage: string
  frequency: string
  durationDays: number | null
  instructions: string | null
  sequence: number
}

export interface RxTemplate {
  id: string
  name: string
  category: string
  createdBy: string | null
  createdAt: string
  items: RxTemplateItem[]
}

export async function listRxTemplatesApi(): Promise<RxTemplate[]> {
  return api<RxTemplate[]>('/rx-templates')
}

export async function saveRxTemplateApi(input: {
  name: string
  category: string
  items: Array<Partial<RxTemplateItem> & { drugName: string; dosage: string; frequency: string }>
}): Promise<RxTemplate> {
  return api<RxTemplate>('/rx-templates', { method: 'POST', body: input })
}

export async function deleteRxTemplateApi(id: string): Promise<{ id: string }> {
  return api<{ id: string }>(`/rx-templates/${id}`, { method: 'DELETE' })
}

/* ============================ Notifications ============================ */

export type NotificationCategory = 'clinical' | 'billing' | 'system' | 'engagement'

export interface AppNotification {
  id: string
  recipientUserId: string | null
  category: NotificationCategory
  title: string
  body: string
  href: string | null
  isRead: boolean
  createdAt: string
}

export async function listNotifications(unread?: boolean): Promise<AppNotification[]> {
  const qs = new URLSearchParams()
  if (unread) qs.set('unread', 'true')
  const q = qs.toString()
  return api<AppNotification[]>(`/notifications${q ? `?${q}` : ''}`)
}

export async function markNotificationRead(id: string): Promise<{ id: string; isRead: boolean }> {
  return api<{ id: string; isRead: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' })
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  return api<{ updated: number }>('/notifications/mark-all-read', { method: 'POST' })
}

export async function pushNotificationApi(input: {
  category: NotificationCategory
  title: string
  body: string
  href?: string | null
}): Promise<AppNotification> {
  return api<AppNotification>('/notifications', { method: 'POST', body: input })
}

/* ============================ AI Jobs (Draft with AI) ============================ */

export interface AiJobDraftItem {
  drugName: string
  genericName?: string
  strength?: string
  form?: string
  dosage: string
  frequency: string
  durationDays?: number
  instructions?: string
}

export interface AiJobResult {
  soap: {
    chiefComplaint: string
    historyPresentIllness: string
    examinationFindings: string
    clinicalNotes: string
  }
  suggestions: AiJobDraftItem[]
}

export interface AiJob {
  id: string
  encounterId: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  context: { chiefComplaint?: string; history?: string; extractedText?: string } | null
  result: AiJobResult | null
  createdAt: string
  updatedAt: string
}

export async function createAiJob(input: {
  encounterId?: string
  context?: { chiefComplaint?: string; history?: string; extractedText?: string }
}): Promise<AiJob> {
  return api<AiJob>('/ai-jobs', { method: 'POST', body: input })
}

export async function getAiJob(id: string): Promise<AiJob> {
  return api<AiJob>(`/ai-jobs/${id}`)
}

/* ============================ Vitals History ============================ */

export interface VitalsSnapshot {
  date: string
  bpSystolic: number | null
  bpDiastolic: number | null
  pulse: number | null
  weightKg: number | null
}

export async function listVitalsHistory(patientId: string): Promise<VitalsSnapshot[]> {
  return api<VitalsSnapshot[]>(`/patients/${patientId}/vitals`)
}

/* ============================ Registration ============================ */

export interface PlanOption {
  code: string
  name: string
  monthlyPricePaise: number
  addons: string[]
}

export interface RegistrationResult {
  tenantId: string
  slug: string
  planCode: string
  message: string
}

export async function listPlans(): Promise<PlanOption[]> {
  return api<PlanOption[]>('/auth/plans', { auth: false })
}

export async function registerClinic(data: {
  clinicName: string
  slug: string
  clinicType?: string
  planCode?: string
  adminName: string
  phone: string
  email: string
  password: string
}): Promise<RegistrationResult> {
  return api<RegistrationResult>('/auth/register', { method: 'POST', body: data, auth: false })
}

/* ============================ Subscriptions ============================ */

export interface TenantSubscription {
  id: string
  tenantId: string
  planCode: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  trialEnd: string | null
}

export async function getCurrentSubscription(): Promise<TenantSubscription | null> {
  return api<TenantSubscription | null>('/subscriptions/current')
}

export async function renewSubscription(planCode?: string): Promise<TenantSubscription> {
  return api<TenantSubscription>('/subscriptions/renew', { method: 'POST', body: { planCode } })
}

/* ============================ Payments (Razorpay) ============================ */

export const RAZORPAY_PAYMENT_LINK = 'https://razorpay.me/@balakrishnanselvakumar'

export async function createPaymentOrder(amountPaise: number, planCode: string): Promise<{ orderId: string; amount: number; currency: string }> {
  return api('/payments/create-order', { method: 'POST', body: { amountPaise, planCode } })
}

export async function verifyPayment(data: {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}): Promise<{ verified: boolean; paymentId: string }> {
  return api('/payments/verify', { method: 'POST', body: data })
}

/* ============================ Platform Admin ============================ */

export interface PlatformAdminUser {
  userId: string
  email: string
  fullName: string
  role: string
}

export interface PlatformTenant {
  id: string
  name: string
  slug: string
  status: string
  planCode: string
  clinicType: string
  createdAt: string
  subscription: { status: string; planCode: string; periodEnd: string } | null
}

export interface PlatformDashboard {
  totalTenants: number
  activeTenants: number
  suspendedTenants: number
  trialingTenants: number
  revenue: { totalPending: number; totalPaid: number }
}

export async function platformLogin(email: string, password: string): Promise<{ accessToken: string; user: PlatformAdminUser }> {
  const data = await api<{ accessToken: string; user: PlatformAdminUser }>('/platform/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  })
  return data
}

export async function platformListTenants(): Promise<PlatformTenant[]> {
  return api<PlatformTenant[]>('/platform/tenants')
}

export async function platformTenantAction(tenantId: string, action: 'suspend' | 'unsuspend' | 'offboard'): Promise<{ id: string; status: string }> {
  return api('/platform/tenants/action', { method: 'POST', body: { tenantId, action } })
}

export async function platformDashboard(): Promise<PlatformDashboard> {
  return api<PlatformDashboard>('/platform/dashboard')
}

/* ============================ Platform Settings ============================ */

export interface PlatformSettings {
  payment_enabled: boolean
  registration_enabled: boolean
  trial_days: number
  grace_period_days: number
  platform_name: string
  support_email: string
  support_phone: string
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  return api<PlatformSettings>('/platform/settings')
}

export async function updatePlatformSettings(settings: Partial<PlatformSettings>): Promise<PlatformSettings> {
  return api<PlatformSettings>('/platform/settings', { method: 'PUT', body: settings })
}

/* ============================ Analytics ============================ */

export interface AnalyticsSummary {
  period: { from: string; to: string }
  revenue: { billedPaise: number; collectedPaise: number; pendingPaise: number }
  patients: { total: number; new: number; returning: number }
  appointments: { total: number; completed: number; cancelled: number; noShow: number }
  consultations: { total: number; avgPerDay: number }
  topDrugs: Array<{ drugName: string; count: number }>
}

export interface DailyRevenue {
  date: string
  billed: number
  collected: number
}

export interface DailyPatients {
  date: string
  count: number
}

export async function getAnalyticsSummary(dateFrom?: string, dateTo?: string, branchId?: string): Promise<AnalyticsSummary> {
  const params = new URLSearchParams()
  if (dateFrom) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)
  if (branchId) params.set('branchId', branchId)
  const qs = params.toString()
  return api<AnalyticsSummary>(`/analytics/summary${qs ? `?${qs}` : ''}`)
}

export async function getDailyRevenue(dateFrom?: string, dateTo?: string, branchId?: string): Promise<DailyRevenue[]> {
  const params = new URLSearchParams()
  if (dateFrom) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)
  if (branchId) params.set('branchId', branchId)
  const qs = params.toString()
  return api<DailyRevenue[]>(`/analytics/revenue${qs ? `?${qs}` : ''}`)
}

export async function getDailyPatients(dateFrom?: string, dateTo?: string): Promise<DailyPatients[]> {
  const params = new URLSearchParams()
  if (dateFrom) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)
  const qs = params.toString()
  return api<DailyPatients[]>(`/analytics/patients${qs ? `?${qs}` : ''}`)
}
