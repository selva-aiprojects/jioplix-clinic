import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Beaker, FlaskConical, Clock, CheckCircle2, AlertTriangle, Search,
  FileText, Microscope, ArrowRight, Droplets,
  ShieldCheck, X, Loader2, Plus, AlertCircle, UserRound,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader, StatCard, Button } from '../components/ui'
import {
  listLabOrders, createLabOrder, updateLabOrderStatus, saveLabResults,
  listPatients, listDoctors, describeApiError,
  type LabOrder, type Patient, type DoctorOption,
} from '../lib/api'

const pipelineSteps: LabOrder['status'][] = ['ordered', 'collected', 'processing', 'completed', 'reviewed']

const statusLabels: Record<LabOrder['status'], string> = {
  ordered: 'Ordered',
  collected: 'Collected',
  processing: 'Processing',
  completed: 'Completed',
  reviewed: 'Reviewed',
  cancelled: 'Cancelled',
}

const priorityStyles: Record<LabOrder['priority'], string> = {
  routine: 'bg-surface-100 text-surface-600 border-surface-200',
  urgent: 'bg-warning-50 text-warning-600 border-warning-100',
  stat: 'bg-danger-50 text-danger-600 border-danger-100',
}

const priorityLabels: Record<LabOrder['priority'], string> = {
  routine: 'Routine',
  urgent: 'Urgent',
  stat: 'STAT',
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

function Pipeline({ status }: { status: LabOrder['status'] }) {
  const idx = pipelineSteps.indexOf(status)
  if (status === 'cancelled') {
    return (
      <span className="inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border bg-surface-100 text-surface-500 border-surface-200">
        Cancelled
      </span>
    )
  }
  return (
    <div className="flex items-center gap-0">
      {pipelineSteps.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i < idx ? 'bg-success-400' : i === idx ? (idx === pipelineSteps.length - 1 ? 'bg-success-500 ring-4 ring-success-100' : 'bg-primary-500 ring-4 ring-primary-100') : 'bg-surface-200'
              }`}
            />
            <span className={`text-[9px] font-medium whitespace-nowrap ${i <= idx ? 'text-surface-700' : 'text-surface-300'}`}>{statusLabels[step]}</span>
          </div>
          {i < pipelineSteps.length - 1 && (
            <div className={`w-4 h-0.5 mx-0.5 mb-3.5 ${i < idx ? 'bg-success-400' : 'bg-surface-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

const COMMON_PANELS = ['CBC', 'LFT', 'KFT', 'Lipid Profile', 'HbA1c', 'TSH', 'Urine Routine', 'Blood Glucose (F)', 'Widal Test']

interface ResultRow {
  value: string
  unit: string
  flag: 'normal' | 'high' | 'low'
}

export default function Laboratory() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<'orders' | 'results'>('orders')
  const [orders, setOrders] = useState<LabOrder[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<DoctorOption[]>([])
  const [loading, setLoading] = useState(true)

  const [showNew, setShowNew] = useState(false)
  const [patientId, setPatientId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [priority, setPriority] = useState<LabOrder['priority']>('routine')
  const [tests, setTests] = useState<string[]>([])
  const [testInput, setTestInput] = useState('')
  const [notes, setNotes] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const [activeId, setActiveId] = useState<string | null>(null)
  const [rows, setRows] = useState<Record<string, ResultRow>>({})

  const [flash, setFlash] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  async function refresh() {
    try {
      const data = await listLabOrders(new Date().toISOString().slice(0, 10))
      setOrders(data)
      setPageError(null)
    } catch (e) {
      setPageError(describeApiError(e))
    }
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([
      listLabOrders(new Date().toISOString().slice(0, 10)),
      listPatients().catch(() => [] as Patient[]),
      listDoctors().catch(() => [] as DoctorOption[]),
    ])
      .then(([orderData, patientData, doctorData]) => {
        if (cancelled) return
        setOrders(orderData)
        setPatients(patientData)
        setDoctors(doctorData)
        if (doctorData[0]) setDoctorId(doctorData[0].id)
        const firstActive = orderData.find((o) => o.status === 'processing' || o.status === 'collected')
          ?? orderData.find((o) => o.status === 'completed')
        if (firstActive) setActiveId(firstActive.id)
      })
      .catch((e) => { if (!cancelled) setPageError(describeApiError(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

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

  const activeOrder = useMemo(
    () => orders.find((o) => o.id === activeId) ?? null,
    [orders, activeId],
  )

  useEffect(() => {
    if (!activeOrder) return
    setRows(Object.fromEntries(
      activeOrder.investigations.map((inv) => [
        inv.name,
        {
          value: activeOrder.results?.find((r) => r.name === inv.name)?.value ?? '',
          unit: activeOrder.results?.find((r) => r.name === inv.name)?.unit ?? '',
          flag: (activeOrder.results?.find((r) => r.name === inv.name)?.flag as ResultRow['flag']) ?? 'normal',
        },
      ]),
    ))
  }, [activeOrder])

  function openNew() {
    setPatientId(patients[0]?.id ?? '')
    setDoctorId(doctors[0]?.id ?? '')
    setPriority('routine')
    setTests([])
    setTestInput('')
    setNotes('')
    setFieldErrors({})
    setModalError(null)
    setShowNew(true)
  }

  function addTest(raw?: string) {
    const value = (raw ?? testInput).trim()
    if (!value || tests.some((t) => t.toLowerCase() === value.toLowerCase())) return
    if (tests.length >= 25) return
    setTests(prev => [...prev, value])
    setTestInput('')
    setFieldErrors(prev => {
      if (!prev.tests) return prev
      const next = { ...prev }
      delete next.tests
      return next
    })
  }

  async function submitNew() {
    const errs: Record<string, string> = {}
    if (!patientId) errs.patientId = 'Select a patient'
    if (!doctorId) errs.doctorId = 'Select the ordering doctor'
    if (tests.length === 0) errs.tests = 'Add at least one investigation'
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }
    setBusy(true)
    setModalError(null)
    try {
      const created = await createLabOrder({
        patientId,
        doctorId,
        priority,
        investigations: tests.map((name) => ({ name })),
        notes: notes.trim() || undefined,
      })
      setOrders(prev => [...prev, created])
      setShowNew(false)
      setTab('orders')
      setFlash(`${created.orderNo} created for ${created.patientName} · ${created.investigations.length} investigations`)
    } catch (e) {
      setModalError(describeApiError(e))
    } finally {
      setBusy(false)
    }
  }

  async function advance(o: LabOrder, next: LabOrder['status']) {
    try {
      const updated = await updateLabOrderStatus(o.id, next)
      setOrders(prev => prev.map(x => (x.id === updated.id ? updated : x)))
      setFlash(`${updated.orderNo} → ${statusLabels[next]}`)
    } catch (e) {
      setPageError(describeApiError(e))
    }
  }

  async function submitResults(complete: boolean) {
    if (!activeOrder) return
    const entries = Object.entries(rows)
      .filter(([, r]) => r.value.trim() !== '')
      .map(([name, r]) => ({
        name,
        value: r.value.trim(),
        unit: r.unit.trim() || undefined,
        flag: r.flag,
      }))
    if (entries.length === 0) {
      setPageError('Enter at least one result value before saving.')
      return
    }
    setBusy(true)
    setPageError(null)
    try {
      const updated = await saveLabResults(activeOrder.id, entries, complete)
      setOrders(prev => prev.map(x => (x.id === updated.id ? updated : x)))
      setFlash(complete
        ? `${updated.orderNo} results saved · marked ${statusLabels[updated.status]}`
        : `${updated.orderNo} draft saved`)
    } catch (e) {
      setPageError(describeApiError(e))
    } finally {
      setBusy(false)
    }
  }

  async function markReviewed() {
    if (!activeOrder) return
    await advance(activeOrder, 'reviewed')
  }

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase()
    return (
      o.patientName.toLowerCase().includes(q) ||
      o.orderNo.toLowerCase().includes(q) ||
      o.investigations.some((i) => i.name.toLowerCase().includes(q))
    )
  })

  const pending = orders.filter((o) => o.status !== 'reviewed' && o.status !== 'cancelled').length
  const samplesPending = orders.filter((o) => o.status === 'ordered').length
  const processingCount = orders.filter((o) => o.status === 'processing').length
  const awaitingReview = orders.filter((o) => o.status === 'completed').length
  const reviewedToday = orders.filter((o) => o.status === 'reviewed').length

  const criticalValues = orders.flatMap((o) =>
    (o.results ?? [])
      .filter((r) => r.flag === 'high' || r.flag === 'low')
      .map((r) => ({ order: o, result: r })),
  )

  const initials = (name: string) =>
    name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FlaskConical}
        tint="rose"
        badge="Add-on"
        title="Laboratory"
        subtitle={loading ? 'Loading…' : `${orders.length} orders today · live sample pipeline`}
        actions={
          <Button onClick={openNew}>
            <Beaker className="w-4 h-4" /> New Lab Order
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Orders Today', value: String(orders.length), icon: FileText, tone: 'indigo' as const },
          { label: 'Samples Pending', value: String(samplesPending), icon: Droplets, tone: 'sky' as const },
          { label: 'Processing', value: String(processingCount), icon: Microscope, tone: 'amber' as const },
          { label: 'Awaiting Review', value: String(awaitingReview), icon: AlertTriangle, tone: 'rose' as const },
          { label: 'Reviewed Today', value: String(reviewedToday), icon: CheckCircle2, tone: 'green' as const },
          { label: 'Open Queue', value: String(pending), icon: Clock, tone: 'teal' as const },
        ].map((m) => (
          <StatCard key={m.label} {...m} />
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-1 p-1 bg-surface-100 rounded-xl w-fit">
          {([
            ['orders', 'Lab Orders'],
            ['results', 'Result Entry'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                tab === key ? 'bg-white text-surface-800 shadow-sm' : 'text-surface-500 hover:text-surface-700'
              }`}
            >
              {label}
              {key === 'orders' && pending > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-danger-100 text-danger-600 text-[10px] font-bold">{pending}</span>
              )}
            </button>
          ))}
        </div>
        {tab === 'orders' && (
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient or order ID..."
              className="w-full pl-10 pr-4 py-2 text-[13px] bg-white border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-danger-500/20 focus:border-danger-400 transition-all placeholder:text-surface-400"
            />
          </div>
        )}
      </div>

      {tab === 'orders' && (
        <div className="space-y-4">
          {loading && (
            <div className="py-12 text-center text-[13px] text-surface-400">Loading lab orders…</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl border border-surface-100 bg-white py-12 text-center shadow-healthcare">
              <FlaskConical className="w-8 h-8 text-surface-300 mx-auto mb-2" />
              <p className="text-[13px] text-surface-400">No lab orders today</p>
              <button onClick={openNew} className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-primary-600 hover:text-primary-700">
                <Plus className="w-3.5 h-3.5" /> Create the first one
              </button>
            </div>
          )}
          {filtered.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5 hover:shadow-healthcare-lg transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-center gap-3 min-w-[220px]">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-[11px] font-bold ${
                    o.priority === 'stat' ? 'bg-gradient-to-br from-danger-400 to-danger-600'
                      : o.priority === 'urgent' ? 'bg-gradient-to-br from-warning-400 to-warning-600'
                        : 'bg-gradient-to-br from-info-400 to-info-600'
                  }`}>{initials(o.patientName)}</div>
                  <div>
                    <p className="text-[13px] font-semibold text-surface-800 leading-tight">{o.patientName}</p>
                    <p className="text-[11px] text-surface-400">{o.orderNo} · {new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {o.doctorName}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 flex-1 max-w-md">
                  {o.investigations.map((inv) => (
                    <span key={inv.name} className="px-2 py-1 rounded-lg bg-surface-50 border border-surface-200 text-[11px] font-medium text-surface-600 whitespace-nowrap">
                      {inv.name}
                      {inv.sampleType && <span className="ml-1 text-surface-400">· {inv.sampleType}</span>}
                    </span>
                  ))}
                </div>

                <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border whitespace-nowrap ${priorityStyles[o.priority]}`}>
                  {priorityLabels[o.priority]}
                </span>

                <Pipeline status={o.status} />

                <div className="flex items-center gap-2 ml-auto">
                  {o.status === 'ordered' && (
                    <button
                      onClick={() => void advance(o, 'collected')}
                      disabled={busy}
                      className="px-3 py-2 rounded-xl bg-info-500 text-white text-[12px] font-semibold hover:bg-info-600 transition-colors whitespace-nowrap"
                    >
                      Collect Sample
                    </button>
                  )}
                  {o.status === 'collected' && (
                    <button
                      onClick={() => void advance(o, 'processing')}
                      disabled={busy}
                      className="px-3 py-2 rounded-xl bg-warning-500 text-white text-[12px] font-semibold hover:bg-warning-600 transition-colors whitespace-nowrap"
                    >
                      Start Processing
                    </button>
                  )}
                  {(o.status === 'processing' || o.status === 'completed') && (
                    <button
                      onClick={() => { setActiveId(o.id); setTab('results') }}
                      className="px-3 py-2 rounded-xl bg-primary-500 text-white text-[12px] font-semibold hover:bg-primary-600 transition-colors whitespace-nowrap"
                    >
                      {o.status === 'completed' ? 'View Results' : 'Enter Results'}
                    </button>
                  )}
                  {o.status === 'reviewed' && (
                    <button className="px-3 py-2 rounded-xl bg-success-50 text-success-700 border border-success-200 text-[12px] font-semibold flex items-center gap-1.5 cursor-default">
                      <ShieldCheck className="w-4 h-4" /> Reviewed
                    </button>
                  )}
                  {o.status === 'cancelled' && (
                    <span className="text-[12px] text-surface-400">—</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'results' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {orders.filter((o) => ['collected', 'processing', 'completed'].includes(o.status)).map((o) => (
                <button
                  key={o.id}
                  onClick={() => setActiveId(o.id)}
                  className={`px-3 py-2 rounded-xl border text-[12px] font-medium whitespace-nowrap transition-all ${
                    activeId === o.id
                      ? 'border-primary-300 bg-primary-50 text-primary-700 ring-2 ring-primary-500/20'
                      : 'border-surface-200 bg-white text-surface-600 hover:border-surface-300'
                  }`}
                >
                  {o.orderNo} · {o.patientName.split(' ')[0]}
                </button>
              ))}
              {orders.filter((o) => ['collected', 'processing', 'completed'].includes(o.status)).length === 0 && (
                <p className="text-[13px] text-surface-400 py-2">Collect a sample first — nothing ready for result entry.</p>
              )}
            </div>

            {activeOrder && (
              <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
                  <div>
                    <h2 className="text-[15px] font-semibold text-surface-800">Result Entry — {activeOrder.orderNo}</h2>
                    <p className="text-[12px] text-surface-400 mt-0.5">{activeOrder.patientName} · Ordered by {activeOrder.doctorName}</p>
                  </div>
                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${priorityStyles[activeOrder.priority]}`}>
                    {priorityLabels[activeOrder.priority]}
                  </span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-100 bg-surface-50/50">
                      {['Investigation', 'Value', 'Unit', 'Flag'].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeOrder.investigations.map((inv) => {
                      const row = rows[inv.name]
                      const abnormal = row?.flag === 'high' || row?.flag === 'low'
                      return (
                        <tr key={inv.name} className={`border-b border-surface-50 last:border-0 ${abnormal && row?.value ? 'bg-danger-50/40' : ''}`}>
                          <td className="px-5 py-3 text-[13px] font-medium text-surface-800">{inv.name}</td>
                          <td className="px-5 py-3">
                            <input
                              value={row?.value ?? ''}
                              onChange={(e) => setRows(prev => ({ ...prev, [inv.name]: { ...prev[inv.name], value: e.target.value } }))}
                              placeholder="Enter value"
                              className={`w-28 px-3 py-1.5 text-[13px] font-semibold border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                                abnormal && row?.value
                                  ? 'border-danger-300 text-danger-600 bg-danger-50 focus:ring-danger-500/20'
                                  : 'border-surface-200 text-surface-800 bg-surface-50 focus:ring-primary-500/30 focus:border-primary-400 focus:bg-white'
                              }`}
                            />
                          </td>
                          <td className="px-5 py-3">
                            <input
                              value={row?.unit ?? ''}
                              onChange={(e) => setRows(prev => ({ ...prev, [inv.name]: { ...prev[inv.name], unit: e.target.value } }))}
                              placeholder="mg/dL"
                              className="w-24 px-3 py-1.5 text-[12px] border border-surface-200 rounded-lg bg-surface-50 text-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 focus:bg-white transition-all"
                            />
                          </td>
                          <td className="px-5 py-3">
                            <select
                              value={row?.flag ?? 'normal'}
                              onChange={(e) => setRows(prev => ({ ...prev, [inv.name]: { ...prev[inv.name], flag: e.target.value as ResultRow['flag'] } }))}
                              className={`px-2.5 py-1.5 text-[12px] font-medium border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                                row?.flag === 'normal'
                                  ? 'border-surface-200 bg-surface-50 text-surface-600 focus:ring-primary-500/30'
                                  : 'border-danger-300 bg-danger-50 text-danger-600 focus:ring-danger-500/20'
                              }`}
                            >
                              <option value="normal">Normal</option>
                              <option value="high">High</option>
                              <option value="low">Low</option>
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-t border-surface-100">
                  {activeOrder.status !== 'completed' && activeOrder.status !== 'reviewed' && (
                    <>
                      <button
                        onClick={() => void submitResults(false)}
                        disabled={busy}
                        className="px-4 py-2 rounded-xl border border-surface-200 text-[13px] font-medium text-surface-600 hover:bg-surface-50 transition-colors disabled:opacity-40"
                      >
                        Save Draft
                      </button>
                      <Button onClick={() => void submitResults(true)} disabled={busy}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Complete Order
                      </Button>
                    </>
                  )}
                  {activeOrder.status === 'completed' && (
                    <Button onClick={() => void markReviewed()} disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                      Mark Reviewed
                    </Button>
                  )}
                  {activeOrder.status === 'reviewed' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-success-50 text-success-700 border border-success-200 text-[12px] font-semibold cursor-default">
                      <ShieldCheck className="w-4 h-4" /> Reviewed & locked
                    </span>
                  )}
                  <span className="ml-auto text-[11px] text-surface-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Status: {statusLabels[activeOrder.status]}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-gradient-to-br from-danger-500 to-accent-600 rounded-2xl p-5 text-white shadow-healthcare-lg">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-[14px] font-semibold">Abnormal Flags</h3>
              </div>
              {criticalValues.length === 0 ? (
                <p className="text-[12px] text-white/70">No abnormal values recorded yet today.</p>
              ) : (
                <div className="space-y-2">
                  {criticalValues.slice(0, 4).map(({ order, result }) => (
                    <div key={`${order.id}-${result.name}`} className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                      <p className="text-[12px] font-semibold">{result.name} {result.value}{result.unit ? ` ${result.unit}` : ''} — {result.flag === 'high' ? 'High' : 'Low'}</p>
                      <p className="text-[11px] text-white/70 mt-0.5">{order.patientName} · {order.orderNo}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-white/60 mt-3">Flagged values surface here instantly while entering results.</p>
            </div>

            <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
              <h3 className="text-[14px] font-semibold text-surface-800 mb-3">Sample Workflow</h3>
              <div className="space-y-3">
                {pipelineSteps.map((s, i) => (
                  <div key={s} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i <= 3 ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-400'}`}>
                      {i + 1}
                    </div>
                    <span className="text-[12px] text-surface-600">{statusLabels[s]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          onClick={() => !busy && setShowNew(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Create new lab order"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-healthcare-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-surface-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-accent-600 shadow-healthcare">
                  <Beaker className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-surface-800">New Lab Order</h3>
                  <p className="text-[12px] text-surface-400">An order number (LB-…) is generated automatically</p>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Patient" required error={fieldErrors.patientId}>
                  <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className={inputCls(Boolean(fieldErrors.patientId))}>
                    <option value="">Select patient…</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.firstName} {p.lastName} · {p.phone}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Ordering Doctor" required error={fieldErrors.doctorId}>
                  <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={inputCls(Boolean(fieldErrors.doctorId))}>
                    <option value="">Select doctor…</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>{d.fullName}{d.specialty ? ` · ${d.specialty}` : ''}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Priority" required>
                <div className="grid grid-cols-3 gap-2">
                  {(['routine', 'urgent', 'stat'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`rounded-xl border px-3 py-2 text-[12px] font-semibold transition-all ${
                        priority === p
                          ? p === 'stat'
                            ? 'border-danger-400 bg-danger-50 text-danger-700 ring-2 ring-danger-500/20'
                            : p === 'urgent'
                              ? 'border-warning-400 bg-warning-50 text-warning-700 ring-2 ring-warning-500/20'
                              : 'border-primary-400 bg-primary-50 text-primary-700 ring-2 ring-primary-500/20'
                          : 'border-surface-200 bg-surface-50 text-surface-600 hover:border-surface-300'
                      }`}
                    >
                      {priorityLabels[p]}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Investigations" required error={fieldErrors.tests}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <FlaskConical className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
                    <input
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTest()
                        }
                      }}
                      placeholder="e.g. CBC, HbA1c…"
                      className={`${inputCls(Boolean(fieldErrors.tests))} pl-9`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => addTest()}
                    className="rounded-xl bg-surface-800 px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-surface-700"
                  >
                    Add
                  </button>
                </div>
                {tests.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tests.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 rounded-lg border border-surface-200 bg-surface-50 px-2 py-1 text-[11px] font-medium text-surface-700">
                        {t}
                        <button type="button" onClick={() => setTests(prev => prev.filter((x) => x !== t))} className="text-surface-400 hover:text-danger-500">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {COMMON_PANELS.filter((c) => !tests.includes(c)).slice(0, 6).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => addTest(c)}
                      className="rounded-lg border border-dashed border-surface-300 px-2 py-1 text-[11px] text-surface-500 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                    >
                      <Plus className="mr-0.5 inline h-3 w-3" />{c}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Notes">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={1000}
                  placeholder="Clinical context, fasting instructions…"
                  className={`${inputCls()} resize-none`}
                />
              </Field>
            </div>

            <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-surface-100 bg-white px-6 py-4">
              <span className="text-[11px] text-surface-400 hidden sm:flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5" />
                {patientId ? patients.find((p) => p.id === patientId)?.firstName : 'No patient selected'}
              </span>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setShowNew(false)}
                  disabled={busy}
                  className="rounded-xl border border-surface-200 px-4 py-2.5 text-[13px] font-medium text-surface-600 transition-colors hover:bg-surface-50 disabled:opacity-40"
                >
                  Cancel
                </button>
                <Button onClick={submitNew} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Beaker className="h-4 w-4" />}
                  {busy ? 'Creating…' : 'Create Order'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
