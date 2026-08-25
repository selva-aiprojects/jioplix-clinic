import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Phone, Mail, Shield, Calendar,
  MapPin, Printer, ClipboardList, ReceiptText,
  Lock, ArrowUpRight, Activity,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Button } from '../components/ui'
import { getPatient, listPatientEncounters, listInvoices, getPatientOutstanding } from '../lib/api'
import type { Patient, PatientEncounterSummary, Invoice } from '../lib/api'
import { getVitalsHistory } from '../lib/vitalsHistory'

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

const defaultPatient: Partial<Patient> = {
  id: '', firstName: '', lastName: '', phone: '', email: '', gender: '',
  bloodGroup: '', dateOfBirth: '', address: {},
}

export default function PatientProfile() {
  const { id } = useParams()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [encounters, setEncounters] = useState<PatientEncounterSummary[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [outstanding, setOutstanding] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'timeline' | 'billing'>('timeline')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!id) return
      try {
        const p = await getPatient(id)
        if (cancelled) return
        setPatient(p)
        const [encs, invs, out] = await Promise.all([
          listPatientEncounters(id).catch(() => []),
          listInvoices({ patientId: id }).catch(() => []),
          getPatientOutstanding(id).catch(() => ({ patientId: id, outstandingPaise: 0 })),
        ])
        if (!cancelled) {
          setEncounters(encs)
          setInvoices(invs)
          setOutstanding(out.outstandingPaise)
        }
      } catch {
        if (!cancelled) setPatient(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  const p = patient ?? { ...defaultPatient, id: id || '' } as Patient
  const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Patient Profile'
  const dobAge = p.dateOfBirth ? Math.max(0, Math.floor((Date.now() - new Date(p.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))) : null

  const vitalsTrend = getVitalsHistory(p.id)
    .map(v => ({
      label: new Date(v.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      weightKg: v.weightKg ?? null,
      bpSystolic: v.bpSystolic ?? null,
      bpDiastolic: v.bpDiastolic ?? null,
    }))
    .filter(v => v.weightKg != null || v.bpSystolic != null)

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Link to="/patients" className="p-2 rounded-xl hover:bg-surface-100 text-surface-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${loading ? 'from-surface-200 to-surface-300' : 'from-primary-400 to-primary-600'} flex items-center justify-center text-white text-lg font-bold shadow-healthcare`}>
              {loading ? '…' : ((p.firstName?.[0] ?? '') + (p.lastName?.[0] ?? '')).toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-surface-900">{loading ? 'Loading…' : fullName}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[13px] text-surface-500">{p.mrn || p.id}</span>
                <span className="text-[13px] text-surface-400">·</span>
                <span className="text-[13px] text-surface-500">{dobAge ?? 'N/A'}{p.gender ? ` · ${p.gender}` : ''}</span>
                <span className="text-[13px] text-surface-400">·</span>
                <span className="text-[13px] text-surface-500">{p.bloodGroup || 'N/A'}</span>
                {p.abhaNumber && (
                  <>
                    <span className="text-[13px] text-surface-400">·</span>
                    <span className="inline-flex items-center gap-1 text-[12px] text-primary-600 font-medium bg-primary-50 px-2 py-0.5 rounded-md">
                      <Shield className="w-3 h-3" /> ABHA
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="hidden md:flex gap-2">
          <Button variant="secondary">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Link
            to={`/appointments?new=1&patientId=${encodeURIComponent(p.id)}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-[13px] font-semibold text-white shadow-healthcare transition-all hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
          >
            <Calendar className="w-4 h-4" /> Book Appointment
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
            <h3 className="text-[14px] font-semibold text-surface-800 mb-4">Contact Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center"><Phone className="w-4 h-4 text-primary-600" /></div>
                <div><p className="text-[12px] text-surface-400">Phone</p><p className="text-[13px] text-surface-700 font-medium">{p.phone || 'N/A'}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-50 flex items-center justify-center"><Mail className="w-4 h-4 text-accent-600" /></div>
                <div><p className="text-[12px] text-surface-400">Email</p><p className="text-[13px] text-surface-700 font-medium">{p.email || 'N/A'}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-info-50 flex items-center justify-center"><MapPin className="w-4 h-4 text-info-600" /></div>
                <div><p className="text-[12px] text-surface-400">Address</p><p className="text-[13px] text-surface-700">{p.address ? Object.values(p.address).join(', ') || 'N/A' : 'N/A'}</p></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
            <h3 className="text-[14px] font-semibold text-surface-800 mb-3">Identifiers</h3>
            <div className="space-y-2">
              {p.abhaNumber && (
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-primary-500" />
                  <span className="text-[12px] text-primary-600 font-medium">ABHA: {p.abhaNumber}</span>
                </div>
              )}
              {p.bloodGroup && (
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-danger-500" />
                  <span className="text-[12px] text-danger-600 font-medium">Blood Group: {p.bloodGroup}</span>
                </div>
              )}
              {!p.abhaNumber && !p.bloodGroup && (
                <p className="text-[13px] text-surface-400">No additional identifiers</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
            <h3 className="text-[14px] font-semibold text-surface-800 mb-3">Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-50 rounded-xl p-3">
                <p className="text-[11px] text-surface-400 uppercase tracking-wider">Encounters</p>
                <p className="text-[18px] font-bold text-surface-800 mt-0.5">{encounters.length}</p>
              </div>
              <div className="bg-surface-50 rounded-xl p-3">
                <p className="text-[11px] text-surface-400 uppercase tracking-wider">Invoices</p>
                <p className="text-[18px] font-bold text-surface-800 mt-0.5">{invoices.length}</p>
              </div>
              <div className="col-span-2 bg-warning-50/60 border border-warning-100 rounded-xl p-3">
                <p className="text-[11px] text-warning-500 uppercase tracking-wider">Outstanding</p>
                <p className="text-[16px] font-bold text-warning-700 mt-0.5">{formatPaise(outstanding)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-primary-600" />
              <h3 className="text-[14px] font-semibold text-surface-800">Vitals Trend</h3>
            </div>
            {vitalsTrend.length === 0 ? (
              <p className="text-[12px] text-surface-400">Vitals recorded during consultations will chart here over time.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-[12px] font-medium text-surface-600">Weight (kg)</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={vitalsTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef4f8" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                      <Line type="monotone" dataKey="weightKg" stroke="#08bfa9" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p className="mb-1 text-[12px] font-medium text-surface-600">Blood Pressure (mmHg)</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={vitalsTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef4f8" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                      <Line type="monotone" dataKey="bpSystolic" stroke="#1265e8" strokeWidth={2} dot={{ r: 3 }} name="Systolic" />
                      <Line type="monotone" dataKey="bpDiastolic" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Diastolic" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare overflow-hidden">
            <div className="flex items-center gap-1 px-5 pt-4 pb-3 border-b border-surface-100">
              <button
                onClick={() => setTab('timeline')}
                className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${tab === 'timeline' ? 'bg-primary-50 text-primary-700' : 'text-surface-500 hover:bg-surface-50'}`}
              >
                Clinical History
              </button>
              <button
                onClick={() => setTab('billing')}
                className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${tab === 'billing' ? 'bg-primary-50 text-primary-700' : 'text-surface-500 hover:bg-surface-50'}`}
              >
                Billing
              </button>
            </div>

            <div className="p-5">
              {loading ? (
                <p className="text-[13px] text-surface-400 py-6 text-center">Loading patient record…</p>
              ) : tab === 'timeline' ? (
                encounters.length === 0 ? (
                  <p className="text-[13px] text-surface-400 py-6 text-center">No consultations recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {encounters.map(e => (
                      <Link key={e.id} to={`/encounters/${e.id}`} className="block p-4 rounded-xl bg-surface-50 border border-surface-100 hover:bg-surface-100/70 transition-colors group">
                        <div className="flex items-center gap-2 mb-1.5">
                          <ClipboardList className="w-4 h-4 text-primary-500" />
                          <span className="text-[13px] font-semibold text-surface-800">{e.encounterDate}</span>
                          <span className="text-[11px] text-surface-400">· {e.doctorName}</span>
                          {e.isLocked && <Lock className="w-3 h-3 text-success-500" />}
                          <ArrowUpRight className="w-3.5 h-3.5 text-surface-300 ml-auto group-hover:text-primary-500 transition-colors" />
                        </div>
                        {e.chiefComplaint && (
                          <p className="text-[12px] text-surface-600"><strong>Complaint:</strong> {e.chiefComplaint}</p>
                        )}
                        {e.diagnoses.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {e.diagnoses.map((d, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-info-50 text-info-600 text-[11px] font-medium border border-info-100">
                                {d.icd10Code} · {d.icd10Name}
                              </span>
                            ))}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                )
              ) : invoices.length === 0 ? (
                <p className="text-[13px] text-surface-400 py-6 text-center">No invoices for this patient.</p>
              ) : (
                <div className="space-y-3">
                  {invoices.map(inv => {
                    const date = new Date(inv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    return (
                      <div key={inv.id} className="flex items-center gap-3 p-4 rounded-xl bg-surface-50 border border-surface-100">
                        <ReceiptText className="w-4 h-4 text-accent-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-surface-800">{inv.invoiceNo}</p>
                          <p className="text-[11px] text-surface-400">{date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[13px] font-bold text-surface-800">{formatPaise(inv.totalPaise)}</p>
                          <p className={`text-[11px] font-medium ${inv.balancePaise <= 0 ? 'text-success-600' : inv.paidPaise > 0 ? 'text-warning-600' : 'text-danger-500'}`}>
                            {inv.status === 'paid' ? 'Paid' : inv.balancePaise > 0 && inv.paidPaise > 0 ? `Partial · due ${formatPaise(inv.balancePaise)}` : `Due ${formatPaise(inv.balancePaise)}`}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
