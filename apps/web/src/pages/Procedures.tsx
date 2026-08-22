import { useEffect, useState, type ReactNode } from 'react'
import {
  Syringe, Bandage, HeartPulse, Activity, Stethoscope, Clock,
  IndianRupee, CheckCircle2, Play, ArrowRight, Plus, Calendar,
  Sparkles, X, Loader2, AlertCircle, ReceiptText,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader, StatCard, Button } from '../components/ui'
import { useAuth } from '../auth/useAuth'
import {
  listProcedureOrders, createProcedureOrder, updateProcedureOrderStatus,
  createInvoice, listPatients, listDoctors, describeApiError,
  type ProcedureOrder, type Patient, type DoctorOption,
} from '../lib/api'

interface Procedure {
  name: string
  icon: typeof Syringe
  duration: string
  price: number
  light: string
  iconColor: string
}

const catalog: Procedure[] = [
  { name: 'IM / IV Injection', icon: Syringe, duration: '10 min', price: 100, light: 'bg-primary-50', iconColor: 'text-primary-600' },
  { name: 'Wound Dressing', icon: Bandage, duration: '15 min', price: 250, light: 'bg-warning-50', iconColor: 'text-warning-600' },
  { name: 'Nebulization', icon: Activity, duration: '20 min', price: 200, light: 'bg-info-50', iconColor: 'text-info-600' },
  { name: 'Vaccination', icon: HeartPulse, duration: '10 min', price: 450, light: 'bg-success-50', iconColor: 'text-success-600' },
  { name: 'ECG', icon: Stethoscope, duration: '15 min', price: 350, light: 'bg-accent-50', iconColor: 'text-accent-600' },
  { name: 'Minor Procedure', icon: Plus, duration: '45 min', price: 1500, light: 'bg-danger-50', iconColor: 'text-danger-600' },
]

const statusStyles: Record<ProcedureOrder['status'], string> = {
  ordered: 'bg-surface-100 text-surface-600 border-surface-200',
  prepared: 'bg-info-50 text-info-600 border-info-100',
  in_progress: 'bg-warning-50 text-warning-600 border-warning-100',
  completed: 'bg-success-50 text-success-700 border-success-200',
  cancelled: 'bg-surface-100 text-surface-400 border-surface-200',
}

const statusLabels: Record<ProcedureOrder['status'], string> = {
  ordered: 'Ordered',
  prepared: 'Prepared',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
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

export default function Procedures() {
  const { hasPermission } = useAuth()
  const canBill = hasPermission('invoices:create')
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState<ProcedureOrder[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<DoctorOption[]>([])
  const [loading, setLoading] = useState(true)
  const [billedIds, setBilledIds] = useState<Set<string>>(new Set())

  const [showNew, setShowNew] = useState(false)
  const [selectedProc, setSelectedProc] = useState<string>(catalog[0].name)
  const [customName, setCustomName] = useState('')
  const [priceRupees, setPriceRupees] = useState<string>(String(catalog[0].price))
  const [patientId, setPatientId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [room, setRoom] = useState('')
  const [notes, setNotes] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const [flash, setFlash] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)

  async function refresh() {
    try {
      const data = await listProcedureOrders(new Date().toISOString().slice(0, 10))
      setOrders(data)
      setPageError(null)
    } catch (e) {
      setPageError(describeApiError(e))
    }
  }

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([
      listProcedureOrders(new Date().toISOString().slice(0, 10)),
      listPatients(),
      listDoctors(),
    ])
      .then(([orderResult, patientResult, doctorResult]) => {
        if (cancelled) return
        if (orderResult.status === 'fulfilled') setOrders(orderResult.value)
        else setPageError(describeApiError(orderResult.reason))
        if (patientResult.status === 'fulfilled') setPatients(patientResult.value)
        if (doctorResult.status === 'fulfilled') {
          setDoctors(doctorResult.value)
          if (doctorResult.value[0]) setDoctorId(doctorResult.value[0].id)
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!showNew) return
    let cancelled = false
    Promise.allSettled([listPatients(), listDoctors()]).then(([patientResult, doctorResult]) => {
      if (cancelled) return
      if (patientResult.status === 'fulfilled') setPatients(patientResult.value)
      if (doctorResult.status === 'fulfilled') {
        setDoctors(doctorResult.value)
        if (!doctorId && doctorResult.value[0]) setDoctorId(doctorResult.value[0].id)
      }
    })
    return () => { cancelled = true }
  }, [showNew, doctorId])

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowNew(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 6000)
    return () => clearTimeout(t)
  }, [flash])

  useEffect(() => {
    if (!showNew) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) setShowNew(false)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [showNew, busy])

  async function advance(o: ProcedureOrder, next: ProcedureOrder['status']) {
    try {
      const updated = await updateProcedureOrderStatus(o.id, next)
      setOrders(prev => prev.map(x => (x.id === updated.id ? updated : x)))
      setPageError(null)
      setFlash(`${updated.name} for ${updated.patientName} → ${statusLabels[next]}`)
    } catch (e) {
      setPageError(describeApiError(e))
    }
  }

  async function generateBill(o: ProcedureOrder) {
    try {
      const inv = await createInvoice({
        patientId: o.patientId,
        lines: [{
          itemType: 'procedure',
          itemName: o.name,
          quantity: 1,
          unitPricePaise: o.pricePaise,
        }],
      })
      setBilledIds(prev => new Set(prev).add(o.id))
      setPageError(null)
      setFlash(`Invoice ${inv.invoiceNo} created · ₹${(inv.totalPaise / 100).toLocaleString()} — collect payment in Billing`)
    } catch (e) {
      setPageError(describeApiError(e))
    }
  }

  function openNew() {
    setSelectedProc(catalog[0].name)
    setCustomName('')
    setPriceRupees(String(catalog[0].price))
    setPatientId(patients[0]?.id ?? '')
    setDoctorId(doctors[0]?.id ?? '')
    setRoom('')
    setNotes('')
    setFieldErrors({})
    setModalError(null)
    setShowNew(true)
  }

  async function submitNew() {
    const errs: Record<string, string> = {}
    if (!patientId) errs.patientId = 'Select a patient'
    if (!doctorId) errs.doctorId = 'Select a doctor'
    const finalName = customName.trim() || selectedProc
    if (!finalName) errs.procedure = 'Pick or type a procedure'
    const price = Number(priceRupees)
    if (priceRupees === '' || Number.isNaN(price) || price < 0) errs.priceRupees = 'Enter a valid amount'
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }
    setBusy(true)
    setModalError(null)
    try {
      const created = await createProcedureOrder({
        patientId,
        doctorId,
        name: finalName,
        pricePaise: Math.round(price * 100),
        room: room.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      setOrders(prev => [...prev, created])
      setShowNew(false)
      setFlash(`${created.name} ordered for ${created.patientName} · ₹${price.toLocaleString()}`)
    } catch (e) {
      setModalError(describeApiError(e))
    } finally {
      setBusy(false)
    }
  }

  const initials = (name: string) =>
    name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  const activeCount = orders.filter((o) => o.status === 'in_progress').length
  const completedToday = orders.filter((o) => o.status === 'completed').length
  const revenueToday = orders
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + o.pricePaise, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bandage}
        tint="green"
        badge="Add-on"
        title="Procedures"
        subtitle={loading ? 'Loading…' : `${orders.length} procedures on today's schedule`}
        actions={
          <Button onClick={openNew}>
            <Plus className="w-4 h-4" /> Order Procedure
          </Button>
        }
      />

      {pageError && (
        <div className="flex items-center gap-2 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-[12px] font-medium text-danger-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {pageError}
          <button className="ml-auto underline" onClick={() => void refresh()}>retry</button>
        </div>
      )}

      {flash && (
        <div className="flex items-center gap-2 rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-[12px] font-medium text-success-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {flash}
          <button className="ml-auto underline" onClick={() => setFlash(null)}>dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Scheduled Today', value: String(orders.length), icon: Calendar, tone: 'indigo' as const },
          { label: 'In Progress', value: String(activeCount), icon: Play, tone: 'amber' as const },
          { label: 'Completed Today', value: String(completedToday), icon: CheckCircle2, tone: 'green' as const },
          { label: "Today's Revenue", value: `₹${(revenueToday / 100).toLocaleString()}`, icon: IndianRupee, tone: 'teal' as const },
          { label: 'Catalog Items', value: String(catalog.length), icon: Clock, tone: 'sky' as const },
        ].map((m) => (
          <StatCard key={m.label} {...m} />
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-surface-800">Procedure Catalog</h2>
          <span className="text-[12px] text-surface-400">Click a card to order it instantly</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {catalog.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                openNew()
                setSelectedProc(p.name)
                setCustomName('')
                setPriceRupees(String(p.price))
              }}
              className="bg-white rounded-2xl p-4 border border-surface-100 shadow-healthcare hover:shadow-healthcare-lg hover:-translate-y-0.5 transition-all duration-200 text-left group"
            >
              <div className={`w-10 h-10 rounded-xl ${p.light} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                <p.icon className={`w-5 h-5 ${p.iconColor}`} />
              </div>
              <p className="text-[13px] font-semibold text-surface-800 leading-tight">{p.name}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] text-surface-400 flex items-center gap-1"><Clock className="w-3 h-3" />{p.duration}</span>
                <span className="text-[13px] font-bold text-surface-800 ml-auto">₹{p.price}</span>
              </div>
              <p className="text-[10px] text-primary-500 mt-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Order now →</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-100 shadow-healthcare overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h2 className="text-[15px] font-semibold text-surface-800">Today's Schedule</h2>
            <span className="text-[12px] font-medium text-primary-600">
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-50">
                  {['Time', 'Patient', 'Procedure', 'Doctor / Room', 'Status', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6} className="py-10 text-center text-[13px] text-surface-400">Loading schedule…</td></tr>
                )}
                {!loading && orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center">
                      <Calendar className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                      <p className="text-[13px] text-surface-400">Nothing scheduled yet</p>
                      <button onClick={openNew} className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-primary-600 hover:text-primary-700">
                        <Plus className="w-3.5 h-3.5" /> Order the first procedure
                      </button>
                    </td>
                  </tr>
                )}
                {orders.map((s) => {
                  const billed = billedIds.has(s.id)
                  return (
                    <tr key={s.id} className="border-b border-surface-50 last:border-0 hover:bg-surface-50/50 transition-colors">
                      <td className="px-5 py-3 text-[12px] font-medium text-surface-600 whitespace-nowrap">
                        {new Date(s.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-success-400 to-success-600 flex items-center justify-center text-white text-[10px] font-bold">{initials(s.patientName)}</div>
                          <p className="text-[13px] font-semibold text-surface-800 leading-tight">{s.patientName}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="text-[13px] text-surface-700">{s.name}</p>
                        <p className="text-[11px] text-surface-400">₹{(s.pricePaise / 100).toLocaleString()}</p>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="text-[12px] text-surface-600">{s.doctorName}</p>
                        <p className="text-[11px] text-surface-400">{s.room ?? '—'}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border whitespace-nowrap ${statusStyles[s.status]}`}>{statusLabels[s.status]}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          {s.status === 'ordered' && (
                            <button
                              onClick={() => void advance(s, 'prepared')}
                              disabled={busy}
                              className="px-3 py-1.5 rounded-lg bg-info-500 text-white text-[11px] font-semibold hover:bg-info-600 transition-colors whitespace-nowrap"
                            >
                              Prepare
                            </button>
                          )}
                          {(s.status === 'ordered' || s.status === 'prepared') && (
                            <button
                              onClick={() => void advance(s, 'in_progress')}
                              disabled={busy}
                              className="px-3 py-1.5 rounded-lg bg-warning-500 text-white text-[11px] font-semibold hover:bg-warning-600 transition-colors whitespace-nowrap"
                            >
                              Start
                            </button>
                          )}
                          {s.status === 'in_progress' && (
                            <button
                              onClick={() => void advance(s, 'completed')}
                              disabled={busy}
                              className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-[11px] font-semibold hover:bg-primary-600 transition-colors whitespace-nowrap flex items-center gap-1"
                            >
                              Complete <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          {s.status === 'completed' && !billed && canBill && (
                            <button
                              onClick={() => void generateBill(s)}
                              disabled={busy}
                              className="px-3 py-1.5 rounded-lg bg-accent-500 text-white text-[11px] font-semibold hover:bg-accent-600 transition-colors whitespace-nowrap"
                            >
                              Generate Bill
                            </button>
                          )}
                          {s.status === 'completed' && !billed && !canBill && (
                            <span className="text-[11px] text-surface-400 whitespace-nowrap">Awaiting front-desk billing</span>
                          )}
                          {(s.status === 'completed' && billed) && (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success-50 border border-success-200 text-success-700 text-[11px] font-semibold cursor-default">
                              <ReceiptText className="w-3.5 h-3.5" /> Billed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-br from-success-500 via-primary-600 to-accent-600 rounded-2xl p-5 text-white shadow-healthcare-lg">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-[14px] font-semibold">Integrated Workflow</h3>
            </div>
            <div className="space-y-2">
              {['Doctor or nurse orders procedure', 'Tracked through prepare → start → done', 'One-click GST invoice on completion'].map((step, i) => (
                <div key={step} className="flex items-center gap-2.5 bg-white/10 rounded-xl px-3 py-2 backdrop-blur-sm">
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                  <p className="text-[12px] text-white/90">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
            <h3 className="text-[14px] font-semibold text-surface-800 mb-3">Pipeline Snapshot</h3>
            <div className="space-y-2.5">
              {(['ordered', 'prepared', 'in_progress', 'completed'] as const).map((st) => {
                const count = orders.filter((o) => o.status === st).length
                return (
                  <div key={st} className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-[12px] text-surface-600">
                      <span className={`inline-flex w-2 h-2 rounded-full ${
                        st === 'completed' ? 'bg-success-400' : st === 'in_progress' ? 'bg-warning-400' : st === 'prepared' ? 'bg-info-400' : 'bg-surface-300'
                      }`} />
                      {statusLabels[st]}
                    </span>
                    <span className="text-[12px] font-bold text-surface-800">{count}</span>
                  </div>
                )
              })}
            </div>
            <p className="text-[11px] text-surface-400 mt-3 pt-3 border-t border-surface-100">Every transition is validated server-side</p>
          </div>
        </div>
      </div>

      {showNew && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          onClick={() => !busy && setShowNew(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Order a procedure"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-healthcare-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-surface-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-success-400 to-primary-600 shadow-healthcare">
                  <Syringe className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-surface-800">Order Procedure</h3>
                  <p className="text-[12px] text-surface-400">Pick from the catalog or enter a custom one</p>
                </div>
              </div>
              <button
                onClick={() => setShowNew(false)}
                disabled={busy}
                className="rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {modalError && (
                <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-2.5 text-[12px] font-medium text-danger-700">
                  {modalError}
                </div>
              )}

              <Field label="Procedure" required error={fieldErrors.procedure}>
                <div className="grid grid-cols-3 gap-2">
                  {catalog.map((p) => {
                    const Icon = p.icon
                    const active = customName.trim() === '' && selectedProc === p.name
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => { setSelectedProc(p.name); setCustomName(''); setPriceRupees(String(p.price)); setFieldErrors(prev => ({ ...prev, procedure: '' })) }}
                        className={`rounded-xl border px-2 py-2.5 text-[11px] font-semibold transition-all flex flex-col items-center gap-1 ${
                          active
                            ? 'border-primary-400 bg-primary-50 text-primary-700 ring-2 ring-primary-500/20'
                            : 'border-surface-200 bg-surface-50 text-surface-600 hover:border-surface-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {p.name}
                        <span className="text-[10px] font-normal text-surface-400">₹{p.price}</span>
                      </button>
                    )
                  })}
                </div>
                <input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="…or type a custom procedure name"
                  className={`${inputCls(Boolean(fieldErrors.procedure))} mt-2`}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Patient" required error={fieldErrors.patientId}>
                  <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className={inputCls(Boolean(fieldErrors.patientId))}>
                    <option value="">Select patient…</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.firstName} {p.lastName} · {p.phone}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Doctor" required error={fieldErrors.doctorId}>
                  <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={inputCls(Boolean(fieldErrors.doctorId))}>
                    <option value="">Select doctor…</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>{d.fullName}{d.specialty ? ` · ${d.specialty}` : ''}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Charge (₹)" required error={fieldErrors.priceRupees}>
                  <input
                    value={priceRupees}
                    onChange={(e) => setPriceRupees(e.target.value.replace(/[^\d.]/g, ''))}
                    placeholder="0"
                    inputMode="decimal"
                    className={inputCls(Boolean(fieldErrors.priceRupees))}
                  />
                </Field>
                <Field label="Room / Bay">
                  <input
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="OPD-1 / Procedure Room"
                    className={inputCls()}
                  />
                </Field>
              </div>

              <Field label="Notes">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={1000}
                  placeholder="Consent taken, site details…"
                  className={`${inputCls()} resize-none`}
                />
              </Field>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-surface-100 bg-white px-6 py-4">
              <button
                onClick={() => setShowNew(false)}
                disabled={busy}
                className="rounded-xl border border-surface-200 px-4 py-2.5 text-[13px] font-medium text-surface-600 transition-colors hover:bg-surface-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <Button onClick={submitNew} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {busy ? 'Ordering…' : 'Place Order'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
