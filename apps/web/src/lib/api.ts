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
  method?: 'GET' | 'POST'
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

export async function listQueue(date: string): Promise<{ tokens: QueueToken[]; waiting: number }> {
  return api<{ tokens: QueueToken[]; waiting: number }>(`/queue?date=${encodeURIComponent(date)}`)
}
