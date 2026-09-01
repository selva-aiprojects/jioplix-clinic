import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  Clock, Plus, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Timer, Stethoscope,
  CalendarDays, Activity, X, AlertCircle, Loader2,
  Globe, MessageCircle, DoorOpen, PhoneCall, UserRound,
} from 'lucide-react'
import { PageHeader, StatCard, Button } from '../components/ui'
import {
  listAppointments, updateAppointmentStatus, createEncounter,
  createAppointment, listPatients, listDoctors, describeApiError,
} from '../lib/api'
import type { Appointment, Patient, DoctorOption } from '../lib/api'
import { useAuth } from '../auth/useAuth'

const statusConfig: Record<string, { bg: string; text: string; icon: typeof CheckCircle2; label: string }> = {
  'completed': { bg: 'bg-success-50 border-success-200', text: 'text-success-700', icon: CheckCircle2, label: 'Completed' },
  'in_consultation': { bg: 'bg-primary-50 border-primary-200', text: 'text-primary-700', icon: Stethoscope, label: 'In Progress' },
  'checked_in': { bg: 'bg-info-50 border-info-200', text: 'text-info-700', icon: CheckCircle2, label: 'Checked In' },
  'waiting': { bg: 'bg-warning-50 border-warning-200', text: 'text-warning-700', icon: Timer, label: 'Waiting' },
  'scheduled': { bg: 'bg-surface-50 border-surface-200', text: 'text-surface-600', icon: Clock, label: 'Scheduled' },
  'cancelled': { bg: 'bg-danger-50 border-danger-200', text: 'text-danger-600', icon: XCircle, label: 'Cancelled' },
  'no_show': { bg: 'bg-surface-50 border-surface-200', text: 'text-surface-500', icon: XCircle, label: 'No Show' },
}

const SOURCE_OPTIONS = [
  { value: 'walk_in' as const, label: 'Walk-in', icon: DoorOpen },
  { value: 'phone' as const, label: 'Phone', icon: PhoneCall },
  { value: 'online' as const, label: 'Online', icon: Globe },
  { value: 'whatsapp' as const, label: 'WhatsApp', icon: MessageCircle },
]

const DURATIONS = [15, 30, 45, 60]

interface ApptForm {
  patientId: string
  doctorId: string
  date: string
  time: string
  durationMin: string
  source: 'walk_in' | 'online' | 'whatsapp' | 'phone'
  notes: string
}

function nextHalfHour(): string {
  const now = new Date()
  const t = new Date(now)
  t.setSeconds(0, 0)
  if (now.getMinutes() < 30) {
    t.setMinutes(30)
  } else {
    t.setMinutes(0)
    t.setHours(t.getHours() + 1)
  }
  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
}

function defaultApptForm(today: string): ApptForm {
  return {
    patientId: '',
    doctorId: '',
    date: today,
    time: nextHalfHour(),
    durationMin: '15',
    source: 'walk_in',
    notes: '',
  }
}

function validateApptForm(f: ApptForm): Record<string, string> {
  const errs: Record<string, string> = {}
  if (!f.patientId) errs.patientId = 'Select a patient'
  if (!f.doctorId) errs.doctorId = 'Select a doctor'
  if (!f.date) errs.date = 'Pick a date'
  if (!f.time) errs.time = 'Pick a time'
  if (f.notes.length > 1000) errs.notes = 'Maximum 1000 characters'
  return errs
}

function weekDates(anchor: string): string[] {
  const d = new Date(`${anchor}T00:00:00`)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday)
    x.setDate(monday.getDate() + i)
    return x.toISOString().slice(0, 10)
  })
}

function weekLabel(anchor: string): string {
  const dates = weekDates(anchor)
  const s = new Date(`${dates[0]}T00:00:00`)
  const e = new Date(`${dates[6]}T00:00:00`)
  return `${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

function avatarColorFor(name: string): string {
  const colors = [
    'from-primary-400 to-primary-600',
    'from-accent-400 to-accent-600',
    'from-success-400 to-success-600',
    'from-info-400 to-info-600',
    'from-warning-400 to-warning-600',
    'from-danger-400 to-danger-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || '?'
}

function Field({ label, required, error, children }: {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-surface-600">
        {label}{required && <span className="text-danger-500"> *</span>}
      </span>
      {children}
      {error && (
        <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-danger-600">
          <AlertCircle className="h-3 w-3 flex-shrink-0" /> {error}
        </span>
      )}
    </label>
  )
}

const inputCls = (invalid?: boolean) =>
  `w-full rounded-xl border bg-surface-50 px-3 py-2 text-[13px] transition-all placeholder:text-surface-300 focus:outline-none focus:ring-2 ${
    invalid
      ? 'border-danger-300 focus:border-danger-400 focus:ring-danger-500/20'
      : 'border-surface-200 focus:border-primary-400 focus:ring-primary-500/30'
  }`

export default function Appointments() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasPermission } = useAuth()
  const canCheckIn = hasPermission('appointments:update')
  const canStartConsult = hasPermission('encounters:create')
  const canVitals = hasPermission('vitals:create')
  const today = new Date().toISOString().slice(0, 10)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [calMode, setCalMode] = useState<'day' | 'week'>('week')
  const [anchor, setAnchor] = useState(today)
  const [calAppts, setCalAppts] = useState<Appointment[]>([])
  const [loadingCal, setLoadingCal] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState('All Doctors')
  const [filterDoctors, setFilterDoctors] = useState<string[]>(['All Doctors'])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const [showNewAppt, setShowNewAppt] = useState(false)
  const [form, setForm] = useState<ApptForm>(() => defaultApptForm(new Date().toISOString().slice(0, 10)))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [modalError, setModalError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await listAppointments(today)
        if (!cancelled) setAppointments(data)
      } catch {
        if (!cancelled) setAppointments([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [today])

  useEffect(() => {
    let cancelled = false
    listDoctors()
      .then(d => { if (!cancelled) setFilterDoctors(['All Doctors', ...d.map(doc => doc.fullName)]) })
      .catch(() => { /* keep the default filter list */ })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowNewAppt(true)
      const patientId = searchParams.get('patientId')
      if (patientId) setForm(prev => ({ ...prev, patientId }))
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (view !== 'calendar') return
    let cancelled = false
    setLoadingCal(true)
    const dates = calMode === 'week' ? weekDates(anchor) : [anchor]
    Promise.all(dates.map(d => listAppointments(d).catch(() => [] as Appointment[])))
      .then(res => { if (!cancelled) setCalAppts(res.flat()) })
      .finally(() => { if (!cancelled) setLoadingCal(false) })
    return () => { cancelled = true }
  }, [view, calMode, anchor])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 6000)
    return () => clearTimeout(t)
  }, [flash])

  useEffect(() => {
    if (!showNewAppt) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) setShowNewAppt(false)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [showNewAppt, busy])

  useEffect(() => {
    if (!showNewAppt) return
    let cancelled = false
    setOptionsLoading(true)
    Promise.all([
      listPatients().catch(() => [] as Patient[]),
      listDoctors().catch(() => [] as DoctorOption[]),
    ]).then(([p, d]) => {
      if (!cancelled) { setPatients(p); setDoctorOptions(d) }
    }).finally(() => {
      if (!cancelled) setOptionsLoading(false)
    })
    return () => { cancelled = true }
  }, [showNewAppt])

  function openNewAppointment() {
    setForm(defaultApptForm(today))
    setFieldErrors({})
    setModalError(null)
    setShowNewAppt(true)
  }

  function updateField<K extends keyof ApptForm>(key: K, value: ApptForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setFieldErrors(prev => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  async function submitNewAppointment() {
    const errs = validateApptForm(form)
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }
    setBusy(true)
    setModalError(null)
    try {
      const scheduledAt = new Date(`${form.date}T${form.time}`)
      const created = await createAppointment({
        patientId: form.patientId,
        doctorId: form.doctorId,
        scheduledAt: scheduledAt.toISOString(),
        durationMin: Number(form.durationMin),
        source: form.source,
        notes: form.notes.trim() || undefined,
      })
      setShowNewAppt(false)
      if (created.scheduledAt.slice(0, 10) === today) {
        setAppointments(prev =>
          [...prev.filter(a => a.id !== created.id), created]
            .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt)),
        )
      }
      const when = new Date(created.scheduledAt).toLocaleString([], {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
      setFlash(`${created.patientName} booked with ${created.doctorName} · ${when}`)
    } catch (e) {
      setModalError(describeApiError(e))
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(appt: Appointment, status: string) {
    setActionError(null)
    setBusyId(appt.id)
    try {
      await updateAppointmentStatus(appt.id, status)
      setAppointments(prev => prev.map(a => (a.id === appt.id ? { ...a, status } : a)))
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'UNKNOWN')
    } finally {
      setBusyId(null)
    }
  }

  async function startConsultation(appt: Appointment) {
    setActionError(null)
    setBusyId(appt.id)
    try {
      try { await updateAppointmentStatus(appt.id, 'in_consultation') } catch { /* already advanced */ }
      const enc = await createEncounter({
        patientId: appt.patientId,
        doctorId: appt.doctorId,
        appointmentId: appt.id,
      })
      navigate(`/encounters/${enc.id}`)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'UNKNOWN')
      setBusyId(null)
    }
  }

  const applyDoctorFilter = (list: Appointment[]) =>
    selectedDoctor === 'All Doctors' ? list : list.filter(a => a.doctorName === selectedDoctor)

  const filtered = applyDoctorFilter(appointments)

  const stats = {
    total: filtered.length,
    completed: filtered.filter(a => a.status === 'completed').length,
    active: filtered.filter(a => a.status === 'in_consultation' || a.status === 'checked_in' || a.status === 'waiting').length,
    cancelled: filtered.filter(a => a.status === 'cancelled' || a.status === 'no_show').length,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments & Queue"
        subtitle="Manage today's schedule and patient queue"
        actions={
          <Button onClick={openNewAppointment}>
            <Plus className="w-4 h-4" />
            New Appointment
          </Button>
        }
      />

      {(actionError || flash) && (
        flash ? (
          <div className="flex items-center gap-2 rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-[12px] font-medium text-success-700">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            {flash}
            <button className="ml-auto underline" onClick={() => setFlash(null)}>dismiss</button>
          </div>
        ) : (
          <div className="rounded-xl px-4 py-3 text-[12px] font-medium bg-danger-50 border border-danger-200 text-danger-700">
            {actionError}
            <button className="ml-3 underline" onClick={() => setActionError(null)}>dismiss</button>
          </div>
        )
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} icon={CalendarDays} tone="slate" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} tone="green" />
        <StatCard label="Active" value={stats.active} icon={Activity} tone="teal" />
        <StatCard label="Cancelled" value={stats.cancelled} icon={XCircle} tone="rose" />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex gap-1 bg-surface-100 rounded-xl p-1">
          {filterDoctors.map(d => (
            <button
              key={d}
              onClick={() => setSelectedDoctor(d)}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                selectedDoctor === d ? 'bg-white text-primary-700 shadow-sm' : 'text-surface-500 hover:text-surface-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex gap-2 md:ml-auto">
          <button onClick={() => setView('list')} className={`px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${view === 'list' ? 'bg-white text-primary-700 shadow-sm border border-primary-200' : 'text-surface-500 border border-surface-200 hover:bg-surface-50'}`}>List</button>
          <button onClick={() => { setView('calendar'); setCalMode('day') }} className={`px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${view === 'calendar' && calMode === 'day' ? 'bg-white text-primary-700 shadow-sm border border-primary-200' : 'text-surface-500 border border-surface-200 hover:bg-surface-50'}`}>Day</button>
          <button onClick={() => { setView('calendar'); setCalMode('week') }} className={`px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${view === 'calendar' && calMode === 'week' ? 'bg-white text-primary-700 shadow-sm border border-primary-200' : 'text-surface-500 border border-surface-200 hover:bg-surface-50'}`}>Week</button>
        </div>
      </div>

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Patient</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Doctor</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Time</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-[13px] text-surface-400">Loading appointments…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-[13px] text-surface-400">No appointments found</td></tr>
                ) : (
                  filtered.map((appt) => {
                    const sc = statusConfig[appt.status] || statusConfig['scheduled']
                    const time = new Date(appt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    return (
                      <tr key={appt.id} className="border-b border-surface-50 last:border-0 hover:bg-surface-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColorFor(appt.patientName)} flex items-center justify-center text-white text-[11px] font-bold shadow-sm`}>
                              {initialsOf(appt.patientName)}
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-surface-800">{appt.patientName}</p>
                              <p className="text-[11px] text-surface-400">{appt.patientId.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-[13px] text-surface-600">{appt.doctorName}</td>
                        <td className="px-5 py-3 text-[13px] text-surface-600">{time}</td>
                        <td className="px-5 py-3">
                          <span className="text-[12px] font-medium text-surface-600 bg-surface-100 px-2 py-1 rounded-md">{appt.source || 'walk_in'}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${sc.bg} ${sc.text}`}>
                            <sc.icon className="w-3 h-3" />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(appt.status === 'scheduled' || appt.status === 'confirmed' || appt.status === 'waiting') && canCheckIn && (
                              <button
                                disabled={busyId === appt.id}
                                onClick={() => setStatus(appt, 'checked_in')}
                                className="px-3 py-1.5 rounded-lg bg-primary-50 text-primary-600 text-[12px] font-medium hover:bg-primary-100 transition-colors disabled:opacity-50"
                              >
                                Check In
                              </button>
                            )}
                            {appt.status === 'checked_in' && canStartConsult && (
                              <button
                                disabled={busyId === appt.id}
                                onClick={() => startConsultation(appt)}
                                className="px-3 py-1.5 rounded-lg bg-accent-50 text-accent-600 text-[12px] font-medium hover:bg-accent-100 transition-colors disabled:opacity-50"
                              >
                                Start Consultation
                              </button>
                            )}
                            {appt.status === 'in_consultation' && canCheckIn && (
                              <button
                                disabled={busyId === appt.id}
                                onClick={() => setStatus(appt, 'completed')}
                                className="px-3 py-1.5 rounded-lg bg-success-50 text-success-600 text-[12px] font-medium hover:bg-success-100 transition-colors disabled:opacity-50"
                              >
                                Complete
                              </button>
                            )}
                            {(appt.status === 'checked_in' || appt.status === 'in_consultation') && appt.encounterId && (
                              <button
                                disabled={busyId === appt.id}
                                onClick={() => navigate(`/encounters/${appt.encounterId}`)}
                                className="px-3 py-1.5 rounded-lg bg-info-50 text-info-600 text-[12px] font-medium hover:bg-info-100 transition-colors disabled:opacity-50"
                              >
                                <Activity className="w-3 h-3 inline mr-1" />
                                {canVitals ? 'Record Vitals' : 'Open Chart'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <button
                className="p-2 rounded-lg hover:bg-surface-100 text-surface-400"
                aria-label="Previous"
                onClick={() => { const d = new Date(`${anchor}T00:00:00`); d.setDate(d.getDate() + (calMode === 'week' ? -7 : -1)); setAnchor(d.toISOString().slice(0, 10)) }}
              ><ChevronLeft className="w-4 h-4" /></button>
              <h3 className="text-[15px] font-semibold text-surface-800">
                {calMode === 'week' ? weekLabel(anchor) : new Date(`${anchor}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}
              </h3>
              <button
                className="p-2 rounded-lg hover:bg-surface-100 text-surface-400"
                aria-label="Next"
                onClick={() => { const d = new Date(`${anchor}T00:00:00`); d.setDate(d.getDate() + (calMode === 'week' ? 7 : 1)); setAnchor(d.toISOString().slice(0, 10)) }}
              ><ChevronRight className="w-4 h-4" /></button>
              <button onClick={() => setAnchor(today)} className="ml-1 rounded-lg border border-surface-200 px-2.5 py-1 text-[11px] font-medium text-surface-500 hover:bg-surface-50">Today</button>
            </div>
            <div className="flex gap-1 bg-surface-100 rounded-xl p-1">
              <button onClick={() => setCalMode('day')} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${calMode === 'day' ? 'bg-white text-primary-700 shadow-sm' : 'text-surface-500'}`}>Day</button>
              <button onClick={() => setCalMode('week')} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${calMode === 'week' ? 'bg-white text-primary-700 shadow-sm' : 'text-surface-500'}`}>Week</button>
            </div>
          </div>

          {loadingCal ? (
            <p className="py-12 text-center text-[13px] text-surface-400">Loading schedule…</p>
          ) : calMode === 'week' ? (
            <div className="grid grid-cols-7 gap-2 min-w-[640px]">
              {weekDates(anchor).map(dateStr => {
                const dayAppts = applyDoctorFilter(calAppts.filter(a => a.scheduledAt.slice(0, 10) === dateStr))
                const isToday = dateStr === today
                return (
                  <div key={dateStr} className={`flex min-h-[280px] flex-col rounded-xl border ${isToday ? 'border-primary-300 bg-primary-50/30' : 'border-surface-100 bg-surface-50/40'}`}>
                    <div className={`px-2 py-2 text-center border-b ${isToday ? 'border-primary-200' : 'border-surface-100'}`}>
                      <p className="text-[10px] font-semibold uppercase text-surface-400">{new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' })}</p>
                      <p className={`text-[15px] font-bold ${isToday ? 'text-primary-700' : 'text-surface-800'}`}>{new Date(`${dateStr}T00:00:00`).getDate()}</p>
                    </div>
                    <div className="flex-1 space-y-1.5 p-1.5">
                      {dayAppts.length === 0 ? (
                        <p className="text-center text-[10px] text-surface-300 mt-3">—</p>
                      ) : dayAppts.map(a => {
                        const sc = statusConfig[a.status] || statusConfig['scheduled']
                        return (
                          <div key={a.id} className={`rounded-lg border px-1.5 py-1 ${sc.bg} ${sc.text}`}>
                            <p className="font-bold leading-tight">{new Date(a.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            <p className="truncate">{a.patientName}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {applyDoctorFilter(calAppts).length === 0 ? (
                <p className="py-12 text-center text-[13px] text-surface-400">No appointments on this day.</p>
              ) : applyDoctorFilter(calAppts).map(a => {
                const sc = statusConfig[a.status] || statusConfig['scheduled']
                const time = new Date(a.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl border border-surface-100 p-3 hover:bg-surface-50/50 transition-colors">
                    <div className="w-14 text-center"><p className="text-[13px] font-bold text-surface-800">{time}</p></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-surface-800 truncate">{a.patientName}</p>
                      <p className="text-[11px] text-surface-400">{a.doctorName}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${sc.bg} ${sc.text}`}><sc.icon className="w-3 h-3" />{sc.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* New Appointment Modal */}
      {showNewAppt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          onClick={() => !busy && setShowNewAppt(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Book appointment"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-healthcare-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-surface-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 shadow-healthcare">
                  <CalendarDays className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-surface-800">Book Appointment</h3>
                  <p className="text-[12px] text-surface-400">Schedule a visit — checked-in patients join the queue</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewAppt(false)}
                disabled={busy}
                className="rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); submitNewAppointment() }} noValidate>
              <div className="space-y-4 px-6 py-5">
                {modalError && (
                  <div className="flex items-start gap-2 rounded-xl border border-danger-200 bg-danger-50 px-3.5 py-2.5 text-[12px] font-medium text-danger-700">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> {modalError}
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Patient" required error={fieldErrors.patientId}>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
                      <select
                        autoFocus
                        className={`${inputCls(!!fieldErrors.patientId)} appearance-none pl-9`}
                        value={form.patientId}
                        onChange={e => updateField('patientId', e.target.value)}
                        disabled={optionsLoading}
                      >
                        <option value="">{optionsLoading ? 'Loading patients…' : 'Select patient…'}</option>
                        {patients.map(p => (
                          <option key={p.id} value={p.id}>{p.firstName} {p.lastName} · {p.mrn}</option>
                        ))}
                      </select>
                    </div>
                  </Field>
                  <Field label="Doctor" required error={fieldErrors.doctorId}>
                    <select
                      className={inputCls(!!fieldErrors.doctorId)}
                      value={form.doctorId}
                      onChange={e => updateField('doctorId', e.target.value)}
                      disabled={optionsLoading}
                    >
                      <option value="">{optionsLoading ? 'Loading doctors…' : 'Select doctor…'}</option>
                      {doctorOptions.map(d => (
                        <option key={d.id} value={d.id}>{d.fullName}{d.specialty ? ` — ${d.specialty}` : ''}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Date" required error={fieldErrors.date}>
                    <input
                      type="date"
                      min={today}
                      className={inputCls(!!fieldErrors.date)}
                      value={form.date}
                      onChange={e => updateField('date', e.target.value)}
                    />
                  </Field>
                  <Field label="Time" required error={fieldErrors.time}>
                    <input
                      type="time"
                      className={inputCls(!!fieldErrors.time)}
                      value={form.time}
                      onChange={e => updateField('time', e.target.value)}
                    />
                  </Field>
                </div>

                <div>
                  <span className="mb-1.5 block text-[12px] font-medium text-surface-600">Duration</span>
                  <div className="grid grid-cols-4 gap-2">
                    {DURATIONS.map(min => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => updateField('durationMin', String(min))}
                        className={`rounded-xl border px-3 py-2 text-[12px] font-medium transition-all ${
                          Number(form.durationMin) === min
                            ? 'border-primary-300 bg-primary-50 text-primary-700'
                            : 'border-surface-200 bg-surface-50 text-surface-600 hover:bg-surface-100'
                        }`}
                      >
                        {min} min
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="mb-1.5 block text-[12px] font-medium text-surface-600">Booked Via</span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {SOURCE_OPTIONS.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => updateField('source', s.value)}
                        className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 transition-all ${
                          form.source === s.value
                            ? 'border-primary-300 bg-primary-50'
                            : 'border-surface-200 bg-surface-50 hover:bg-surface-100'
                        }`}
                      >
                        <s.icon className={`h-4 w-4 ${form.source === s.value ? 'text-primary-600' : 'text-surface-500'}`} />
                        <span className={`text-[11px] font-medium ${form.source === s.value ? 'text-primary-700' : 'text-surface-600'}`}>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-surface-600">
                    Notes <span className="font-normal text-surface-400">(optional)</span>
                  </span>
                  <textarea
                    rows={2}
                    maxLength={1000}
                    className={`${inputCls(!!fieldErrors.notes)} resize-none`}
                    value={form.notes}
                    onChange={e => updateField('notes', e.target.value)}
                    placeholder="Reason for visit, reminders…"
                  />
                  <span className="mt-1 block text-right text-[10px] text-surface-300">{form.notes.length}/1000</span>
                </label>
              </div>

              <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-surface-100 bg-white/95 px-6 py-4 backdrop-blur">
                <Button variant="secondary" onClick={() => setShowNewAppt(false)} disabled={busy}>Cancel</Button>
                <Button type="submit" disabled={busy || optionsLoading}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {busy ? 'Booking…' : 'Book Appointment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
