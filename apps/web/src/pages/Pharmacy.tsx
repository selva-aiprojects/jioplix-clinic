import { useEffect, useMemo, useState } from 'react'
import {
  Pill, CheckCircle2, Clock, AlertTriangle, Search, Package,
  IndianRupee, TrendingUp, ShieldCheck, Boxes,
  CircleDot, X, Loader2, CheckCheck, AlertCircle,
} from 'lucide-react'
import { PageHeader, StatCard, Button } from '../components/ui'
import {
  listDispenseQueue, dispensePrescription, listInventoryItems, adjustStock,
  listInvoices, describeApiError,
  type DispenseQueueItem, type InventoryItem, type Invoice,
} from '../lib/api'

function relativeTime(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs} hr${hrs > 1 ? 's' : ''} ago`
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(`${dateStr}T00:00:00`).getTime() - Date.now()) / 86400000)
}

function stockStatus(d: InventoryItem) {
  if (d.quantity === 0) return { label: 'Out of Stock', cls: 'bg-danger-50 text-danger-600 border-danger-100' }
  if (d.expiryDate && daysUntil(d.expiryDate) <= 90 && daysUntil(d.expiryDate) >= 0) {
    return { label: 'Expiring Soon', cls: 'bg-warning-50 text-warning-600 border-warning-100' }
  }
  if (d.quantity < d.reorderLevel) return { label: 'Low Stock', cls: 'bg-warning-50 text-warning-600 border-warning-100' }
  return { label: 'In Stock', cls: 'bg-success-50 text-success-700 border-success-200' }
}

const tabs = ['Dispense Queue', 'Drug Master', "Today's Sales"] as const

export default function Pharmacy() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Dispense Queue')
  const [search, setSearch] = useState('')

  const [queue, setQueue] = useState<DispenseQueueItem[]>([])
  const [medicines, setMedicines] = useState<InventoryItem[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  const [busyId, setBusyId] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)

  const [showPurchase, setShowPurchase] = useState(false)
  const [purchaseItemId, setPurchaseItemId] = useState('')
  const [purchaseQty, setPurchaseQty] = useState('')
  const [purchaseNotes, setPurchaseNotes] = useState('')
  const [purchaseBusy, setPurchaseBusy] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [purchaseFieldError, setPurchaseFieldError] = useState<string | null>(null)

  async function refresh() {
    try {
      const [q, meds, invs] = await Promise.all([
        listDispenseQueue(),
        listInventoryItems({ category: 'medicines' }),
        listInvoices(),
      ])
      setQueue(q)
      setMedicines(meds)
      setInvoices(invs)
      setPageError(null)
    } catch (e) {
      setPageError(describeApiError(e))
    }
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([
      listDispenseQueue(),
      listInventoryItems({ category: 'medicines' }),
      listInvoices().catch(() => [] as Invoice[]),
    ])
      .then(([q, meds, invs]) => {
        if (cancelled) return
        setQueue(q)
        setMedicines(meds)
        setInvoices(invs)
      })
      .catch((e) => { if (!cancelled) setPageError(describeApiError(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 6000)
    return () => clearTimeout(t)
  }, [flash])

  useEffect(() => {
    if (!showPurchase) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !purchaseBusy) setShowPurchase(false)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [showPurchase, purchaseBusy])

  async function dispense(item: DispenseQueueItem) {
    setBusyId(item.prescriptionId)
    setPageError(null)
    try {
      await dispensePrescription(item.prescriptionId)
      await refresh()
      setFlash(`Dispensed ${item.items.length} item${item.items.length > 1 ? 's' : ''} for ${item.patientName} · stock updated`)
    } catch (e) {
      setPageError(describeApiError(e))
    } finally {
      setBusyId(null)
    }
  }

  function openPurchase(item?: InventoryItem) {
    setPurchaseItemId(item?.id ?? '')
    setPurchaseQty('')
    setPurchaseNotes('')
    setPurchaseError(null)
    setPurchaseFieldError(null)
    setShowPurchase(true)
  }

  async function submitPurchase() {
    const qty = Number(purchaseQty)
    if (!Number.isInteger(qty) || qty <= 0) {
      setPurchaseFieldError('Enter a whole number greater than 0')
      return
    }
    if (!purchaseItemId) {
      setPurchaseFieldError('Select a medicine')
      return
    }
    setPurchaseBusy(true)
    setPurchaseError(null)
    try {
      const updated = await adjustStock(purchaseItemId, {
        delta: qty,
        reason: 'purchase',
        notes: purchaseNotes.trim() || undefined,
      })
      setMedicines(prev => prev.map(m => (m.id === updated.id ? updated : m)))
      setShowPurchase(false)
      setFlash(`${updated.name}: +${qty.toLocaleString()} ${updated.unit} received into stock`)
    } catch (e) {
      setPurchaseError(describeApiError(e))
    } finally {
      setPurchaseBusy(false)
    }
  }

  const initials = (name: string) =>
    name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  const issued = queue.filter((q) => q.status === 'issued')
  const dispensedToday = queue.filter((q) => q.status === 'dispensed')
  const readyToDispense = issued.filter((q) => q.items.every((i) => i.stockAvailable))

  const todayStr = new Date().toISOString().slice(0, 10)
  const salesToday = useMemo(
    () => invoices.filter((inv) => inv.createdAt.slice(0, 10) === todayStr),
    [invoices, todayStr],
  )
  const revenueToday = salesToday.reduce((sum, inv) => sum + inv.paidPaise, 0)
  const collectedToday = salesToday.reduce((sum, inv) => sum + inv.totalPaise, 0)

  const lowStockMeds = medicines.filter((m) => m.quantity < m.reorderLevel)
  const outOfStock = medicines.filter((m) => m.quantity === 0)
  const expiringSoon = medicines.filter(
    (m) => m.expiryDate && daysUntil(m.expiryDate) <= 90 && daysUntil(m.expiryDate) >= 0,
  )

  const filteredDrugs = medicines.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Pill}
        tint="sky"
        badge="Add-on"
        title="Pharmacy"
        subtitle={loading ? 'Loading…' : `${issued.length} prescriptions awaiting dispensing`}
        actions={
          <>
            <Button variant="secondary" onClick={() => openPurchase()}>
              <Boxes className="w-4 h-4" /> Purchase Entry
            </Button>
            <Button onClick={() => void refresh()}>
              <CheckCheck className="w-4 h-4" /> Refresh
            </Button>
          </>
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
          { label: 'Pending Rx', value: String(issued.length), icon: Clock, tone: 'amber' as const },
          { label: 'Ready to Dispense', value: String(readyToDispense.length), icon: ShieldCheck, tone: 'teal' as const },
          { label: 'Dispensed Today', value: String(dispensedToday.length), icon: CheckCircle2, tone: 'green' as const },
          { label: 'Collected Today', value: `₹${Math.round(collectedToday / 100).toLocaleString()}`, icon: IndianRupee, tone: 'indigo' as const },
          { label: 'Low Stock', value: String(lowStockMeds.length), icon: AlertTriangle, tone: 'rose' as const },
          { label: 'Expiring ≤90d', value: String(expiringSoon.length), icon: CircleDot, tone: 'slate' as const },
        ].map((m) => (
          <StatCard key={m.label} {...m} />
        ))}
      </div>

      {(outOfStock.length > 0 || expiringSoon.length > 0) && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-warning-50 border border-warning-100">
          <AlertTriangle className="w-4.5 h-4.5 text-warning-600 flex-shrink-0" />
          <p className="text-[13px] text-warning-700 flex-1">
            {outOfStock.length > 0 && (
              <>
                <strong>{outOfStock.slice(0, 2).map((m) => m.name).join(', ')}</strong>
                {outOfStock.length > 1 ? ` are out of stock` : ` is out of stock`}
              </>
            )}
            {outOfStock.length > 0 && expiringSoon.length > 0 && ' · '}
            {expiringSoon.length > 0 && `${expiringSoon.length} batch${expiringSoon.length > 1 ? 'es' : ''} expire within 90 days.`}
          </p>
          <button
            onClick={() => openPurchase(outOfStock[0] ?? expiringSoon[0])}
            className="px-3 py-1.5 rounded-lg bg-white border border-warning-200 text-[12px] font-semibold text-warning-700 hover:bg-warning-100 transition-colors whitespace-nowrap"
          >
            Record Purchase
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 p-1 bg-surface-100 rounded-xl">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                tab === t ? 'bg-white text-surface-800 shadow-sm' : 'text-surface-500 hover:text-surface-700'
              }`}
            >
              {t}
              {t === 'Dispense Queue' && issued.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-warning-100 text-warning-700 text-[10px] font-bold">{issued.length}</span>
              )}
            </button>
          ))}
        </div>
        {tab === 'Drug Master' && (
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brand or generic..."
              className="w-full pl-10 pr-4 py-2 text-[13px] bg-white border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-info-500/30 focus:border-info-400 transition-all placeholder:text-surface-400"
            />
          </div>
        )}
      </div>

      {tab === 'Dispense Queue' && (
        <div className="grid lg:grid-cols-2 gap-4">
          {loading && (
            <div className="col-span-full py-12 text-center text-[13px] text-surface-400">Loading dispense queue…</div>
          )}
          {!loading && queue.length === 0 && (
            <div className="col-span-full rounded-2xl border border-surface-100 bg-white py-12 text-center shadow-healthcare">
              <Pill className="w-8 h-8 text-surface-300 mx-auto mb-2" />
              <p className="text-[13px] text-surface-400">No prescriptions waiting</p>
              <p className="text-[12px] text-surface-300 mt-1">Issued prescriptions from Consultation appear here automatically</p>
            </div>
          )}
          {queue.map((rx, idx) => (
            <div key={rx.prescriptionId} className="bg-white rounded-2xl border border-surface-100 shadow-healthcare overflow-hidden hover:shadow-healthcare-lg transition-shadow">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100 bg-surface-50/50">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-surface-800 text-white flex items-center justify-center text-[13px] font-bold">{idx + 1}</span>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-info-400 to-info-600 flex items-center justify-center text-white text-[11px] font-bold">{initials(rx.patientName)}</div>
                  <div>
                    <p className="text-[13px] font-semibold text-surface-800 leading-tight">{rx.patientName}</p>
                    <p className="text-[11px] text-surface-400">
                      {[rx.patientAge != null ? `${rx.patientAge}${rx.patientGender ?? ''}` : null, rx.doctorName, relativeTime(rx.createdAt)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                  rx.status === 'dispensed'
                    ? 'bg-success-50 text-success-700 border-success-200'
                    : 'bg-info-50 text-info-600 border-info-100'
                }`}>{rx.status === 'dispensed' ? 'Dispensed' : 'Ready'}</span>
              </div>
              <div className="px-5 py-3 space-y-2">
                {rx.items.map((m, i) => (
                  <div key={`${rx.prescriptionId}-${m.drugName}-${i}`} className="flex items-center gap-3 py-1.5">
                    <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${m.stockAvailable ? 'bg-success-400' : 'bg-danger-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-surface-800 truncate">
                        {m.drugName} <span className="text-surface-400 font-normal">{[m.strength, m.form].filter(Boolean).join(' · ')}</span>
                      </p>
                      <p className="text-[11px] text-surface-400">{m.dosage} · {m.frequency}</p>
                    </div>
                    <span className={`text-[12px] font-semibold ${m.stockAvailable ? 'text-surface-600' : 'text-danger-500'}`}>
                      ×{m.quantity ?? '—'}{!m.stockAvailable && ' · NA'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 px-5 py-3 border-t border-surface-100">
                {rx.status === 'issued' ? (
                  <>
                    <button
                      onClick={() => void dispense(rx)}
                      disabled={busyId === rx.prescriptionId}
                      className="flex-1 py-2 rounded-xl bg-success-500 text-white text-[12px] font-semibold hover:bg-success-600 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {busyId === rx.prescriptionId
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <CheckCircle2 className="w-4 h-4" />}
                      Dispense All
                    </button>
                    {!rx.items.every((i) => i.stockAvailable) && (
                      <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-warning-200 bg-warning-50 text-[11px] font-semibold text-warning-700 whitespace-nowrap">
                        <AlertTriangle className="w-3.5 h-3.5" /> Partial stock
                      </span>
                    )}
                  </>
                ) : (
                  <span className="w-full py-2 inline-flex justify-center items-center gap-1.5 rounded-xl bg-surface-50 text-surface-500 text-[12px] font-semibold border border-surface-200 cursor-default">
                    <CheckCircle2 className="w-4 h-4 text-success-500" /> Dispensed · stock deducted
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Drug Master' && (
        <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50/50">
                  {['Medicine', 'Unit', 'Batch', 'Expiry', 'Stock', 'MRP', 'Status', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDrugs.map((d) => {
                  const s = stockStatus(d)
                  const pct = Math.min(100, Math.round((d.quantity / Math.max(d.reorderLevel * 4, 1)) * 100))
                  return (
                    <tr key={d.id} className="border-b border-surface-50 last:border-0 hover:bg-surface-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-[13px] font-semibold text-surface-800">{d.name}</p>
                        {d.supplier && <p className="text-[11px] text-surface-400">{d.supplier}</p>}
                      </td>
                      <td className="px-5 py-3 text-[12px] text-surface-600 whitespace-nowrap">{d.unit}</td>
                      <td className="px-5 py-3 text-[12px] text-surface-500 font-mono">{d.batchNo ?? '—'}</td>
                      <td className="px-5 py-3 text-[12px] text-surface-600 whitespace-nowrap">
                        {d.expiryDate ? new Date(`${d.expiryDate}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-surface-100 overflow-hidden">
                            <div className={`h-full rounded-full ${d.quantity === 0 ? 'bg-danger-400' : d.quantity < d.reorderLevel ? 'bg-warning-400' : 'bg-success-400'}`} style={{ width: `${Math.max(pct, 4)}%` }} />
                          </div>
                          <span className="text-[12px] font-semibold text-surface-700">{d.quantity}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[12px] text-surface-600">₹{(d.unitPricePaise / 100).toFixed(2)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border whitespace-nowrap ${s.cls}`}>{s.label}</span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => openPurchase(d)}
                          title="Record purchase"
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-primary-600 border border-primary-200 hover:bg-primary-50 transition-colors whitespace-nowrap"
                        >
                          Restock
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {!loading && filteredDrugs.length === 0 && (
            <div className="py-12 text-center">
              <Package className="w-8 h-8 text-surface-300 mx-auto mb-2" />
              <p className="text-[13px] text-surface-400">No medicines found</p>
              <button onClick={() => openPurchase()} className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-primary-600 hover:text-primary-700">
                <Package className="w-3.5 h-3.5" /> Add via Purchase Entry
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "Today's Sales" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-100 shadow-healthcare overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100">
              <h2 className="text-[15px] font-semibold text-surface-800">Transactions</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-50">
                  {['Time', 'Invoice', 'Patient', 'Amount', 'Payment'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salesToday.map((s) => (
                  <tr key={s.id} className="border-b border-surface-50 last:border-0 hover:bg-surface-50/50 transition-colors">
                    <td className="px-5 py-3 text-[12px] text-surface-500 whitespace-nowrap">
                      {new Date(s.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-surface-500 font-mono">{s.invoiceNo}</td>
                    <td className="px-5 py-3 text-[13px] font-medium text-surface-800">{s.patientName}</td>
                    <td className="px-5 py-3 text-[13px] font-semibold text-surface-800">₹{(s.totalPaise / 100).toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                        s.status === 'paid'
                          ? 'bg-success-50 text-success-700 border-success-200'
                          : s.status === 'void' || s.status === 'refunded'
                            ? 'bg-warning-50 text-warning-600 border-warning-100'
                            : 'bg-info-50 text-info-600 border-info-100'
                      }`}>{s.status}</span>
                    </td>
                  </tr>
                ))}
                {!loading && salesToday.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-center text-[13px] text-surface-400">No sales recorded yet today</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-info-500 to-info-600 rounded-2xl p-5 text-white shadow-healthcare-lg">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5" />
                <h3 className="text-[14px] font-semibold">Pharmacy Summary</h3>
              </div>
              <p className="text-3xl font-bold">₹{Math.round(collectedToday / 100).toLocaleString()}</p>
              <p className="text-[12px] text-white/70 mt-1">Billed today · {salesToday.length} bills</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <p className="text-[11px] text-white/70">Collected</p>
                  <p className="text-[15px] font-bold mt-0.5">₹{Math.round(revenueToday / 100).toLocaleString()}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <p className="text-[11px] text-white/70">Pending Rx</p>
                  <p className="text-[15px] font-bold mt-0.5">{issued.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
              <h3 className="text-[14px] font-semibold text-surface-800 mb-3">Stock Alerts</h3>
              <div className="space-y-2.5">
                {[...outOfStock, ...lowStockMeds].slice(0, 5).map((m) => (
                  <div key={m.id} className="flex items-center justify-between">
                    <span className="text-[12px] text-surface-600 truncate pr-2">{m.name}</span>
                    <span className={`text-[12px] font-bold ${m.quantity === 0 ? 'text-danger-600' : 'text-warning-600'}`}>
                      {m.quantity === 0 ? 'Out' : `${m.quantity} left`}
                    </span>
                  </div>
                ))}
                {outOfStock.length + lowStockMeds.length === 0 && (
                  <p className="text-[12px] text-surface-400">All medicines healthy</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPurchase && (() => {
        const selected = medicines.find((m) => m.id === purchaseItemId)
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
            onClick={() => !purchaseBusy && setShowPurchase(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Record purchase entry"
              className="w-full max-w-md rounded-2xl bg-white shadow-healthcare-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-surface-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-info-400 to-info-600 shadow-healthcare">
                    <Boxes className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-surface-800">Purchase Entry</h3>
                    <p className="text-[12px] text-surface-400">Adds received stock to the shared inventory</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPurchase(false)}
                  disabled={purchaseBusy}
                  className="rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 px-6 py-5">
                {purchaseError && (
                  <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-2.5 text-[12px] font-medium text-danger-700">
                    {purchaseError}
                  </div>
                )}

                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-surface-600">Medicine<span className="text-danger-500"> *</span></span>
                  <select
                    value={purchaseItemId}
                    onChange={(e) => { setPurchaseItemId(e.target.value); setPurchaseFieldError(null) }}
                    className={`w-full rounded-xl border px-3 py-2 text-[13px] bg-surface-50 transition-all focus:outline-none focus:ring-2 ${
                      purchaseFieldError
                        ? 'border-danger-300 focus:border-danger-400 focus:ring-danger-500/20'
                        : 'border-surface-200 focus:border-primary-400 focus:ring-primary-500/30'
                    }`}
                  >
                    <option value="">Select medicine…</option>
                    {medicines.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.quantity} {m.unit} on hand)</option>
                    ))}
                  </select>
                  {purchaseFieldError && !purchaseQty && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-danger-600">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" /> {purchaseFieldError}
                    </span>
                  )}
                </label>

                {selected && (
                  <p className="text-[12px] text-surface-500">
                    Current stock: <strong className="text-surface-800">{selected.quantity.toLocaleString()} {selected.unit}</strong> → after receipt:{' '}
                    <strong className="text-success-600">{(selected.quantity + (Number(purchaseQty) || 0)).toLocaleString()} {selected.unit}</strong>
                  </p>
                )}

                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-surface-600">Quantity Received<span className="text-danger-500"> *</span></span>
                  <input
                    value={purchaseQty}
                    onChange={(e) => { setPurchaseQty(e.target.value.replace(/[^\d]/g, '')); setPurchaseFieldError(null) }}
                    placeholder="0"
                    inputMode="numeric"
                    autoFocus
                    className={`w-full rounded-xl border px-3 py-2 text-[13px] bg-surface-50 transition-all focus:outline-none focus:ring-2 ${
                      purchaseFieldError
                        ? 'border-danger-300 focus:border-danger-400 focus:ring-danger-500/20'
                        : 'border-surface-200 focus:border-primary-400 focus:ring-primary-500/30'
                    }`}
                  />
                  {purchaseFieldError && purchaseQty !== '' && Number(purchaseQty) <= 0 && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-danger-600">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" /> Enter a whole number greater than 0
                    </span>
                  )}
                </label>

                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-surface-600">Invoice / Supplier Notes</span>
                  <textarea
                    value={purchaseNotes}
                    onChange={(e) => setPurchaseNotes(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Supplier, bill reference…"
                    className="w-full resize-none rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 text-[13px] transition-all placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
                  />
                </label>
              </div>

              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-surface-100 bg-white px-6 py-4">
                <button
                  onClick={() => setShowPurchase(false)}
                  disabled={purchaseBusy}
                  className="rounded-xl border border-surface-200 px-4 py-2.5 text-[13px] font-medium text-surface-600 transition-colors hover:bg-surface-50 disabled:opacity-40"
                >
                  Cancel
                </button>
                <Button onClick={submitPurchase} disabled={purchaseBusy}>
                  {purchaseBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {purchaseBusy ? 'Recording…' : 'Record Purchase'}
                </Button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
