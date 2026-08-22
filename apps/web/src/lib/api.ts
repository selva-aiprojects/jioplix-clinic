import type { SessionUser } from '../auth/types'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'
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
  method?: 'GET' | 'POST' | 'PATCH'
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
  return api(`/invoices/${invoiceId}/payments`, { method: 'POST', body: data })
}

export async function getPatientOutstanding(patientId: string): Promise<{ patientId: string; outstandingPaise: number }> {
  return api(`/invoices/patient/${patientId}/outstanding`)
}
