import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search, Plus, Phone, FileText,
  ChevronRight, Shield, X, UserPlus,
  AlertCircle, CheckCircle2, Loader2,
} from 'lucide-react'
import { PageHeader, Button } from '../components/ui'
import { createPatient, describeApiError, listPatients } from '../lib/api'
import type { Patient } from '../lib/api'

const tabs = ['All Patients', 'Recent', 'Follow-up Due', 'Chronic']

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const GENDERS = [
  { value: 'M' as const, label: 'Male' },
  { value: 'F' as const, label: 'Female' },
  { value: 'O' as const, label: 'Other' },
]

const PHONE_RE = /^[0-9+\-\s]{8,15}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface PatientForm {
  firstName: string
  lastName: string
  phone: string
  dateOfBirth: string
  gender: '' | 'M' | 'F' | 'O'
  email: string
  bloodGroup: string
  abhaNumber: string
}

const emptyPatientForm: PatientForm = {
  firstName: '', lastName: '', phone: '', dateOfBirth: '',
  gender: '', email: '', bloodGroup: '', abhaNumber: '',
}

function validatePatientForm(f: PatientForm): Record<string, string> {
  const errs: Record<string, string> = {}
  if (!f.firstName.trim()) errs.firstName = 'First name is required'
  else if (f.firstName.trim().length > 100) errs.firstName = 'Maximum 100 characters'
  if (!f.lastName.trim()) errs.lastName = 'Last name is required'
  else if (f.lastName.trim().length > 100) errs.lastName = 'Maximum 100 characters'
  if (!f.phone.trim()) errs.phone = 'Phone number is required'
  else if (!PHONE_RE.test(f.phone.trim())) errs.phone = 'Enter a valid phone (8–15 digits)'
  if (f.email.trim() && !EMAIL_RE.test(f.email.trim())) errs.email = 'Enter a valid email address'
  if (f.abhaNumber.trim().length > 36) errs.abhaNumber = 'Maximum 36 characters'
  return errs
}

function patientAvatar(firstName: string, lastName: string): string {
  return ((firstName?.[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase() || '?'
}

const avatarColors = [
  'from-primary-400 to-primary-600',
  'from-accent-400 to-accent-600',
  'from-success-400 to-success-600',
  'from-info-400 to-info-600',
  'from-warning-400 to-warning-600',
  'from-danger-400 to-danger-600',
]

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

export default function Patients() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('All Patients')
  const [loading, setLoading] = useState(true)

  const [showNewPatient, setShowNewPatient] = useState(false)
  const [form, setForm] = useState<PatientForm>(emptyPatientForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await listPatients()
        if (!cancelled) setPatients(data)
      } catch {
        if (!cancelled) setPatients([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowNewPatient(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 6000)
    return () => clearTimeout(t)
  }, [flash])

  useEffect(() => {
    if (!showNewPatient) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) setShowNewPatient(false)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [showNewPatient, busy])

  function updateField<K extends keyof PatientForm>(key: K, value: PatientForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setFieldErrors(prev => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  async function submitNewPatient() {
    const errs = validatePatientForm(form)
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }
    setBusy(true)
    setModalError(null)
    try {
      const created = await createPatient({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        email: form.email.trim() || undefined,
        bloodGroup: form.bloodGroup || undefined,
        abhaNumber: form.abhaNumber.trim() || undefined,
      })
      setPatients(prev => [created, ...prev])
      setShowNewPatient(false)
      setFlash(`${created.firstName} ${created.lastName} registered · MRN ${created.mrn}`)
    } catch (e) {
      setModalError(describeApiError(e))
    } finally {
      setBusy(false)
    }
  }

  const filtered = patients.filter(p => {
    const name = `${p.firstName} ${p.lastName}`.toLowerCase()
    const mrn = p.mrn.toLowerCase()
    const phone = p.phone.toLowerCase()
    const matchesSearch = name.includes(search.toLowerCase()) ||
      mrn.includes(search.toLowerCase()) ||
      phone.includes(search.toLowerCase())
    if (!matchesSearch) return false

    if (activeTab === 'Recent') {
      const recentCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
      return new Date(p.createdAt).getTime() >= recentCutoff
    }
    if (activeTab === 'Follow-up Due') return Boolean(p.email)
    if (activeTab === 'Chronic') return Boolean(p.bloodGroup)
    return true
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        subtitle={loading ? 'Loading…' : `${patients.length} patients registered`}
        actions={
          <Button onClick={() => { setForm(emptyPatientForm); setFieldErrors({}); setModalError(null); setShowNewPatient(true) }}>
            <Plus className="w-4 h-4" />
            New Patient
          </Button>
        }
      />

      {flash && (
        <div className="flex items-center gap-2 rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-[12px] font-medium text-success-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {flash}
          <button className="ml-auto underline" onClick={() => setFlash(null)}>dismiss</button>
        </div>
      )}

      {/* Tabs + Search */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex gap-1 bg-surface-100 rounded-xl p-1">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                activeTab === tab
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-surface-500 hover:text-surface-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search patients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-white border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all"
          />
        </div>
      </div>

      {/* Patient Cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-[13px] text-surface-400">Loading patients…</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-[13px] text-surface-400">No patients found</div>
        ) : (
          filtered.map((patient, idx) => (
            <Link
              key={patient.id}
              to={`/patients/${patient.id}`}
              className="group bg-white rounded-2xl border border-surface-100 shadow-healthcare hover:shadow-healthcare-lg p-5 transition-all duration-200 hover:border-primary-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-white text-[13px] font-bold shadow-sm`}>
                    {patientAvatar(patient.firstName, patient.lastName)}
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-surface-800 group-hover:text-primary-700 transition-colors">
                      {patient.firstName} {patient.lastName}
                    </h3>
                    <p className="text-[12px] text-surface-400">{patient.mrn} · {patient.gender || 'N/A'}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-surface-300 group-hover:text-primary-500 transition-colors" />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-surface-400" />
                  <span className="text-[12px] text-surface-600">{patient.phone}</span>
                </div>
                {patient.email && (
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-surface-400" />
                    <span className="text-[12px] text-surface-600">{patient.email}</span>
                  </div>
                )}
                {patient.bloodGroup && (
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-primary-500" />
                    <span className="text-[12px] text-primary-600 font-medium">Blood: {patient.bloodGroup}</span>
                  </div>
                )}
                {patient.abhaNumber && (
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-primary-500" />
                    <span className="text-[12px] text-primary-600 font-medium">ABHA: {patient.abhaNumber}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-100">
                <span className="text-[11px] text-surface-400">Registered {new Date(patient.createdAt).toLocaleDateString()}</span>
                <span className="text-[11px] text-surface-300">View profile →</span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* New Patient Modal */}
      {showNewPatient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          onClick={() => !busy && setShowNewPatient(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Register new patient"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-healthcare-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-surface-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-healthcare">
                  <UserPlus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-surface-800">Register New Patient</h3>
                  <p className="text-[12px] text-surface-400">An MRN will be generated automatically</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewPatient(false)}
                disabled={busy}
                className="rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); submitNewPatient() }} noValidate>
              <div className="space-y-4 px-6 py-5">
                {modalError && (
                  <div className="flex items-start gap-2 rounded-xl border border-danger-200 bg-danger-50 px-3.5 py-2.5 text-[12px] font-medium text-danger-700">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> {modalError}
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="First Name" required error={fieldErrors.firstName}>
                    <input
                      autoFocus
                      className={inputCls(!!fieldErrors.firstName)}
                      value={form.firstName}
                      onChange={e => updateField('firstName', e.target.value)}
                      placeholder="e.g. Aarav"
                    />
                  </Field>
                  <Field label="Last Name" required error={fieldErrors.lastName}>
                    <input
                      className={inputCls(!!fieldErrors.lastName)}
                      value={form.lastName}
                      onChange={e => updateField('lastName', e.target.value)}
                      placeholder="e.g. Sharma"
                    />
                  </Field>
                  <Field label="Phone Number" required error={fieldErrors.phone}>
                    <input
                      type="tel"
                      inputMode="tel"
                      className={inputCls(!!fieldErrors.phone)}
                      value={form.phone}
                      onChange={e => updateField('phone', e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </Field>
                  <Field label="Date of Birth">
                    <input
                      type="date"
                      max={new Date().toISOString().slice(0, 10)}
                      className={inputCls()}
                      value={form.dateOfBirth}
                      onChange={e => updateField('dateOfBirth', e.target.value)}
                    />
                  </Field>
                </div>

                <div>
                  <span className="mb-1.5 block text-[12px] font-medium text-surface-600">Gender</span>
                  <div className="grid grid-cols-3 gap-2">
                    {GENDERS.map(g => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => updateField('gender', form.gender === g.value ? '' : g.value)}
                        className={`rounded-xl border px-3 py-2 text-[12px] font-medium transition-all ${
                          form.gender === g.value
                            ? 'border-primary-300 bg-primary-50 text-primary-700'
                            : 'border-surface-200 bg-surface-50 text-surface-600 hover:bg-surface-100'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="mb-1.5 block text-[12px] font-medium text-surface-600">Blood Group</span>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                    {BLOOD_GROUPS.map(bg => (
                      <button
                        key={bg}
                        type="button"
                        onClick={() => updateField('bloodGroup', form.bloodGroup === bg ? '' : bg)}
                        className={`rounded-lg border py-2 text-[12px] font-semibold transition-all ${
                          form.bloodGroup === bg
                            ? 'border-danger-300 bg-danger-50 text-danger-600'
                            : 'border-surface-200 bg-surface-50 text-surface-500 hover:bg-surface-100'
                        }`}
                      >
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Email">
                    <input
                      type="email"
                      inputMode="email"
                      className={inputCls(!!fieldErrors.email)}
                      value={form.email}
                      onChange={e => updateField('email', e.target.value)}
                      placeholder="name@example.com"
                    />
                  </Field>
                  <Field label="ABHA Number" error={fieldErrors.abhaNumber}>
                    <input
                      maxLength={36}
                      className={inputCls(!!fieldErrors.abhaNumber)}
                      value={form.abhaNumber}
                      onChange={e => updateField('abhaNumber', e.target.value)}
                      placeholder="Optional"
                    />
                  </Field>
                </div>
              </div>

              <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-surface-100 bg-white/95 px-6 py-4 backdrop-blur">
                <span className="hidden text-[11px] text-surface-400 sm:block"><span className="text-danger-500">*</span> Required fields</span>
                <div className="ml-auto flex gap-2">
                  <Button variant="secondary" onClick={() => setShowNewPatient(false)} disabled={busy}>Cancel</Button>
                  <Button type="submit" disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {busy ? 'Registering…' : 'Register Patient'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
