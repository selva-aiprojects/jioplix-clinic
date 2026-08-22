import { useEffect, useMemo, useState } from 'react'
import {
  CreditCard, Plus, Search,
  CheckCircle2, Clock, AlertCircle, XCircle,
  Smartphone, Banknote, Wallet, ArrowUpRight, X, IndianRupee,
} from 'lucide-react'
import { PageHeader, Button } from '../components/ui'
import { listInvoices, listPatients, createInvoice, addPayment } from '../lib/api'
import type { Invoice as InvoiceRow, Patient } from '../lib/api'

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

const statusConfig: Record<string, { bg: string; text: string; icon: typeof CheckCircle2; label: string }> = {
  paid: { bg: 'bg-success-50 border-success-200', text: 'text-success-700', icon: CheckCircle2, label: 'Paid' },
  partial: { bg: 'bg-warning-50 border-warning-200', text: 'text-warning-700', icon: Clock, label: 'Partial' },
  issued: { bg: 'bg-danger-50 border-danger-200', text: 'text-danger-600', icon: AlertCircle, label: 'Pending' },
  draft: { bg: 'bg-surface-50 border-surface-200', text: 'text-surface-500', icon: AlertCircle, label: 'Draft' },
  void: { bg: 'bg-surface-50 border-surface-200', text: 'text-surface-400', icon: XCircle, label: 'Void' },
  refunded: { bg: 'bg-info-50 border-info-200', text: 'text-info-700', icon: Clock, label: 'Refunded' },
}

const paymentMethods = [
  { mode: 'upi' as const, icon: Smartphone, label: 'UPI', color: 'bg-primary-500' },
  { mode: 'cash' as const, icon: Banknote, label: 'Cash', color: 'bg-success-500' },
  { mode: 'card' as const, icon: CreditCard, label: 'Card', color: 'bg-accent-500' },
  { mode: 'online' as const, icon: Wallet, label: 'Online', color: 'bg-info-500' },
]

interface LineDraft {
  itemType: 'consultation' | 'procedure' | 'pharmacy' | 'lab' | 'other'
  itemName: string
  quantity: string
  unitPriceRupees: string
}

export default function Billing() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const [payTarget, setPayTarget] = useState<InvoiceRow | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMode, setPayMode] = useState<typeof paymentMethods[number]['mode']>('cash')
  const [payReference, setPayReference] = useState('')

  const [showNewInvoice, setShowNewInvoice] = useState(false)
  const [newPatientId, setNewPatientId] = useState('')
  const [discountRupees, setDiscountRupees] = useState('')
  const [lines, setLines] = useState<LineDraft[]>([
    { itemType: 'consultation', itemName: '', quantity: '1', unitPriceRupees: '' },
  ])

  async function refresh() {
    try {
      const data = await listInvoices()
      setInvoices(data)
      setLoadError(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'UNKNOWN')
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      await refresh()
      try {
        const p = await listPatients()
        if (!cancelled) setPatients(p)
      } catch { /* optional */ }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return invoices
    return invoices.filter(inv =>
      inv.invoiceNo.toLowerCase().includes(q) || inv.patientName.toLowerCase().includes(q),
    )
  }, [invoices, query])

  const totalRevenue = invoices.reduce((s, i) => s + i.totalPaise, 0)
  const totalCollected = invoices.reduce((s, i) => s + i.paidPaise, 0)
  const totalOutstanding = invoices.reduce((s, i) => s + i.balancePaise, 0)

  async function submitPayment() {
    if (!payTarget) return
    const rupees = parseFloat(payAmount)
    if (!Number.isFinite(rupees) || rupees <= 0) {
      setActionError('VALIDATION_FAILED')
      return
    }
    setBusy(true); setActionError(null)
    try {
      await addPayment(payTarget.id, {
        amountPaise: Math.round(rupees * 100),
        mode: payMode,
        reference: payReference.trim() || undefined,
      })
      setPayTarget(null); setPayAmount(''); setPayReference('')
      await refresh()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'UNKNOWN')
    } finally {
      setBusy(false)
    }
  }

  async function submitNewInvoice() {
    if (!newPatientId) {
      setActionError('Select a patient first')
      return
    }
    const cleanLines = lines
      .filter(l => l.itemName.trim() && Number(l.unitPriceRupees) > 0)
      .map(l => ({
        itemType: l.itemType,
        itemName: l.itemName.trim(),
        quantity: Math.max(1, Math.floor(Number(l.quantity) || 1)),
        unitPricePaise: Math.round(Number(l.unitPriceRupees) * 100),
      }))
    if (cleanLines.length === 0) {
      setActionError('Add at least one line with a name and price')
      return
    }
    setBusy(true); setActionError(null)
    try {
      await createInvoice({
        patientId: newPatientId,
        lines: cleanLines,
        discountPaise: discountRupees ? Math.round(Number(discountRupees) * 100) : 0,
      })
      setShowNewInvoice(false)
      setNewPatientId(''); setDiscountRupees('')
      setLines([{ itemType: 'consultation', itemName: '', quantity: '1', unitPriceRupees: '' }])
      await refresh()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'UNKNOWN')
    } finally {
      setBusy(false)
    }
  }

  const modalBackdrop = 'fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4'
  const modalCard = 'bg-white rounded-2xl shadow-healthcare-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4'
  const inputCls =
    'w-full px-3 py-2 text-[13px] bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Payments"
        subtitle="Manage invoices, payments, and collections"
        actions={
          <>
            <Button variant="secondary" onClick={refresh} disabled={busy}>Reload</Button>
            <Button onClick={() => setShowNewInvoice(true)}>
              <Plus className="w-4 h-4" /> New Invoice
            </Button>
          </>
        }
      />

      {(actionError || loadError) && (
        <div className="rounded-xl px-4 py-3 text-[12px] font-medium bg-danger-50 border border-danger-200 text-danger-700">
          {actionError ?? `Failed to load invoices: ${loadError}`}
          <button className="ml-3 underline" onClick={() => { setActionError(null); setLoadError(null) }}>dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-success-500 to-success-600 rounded-2xl p-5 text-white shadow-healthcare-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-medium text-white/80">Total Billed</span>
            <ArrowUpRight className="w-5 h-5 text-white/60" />
          </div>
          <p className="text-3xl font-bold">{formatPaise(totalRevenue)}</p>
          <p className="text-[12px] text-white/70 mt-1">{invoices.length} invoices</p>
        </div>
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-5 text-white shadow-healthcare-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-medium text-white/80">Collected</span>
            <CheckCircle2 className="w-5 h-5 text-white/60" />
          </div>
          <p className="text-3xl font-bold">{formatPaise(totalCollected)}</p>
          <p className="text-[12px] text-white/70 mt-1">{invoices.filter(i => i.status === 'paid').length} fully paid</p>
        </div>
        <div className="bg-gradient-to-br from-danger-500 to-danger-600 rounded-2xl p-5 text-white shadow-healthcare-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-medium text-white/80">Outstanding</span>
            <AlertCircle className="w-5 h-5 text-white/60" />
          </div>
          <p className="text-3xl font-bold">{formatPaise(totalOutstanding)}</p>
          <p className="text-[12px] text-white/70 mt-1">{invoices.filter(i => i.balancePaise > 0).length} open invoices</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <h3 className="text-[15px] font-semibold text-surface-800">Recent Invoices</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search invoices..."
              className="pl-9 pr-4 py-2 text-[12px] bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all w-56"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Invoice</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Patient</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Total</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Paid</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Balance</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-[13px] text-surface-400">Loading invoices…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-[13px] text-surface-400">No invoices found</td></tr>
              ) : (
                filtered.map(inv => {
                  const sc = statusConfig[inv.status] ?? statusConfig.issued
                  const date = new Date(inv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  const avatar = inv.patientName.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
                  return (
                    <tr key={inv.id} className="border-b border-surface-50 last:border-0 hover:bg-surface-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <span className="text-[13px] font-semibold text-primary-600">{inv.invoiceNo}</span>
                        <p className="text-[11px] text-surface-400">{date}</p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-[10px] font-bold">{avatar}</div>
                          <span className="text-[13px] font-medium text-surface-700">{inv.patientName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right"><span className="text-[13px] font-bold text-surface-800">{formatPaise(inv.totalPaise)}</span></td>
                      <td className="px-5 py-3 text-right">
                        <span className={`text-[13px] font-medium ${inv.balancePaise <= 0 ? 'text-success-600' : inv.paidPaise > 0 ? 'text-warning-600' : 'text-danger-500'}`}>
                          {formatPaise(inv.paidPaise)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right"><span className="text-[13px] font-medium text-surface-700">{formatPaise(inv.balancePaise)}</span></td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${sc.bg} ${sc.text}`}>
                          <sc.icon className="w-3 h-3" /> {sc.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {inv.balancePaise > 0 && inv.status !== 'void' ? (
                          <button
                            onClick={() => { setPayTarget(inv); setPayAmount((inv.balancePaise / 100).toString()); setPayMode('cash'); setActionError(null) }}
                            className="px-3 py-1.5 rounded-lg bg-success-50 text-success-600 text-[12px] font-medium hover:bg-success-100 transition-colors"
                          >
                            Collect
                          </button>
                        ) : (
                          <span className="text-[12px] text-surface-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {payTarget && (
        <div className={modalBackdrop} onClick={() => !busy && setPayTarget(null)}>
          <div className={modalCard} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-surface-800">Collect Payment — {payTarget.invoiceNo}</h3>
              <button onClick={() => setPayTarget(null)} disabled={busy} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[12px] text-surface-500">
              {payTarget.patientName} · Balance due <strong>{formatPaise(payTarget.balancePaise)}</strong>
            </p>
            <label className="block">
              <span className="text-[12px] font-medium text-surface-600 block mb-1"><IndianRupee className="w-3 h-3 inline mr-1" />Amount</span>
              <input className={inputCls} value={payAmount} onChange={e => setPayAmount(e.target.value)} inputMode="decimal" />
            </label>
            <div>
              <span className="text-[12px] font-medium text-surface-600 block mb-2">Mode</span>
              <div className="grid grid-cols-4 gap-2">
                {paymentMethods.map(m => (
                  <button
                    key={m.mode}
                    onClick={() => setPayMode(m.mode)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                      payMode === m.mode ? 'border-primary-300 bg-primary-50' : 'border-surface-200 bg-surface-50 hover:bg-surface-100'
                    }`}
                  >
                    <m.icon className={`w-5 h-5 ${payMode === m.mode ? 'text-primary-600' : 'text-surface-500'}`} />
                    <span className="text-[11px] font-medium text-surface-700">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="text-[12px] font-medium text-surface-600 block mb-1">Reference (optional)</span>
              <input className={inputCls} value={payReference} onChange={e => setPayReference(e.target.value)} placeholder="UPI txn id, cheque no…" />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setPayTarget(null)} disabled={busy}>Cancel</Button>
              <Button onClick={submitPayment} disabled={busy}><CheckCircle2 className="w-4 h-4" /> Record Payment</Button>
            </div>
          </div>
        </div>
      )}

      {showNewInvoice && (
        <div className={modalBackdrop} onClick={() => !busy && setShowNewInvoice(false)}>
          <div className={`${modalCard} max-w-2xl`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-surface-800">New Invoice</h3>
              <button onClick={() => setShowNewInvoice(false)} disabled={busy} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[12px] font-medium text-surface-600 block mb-1">Patient</span>
                <select className={inputCls} value={newPatientId} onChange={e => setNewPatientId(e.target.value)}>
                  <option value="">Select patient…</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.mrn})</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[12px] font-medium text-surface-600 block mb-1">Discount (₹)</span>
                <input className={inputCls} value={discountRupees} onChange={e => setDiscountRupees(e.target.value)} inputMode="decimal" placeholder="0" />
              </label>
            </div>
            <div>
              <span className="text-[12px] font-medium text-surface-600 block mb-2">Line Items</span>
              <div className="space-y-2">
                {lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_72px_110px_auto] gap-2">
                    <select
                      className={inputCls}
                      value={line.itemType}
                      onChange={e => setLines(lines.map((l, i) => i === idx ? { ...l, itemType: e.target.value as LineDraft['itemType'] } : l))}
                    >
                      <option value="consultation">Consultation</option>
                      <option value="procedure">Procedure</option>
                      <option value="pharmacy">Pharmacy</option>
                      <option value="lab">Lab</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      className={inputCls}
                      placeholder="Item name"
                      value={line.itemName}
                      onChange={e => setLines(lines.map((l, i) => i === idx ? { ...l, itemName: e.target.value } : l))}
                    />
                    <input
                      className={inputCls}
                      placeholder="Qty"
                      value={line.quantity}
                      onChange={e => setLines(lines.map((l, i) => i === idx ? { ...l, quantity: e.target.value } : l))}
                      inputMode="numeric"
                    />
                    <input
                      className={inputCls}
                      placeholder="₹ Price"
                      value={line.unitPriceRupees}
                      onChange={e => setLines(lines.map((l, i) => i === idx ? { ...l, unitPriceRupees: e.target.value } : l))}
                      inputMode="decimal"
                    />
                    <button
                      onClick={() => setLines(lines.length > 1 ? lines.filter((_, i) => i !== idx) : lines)}
                      disabled={lines.length === 1}
                      className="p-2 rounded-lg hover:bg-danger-50 text-danger-400 disabled:opacity-30"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setLines([...lines, { itemType: 'other', itemName: '', quantity: '1', unitPriceRupees: '' }])}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 text-surface-600 text-[12px] font-medium hover:bg-surface-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Line
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowNewInvoice(false)} disabled={busy}>Cancel</Button>
              <Button onClick={submitNewInvoice} disabled={busy}><Plus className="w-4 h-4" /> Create Invoice</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
