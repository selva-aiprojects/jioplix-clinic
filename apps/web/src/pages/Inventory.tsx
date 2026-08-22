import { useEffect, useState, type ReactNode } from 'react'
import {
  Boxes, Package, AlertTriangle, IndianRupee, Truck, Search, Plus,
  ArrowLeftRight, Download, Warehouse, Pill, FlaskConical, Bandage,
  Stethoscope, HeartPulse, X, CheckCircle2, Loader2, AlertCircle, FileSpreadsheet,
  Upload, Printer, BrainCircuit,
} from 'lucide-react'
import { PageHeader, StatCard, Button } from '../components/ui'
import {
  listInventoryItems, createInventoryItem, adjustStock,
  describeApiError, type InventoryItem,
} from '../lib/api'

const CATEGORIES = [
  { value: 'medicines', label: 'Medicines', icon: Pill },
  { value: 'consumables', label: 'Consumables', icon: Bandage },
  { value: 'lab_reagents', label: 'Lab Reagents', icon: FlaskConical },
  { value: 'dental_materials', label: 'Dental Materials', icon: Stethoscope },
  { value: 'clinic_supplies', label: 'Clinic Supplies', icon: Boxes },
  { value: 'equipment', label: 'Equipment', icon: HeartPulse },
] as const

type CategoryValue = (typeof CATEGORIES)[number]['value']

const MOVEMENT_REASONS = [
  { value: 'purchase', label: 'Purchase / Stock In' },
  { value: 'transfer', label: 'Branch Transfer' },
  { value: 'adjustment', label: 'Correction / Adjustment' },
] as const

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

interface ItemForm {
  name: string
  category: '' | CategoryValue
  unit: string
  quantity: string
  reorderLevel: string
  priceRupees: string
  supplier: string
  batchNo: string
  expiryDate: string
}

interface ImportRow {
  name: string
  quantity: number
  currentQuantity: number
  itemId: string
}

const emptyItemForm: ItemForm = {
  name: '', category: '', unit: 'units', quantity: '', reorderLevel: '',
  priceRupees: '', supplier: '', batchNo: '', expiryDate: '',
}

function validateItemForm(f: ItemForm): Record<string, string> {
  const errs: Record<string, string> = {}
  if (!f.name.trim()) errs.name = 'Item name is required'
  if (!f.category) errs.category = 'Pick a category'
  if (!f.unit.trim()) errs.unit = 'Unit is required'
  const qty = Number(f.quantity)
  if (f.quantity === '' || !Number.isInteger(qty) || qty < 0) errs.quantity = 'Enter a whole number ≥ 0'
  const reorder = Number(f.reorderLevel)
  if (f.reorderLevel === '' || !Number.isInteger(reorder) || reorder < 0) errs.reorderLevel = 'Enter a whole number ≥ 0'
  const price = Number(f.priceRupees)
  if (f.priceRupees === '' || Number.isNaN(price) || price < 0) errs.priceRupees = 'Enter a valid amount'
  if (f.expiryDate && Number.isNaN(new Date(f.expiryDate).getTime())) errs.expiryDate = 'Invalid date'
  return errs
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(`${dateStr}T00:00:00`).getTime() - Date.now()) / 86400000)
}

function itemStatus(i: InventoryItem) {
  if (i.quantity === 0) return { label: 'Out of Stock', cls: 'bg-danger-50 text-danger-600 border-danger-100', bar: 'bg-danger-400' }
  if (i.expiryDate && daysUntil(i.expiryDate) <= 90) {
    return { label: 'Expiring ≤90d', cls: 'bg-warning-50 text-warning-600 border-warning-100', bar: 'bg-warning-400' }
  }
  if (i.quantity < i.reorderLevel) return { label: 'Low Stock', cls: 'bg-warning-50 text-warning-600 border-warning-100', bar: 'bg-warning-400' }
  return { label: 'Healthy', cls: 'bg-success-50 text-success-700 border-success-200', bar: 'bg-success-400' }
}

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCat, setActiveCat] = useState<CategoryValue | 'All'>('All')
  const [search, setSearch] = useState('')

  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<ItemForm>(emptyItemForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const [moveTarget, setMoveTarget] = useState<InventoryItem | null>(null)
  const [moveDirection, setMoveDirection] = useState<'in' | 'out'>('in')
  const [moveReason, setMoveReason] = useState<(typeof MOVEMENT_REASONS)[number]['value']>('purchase')
  const [moveQty, setMoveQty] = useState('')
  const [moveNotes, setMoveNotes] = useState('')
  const [moveError, setMoveError] = useState<string | null>(null)
  const [moveFieldError, setMoveFieldError] = useState<string | null>(null)

  const [flash, setFlash] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)

  async function refresh() {
    try {
      const data = await listInventoryItems()
      setItems(data)
      setPageError(null)
    } catch (e) {
      setPageError(describeApiError(e))
    }
  }

  useEffect(() => {
    let cancelled = false
    listInventoryItems()
      .then((data) => { if (!cancelled) setItems(data) })
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
    if (!showAdd && !moveTarget) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAdd && !busy) setShowAdd(false)
        else if (moveTarget && !busy) setMoveTarget(null)
      }
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [showAdd, moveTarget, busy])

  const filtered = items.filter(
    (i) =>
      (activeCat === 'All' || i.category === activeCat) &&
      i.name.toLowerCase().includes(search.toLowerCase())
  )

  const lowStock = items.filter((i) => i.quantity > 0 && i.quantity < i.reorderLevel)
  const outStock = items.filter((i) => i.quantity === 0)
  const expiring = items.filter((i) => i.expiryDate && i.expiryDate !== null && daysUntil(i.expiryDate) <= 90 && daysUntil(i.expiryDate) > -Infinity)
  const stockValue = items.reduce((sum, i) => sum + i.quantity * i.unitPricePaise, 0)
  const suppliers = new Set(items.map((i) => i.supplier).filter(Boolean))

  const counts = Object.fromEntries(
    CATEGORIES.map((c) => [c.value, items.filter((i) => i.category === c.value).length])
  ) as Record<CategoryValue, number>

  function openAdd() {
    setForm(emptyItemForm)
    setFieldErrors({})
    setModalError(null)
    setShowAdd(true)
  }

  function updateField<K extends keyof ItemForm>(key: K, value: ItemForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setFieldErrors(prev => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  async function submitAdd() {
    const errs = validateItemForm(form)
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }
    setBusy(true)
    setModalError(null)
    try {
      const created = await createInventoryItem({
        name: form.name.trim(),
        category: form.category as CategoryValue,
        unit: form.unit.trim() || 'units',
        quantity: Number(form.quantity),
        reorderLevel: Number(form.reorderLevel),
        unitPricePaise: Math.round(Number(form.priceRupees) * 100),
        supplier: form.supplier.trim() || undefined,
        batchNo: form.batchNo.trim() || undefined,
        expiryDate: form.expiryDate || undefined,
      })
      setItems(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setShowAdd(false)
      setFlash(`Added ${created.name} · ${created.quantity} ${created.unit} on hand`)
    } catch (e) {
      setModalError(describeApiError(e))
    } finally {
      setBusy(false)
    }
  }

  function openMove(item: InventoryItem) {
    setMoveTarget(item)
    setMoveDirection(item.quantity === 0 ? 'in' : 'out')
    setMoveReason(item.quantity === 0 ? 'purchase' : 'adjustment')
    setMoveQty('')
    setMoveNotes('')
    setMoveError(null)
    setMoveFieldError(null)
  }

  async function submitMove() {
    if (!moveTarget) return
    const qty = Number(moveQty)
    if (!Number.isInteger(qty) || qty <= 0) {
      setMoveFieldError('Enter a whole number greater than 0')
      return
    }
    const delta = moveDirection === 'in' ? qty : -qty
    if (delta < 0 && Math.abs(delta) > moveTarget.quantity) {
      setMoveFieldError(`Only ${moveTarget.quantity} ${moveTarget.unit} on hand`)
      return
    }
    setBusy(true)
    setMoveError(null)
    try {
      const updated = await adjustStock(moveTarget.id, {
        delta,
        reason: moveReason,
        notes: moveNotes.trim() || undefined,
      })
      setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)))
      setMoveTarget(null)
      setFlash(`${updated.name}: ${delta > 0 ? '+' : ''}${delta.toLocaleString()} ${updated.unit} · ${MOVEMENT_REASONS.find(r => r.value === moveReason)?.label}`)
    } catch (e) {
      setMoveError(describeApiError(e))
    } finally {
      setBusy(false)
    }
  }

  function exportReorderList() {
    const rows = [...outStock, ...lowStock]
    const csv = [
      ['Item', 'Category', 'On Hand', 'Reorder At', 'Supplier'].join(','),
      ...rows.map((i) => [`"${i.name}"`, i.category, String(i.quantity), String(i.reorderLevel), `"${i.supplier ?? ''}"`].join(',')),
    ].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'reorder-list.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadStockCsv() {
    const rows = [['Item', 'Category', 'Unit', 'Quantity', 'Reorder Level', 'Unit Price', 'Supplier', 'Batch No', 'Expiry Date'], ...items.map(i => [i.name, i.category, i.unit, String(i.quantity), String(i.reorderLevel), String(i.unitPricePaise / 100), i.supplier ?? '', i.batchNo ?? '', i.expiryDate ?? ''])]
    const csv = rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a'); a.href = url; a.download = 'jioplix-stock-register.csv'; a.click(); URL.revokeObjectURL(url)
  }

  function importStockCsv(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const lines = String(reader.result ?? '').split(/\r?\n/).filter(Boolean)
      const parsed = lines.slice(1).map(line => line.split(',').map(value => value.trim().replace(/^"|"$/g, ''))).map(([name, quantity]) => ({ name, quantity: Number(quantity) })).filter(row => row.name && Number.isInteger(row.quantity) && row.quantity >= 0)
      const matched = parsed.map(row => { const item = items.find(i => i.name.toLowerCase() === row.name.toLowerCase()); return item ? { ...row, currentQuantity: item.quantity, itemId: item.id } : null }).filter((row): row is ImportRow => row !== null)
      setImportRows(matched); setImportError(matched.length ? null : 'No matching inventory items found. Export the stock register first to preserve item names.')
      setShowImport(true)
    }
    reader.readAsText(file)
  }

  async function applyImport() {
    setBusy(true); setImportError(null)
    try {
      for (const row of importRows) {
        if (row.quantity !== row.currentQuantity) await adjustStock(row.itemId, { delta: row.quantity - row.currentQuantity, reason: 'adjustment', notes: 'Imported stock reconciliation' })
      }
      await refresh(); setShowImport(false); setFlash('Stock reconciliation applied successfully')
    } catch (e) { setImportError(describeApiError(e)) } finally { setBusy(false) }
  }

  function printStockDocument(kind: 'invoice' | 'challan') {
    const printWindow = window.open('', '_blank', 'width=900,height=900')
    if (!printWindow) return
    const title = kind === 'invoice' ? 'Stock Invoice Copy' : 'Stock Delivery Challan'
    const rows = items.map(i => `<tr><td>${i.name}</td><td>${i.batchNo ?? '-'}</td><td>${i.quantity} ${i.unit}</td><td>${i.expiryDate ?? '-'}</td><td>₹${(i.quantity * i.unitPricePaise / 100).toLocaleString('en-IN')}</td></tr>`).join('')
    printWindow.document.write(`<html><head><title>${title}</title><style>body{font-family:Arial;color:#10234a;margin:40px}h1{font-size:24px;border-bottom:2px solid #1265e8;padding-bottom:14px}p{font-size:13px;color:#475569}table{border-collapse:collapse;width:100%;margin-top:24px;font-size:12px}th,td{padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:left}th{background:#f6f9fc;font-size:10px;text-transform:uppercase}footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:12px;font-size:11px;color:#64748b}</style></head><body><h1>Jioplix · ${title}</h1><p>Generated ${new Date().toLocaleString('en-IN')}</p><table><thead><tr><th>Item</th><th>Batch</th><th>Quantity</th><th>Expiry</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table><footer>For stock reconciliation and delivery records. Verify quantities and expiry dates before acceptance.</footer></body></html>`)
    printWindow.document.close(); printWindow.focus(); printWindow.print()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Warehouse}
        tint="indigo"
        badge="Add-on"
        title="Inventory"
        subtitle={loading ? 'Loading…' : `${items.length} SKUs tracked across every module`}
        actions={
          <>
            <Button variant="secondary" onClick={() => items[0] && openMove(items[0])}>
              <ArrowLeftRight className="w-4 h-4" /> Stock Movement
            </Button>
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4" /> Add Item
            </Button>
            <button onClick={downloadStockCsv} className="inline-flex items-center gap-2 rounded-xl border border-surface-200 bg-white px-3 py-2 text-[12px] font-semibold text-surface-600 hover:bg-surface-50" title="Download Excel-compatible stock register">
              <FileSpreadsheet className="h-4 w-4 text-success-600" /> Export Excel
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-surface-200 bg-white px-3 py-2 text-[12px] font-semibold text-surface-600 hover:bg-surface-50" title="Import stock count CSV for review">
              <Upload className="h-4 w-4 text-primary-600" /> Import Count
              <input type="file" accept=".csv,text/csv" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) importStockCsv(file); event.currentTarget.value = '' }} />
            </label>
            <button onClick={() => printStockDocument('invoice')} className="inline-flex items-center gap-2 rounded-xl border border-surface-200 bg-white px-3 py-2 text-[12px] font-semibold text-surface-600 hover:bg-surface-50" title="Print stock invoice copy"><Printer className="h-4 w-4 text-info-600" /> Invoice Copy</button>
            <button onClick={() => printStockDocument('challan')} className="inline-flex items-center gap-2 rounded-xl border border-surface-200 bg-white px-3 py-2 text-[12px] font-semibold text-surface-600 hover:bg-surface-50" title="Print delivery challan"><Printer className="h-4 w-4 text-accent-600" /> Delivery Challan</button>
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

      {expiring.length > 0 && (
        <section className="rounded-2xl border border-warning-200 bg-warning-50/60 p-4">
          <div className="flex items-start gap-3"><BrainCircuit className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning-600" /><div className="flex-1"><p className="text-[13px] font-bold text-warning-800">AI Stock Intelligence</p><p className="mt-1 text-[12px] leading-5 text-warning-700">Priority review: {expiring.filter(i => daysUntil(i.expiryDate!) < 0).length} expired and {expiring.filter(i => daysUntil(i.expiryDate!) >= 0).length} batches expire within 90 days. Use oldest batches first and reconcile supplier documents before receiving stock.</p><div className="mt-3 flex flex-wrap gap-2">{expiring.slice(0, 5).map(i => <span key={i.id} className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${daysUntil(i.expiryDate!) < 0 ? 'border-danger-200 bg-danger-50 text-danger-700' : 'border-warning-200 bg-warning-50 text-warning-700'}`}>{i.name} · {daysUntil(i.expiryDate!) < 0 ? 'Expired' : `${daysUntil(i.expiryDate!)}d left`}</span>)}</div></div></div>
        </section>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total SKUs', value: String(items.length), icon: Package, tone: 'slate' as const },
          { label: 'Stock Value', value: stockValue >= 100000 ? `₹${(stockValue / 100000).toFixed(2)}L` : `₹${(stockValue / 100).toLocaleString()}`, icon: IndianRupee, tone: 'green' as const },
          { label: 'Low Stock', value: String(lowStock.length), icon: AlertTriangle, tone: 'amber' as const },
          { label: 'Out of Stock', value: String(outStock.length), icon: Boxes, tone: 'rose' as const },
          { label: 'Suppliers', value: String(suppliers.size), icon: Truck, tone: 'sky' as const },
        ].map((m) => (
          <StatCard key={m.label} {...m} />
        ))}
      </div>

      {(lowStock.length + outStock.length > 0) && (
        <div className="flex flex-col md:flex-row md:items-center gap-3 px-4 py-3 rounded-2xl bg-danger-50 border border-danger-100">
          <AlertTriangle className="w-4.5 h-4.5 text-danger-500 flex-shrink-0" />
          <p className="text-[13px] text-danger-700 flex-1">
            <strong>{outStock.length + lowStock.length} items need reordering</strong>
            {' — '}
            {[...outStock, ...lowStock].slice(0, 3).map((i) => i.name).join(', ')}
            {expiring.length > 0 && `. ${expiring.length} batches expire within 90 days`}.
          </p>
          <button
            onClick={exportReorderList}
            className="px-3 py-1.5 rounded-lg bg-white border border-danger-200 text-[12px] font-semibold text-danger-600 hover:bg-danger-100 transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export Reorder List
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setActiveCat('All')}
            className={`px-3.5 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all border ${
              activeCat === 'All' ? 'bg-surface-800 text-white border-surface-800' : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50'
            }`}
          >
            All · {items.length}
          </button>
          {CATEGORIES.map((c) => {
            const Icon = c.icon
            return (
              <button
                key={c.value}
                onClick={() => setActiveCat(c.value)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all border ${
                  activeCat === c.value ? 'bg-surface-800 text-white border-surface-800' : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {c.label} · {counts[c.value]}
              </button>
            )
          })}
        </div>
        <div className="relative w-full max-w-xs lg:ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-10 pr-4 py-2 text-[13px] bg-white border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-400 transition-all placeholder:text-surface-400"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50/50">
                {['Item', 'Category', 'Batch / Expiry', 'Available Stock', 'Reorder At', 'Supplier', 'Unit Price', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const s = itemStatus(i)
                const pct = Math.min(100, Math.round((i.quantity / Math.max(i.reorderLevel * 3, 1)) * 100))
                const catLabel = CATEGORIES.find((c) => c.value === i.category)?.label ?? i.category
                return (
                  <tr key={i.id} className="border-b border-surface-50 last:border-0 hover:bg-surface-50/50 transition-colors">
                    <td className="px-5 py-3 text-[13px] font-semibold text-surface-800 min-w-[160px]">{i.name}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-50 border border-surface-200 text-[11px] font-medium text-surface-600 whitespace-nowrap">
                        {(() => { const Icon = CATEGORIES.find((c) => c.value === i.category)?.icon ?? Boxes; return <Icon className="w-3 h-3" /> })()}
                        {catLabel}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="text-[12px] text-surface-500 font-mono">{i.batchNo ?? '—'}</p>
                      <p className="text-[11px] text-surface-400">
                        {i.expiryDate ? new Date(`${i.expiryDate}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
                      </p>
                      {i.expiryDate && <span className={`mt-1 inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${daysUntil(i.expiryDate) < 0 ? 'border-danger-200 bg-danger-50 text-danger-700' : daysUntil(i.expiryDate) <= 90 ? 'border-warning-200 bg-warning-50 text-warning-700' : 'border-success-200 bg-success-50 text-success-700'}`}>{daysUntil(i.expiryDate) < 0 ? 'Expired' : daysUntil(i.expiryDate) <= 90 ? `${daysUntil(i.expiryDate)}d left` : 'Valid'}</span>}
                    </td>
                    <td className="px-5 py-3 min-w-[130px]">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-surface-100 overflow-hidden">
                          <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${Math.max(pct, 4)}%` }} />
                        </div>
                        <span className="text-[12px] font-bold text-surface-700 whitespace-nowrap">{i.quantity.toLocaleString()} <span className="font-normal text-surface-400">{i.unit}</span></span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[12px] text-surface-500">{i.reorderLevel.toLocaleString()} {i.unit}</td>
                    <td className="px-5 py-3 text-[12px] text-surface-600">{i.supplier ?? '—'}</td>
                    <td className="px-5 py-3 text-[12px] text-surface-600">₹{(i.unitPricePaise / 100).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border whitespace-nowrap ${s.cls}`}>{s.label}</span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => openMove(i)}
                        title="Record stock movement"
                        className="p-1.5 rounded-lg text-surface-300 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {loading ? (
          <div className="py-12 text-center text-[13px] text-surface-400">Loading inventory…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Package className="w-8 h-8 text-surface-300 mx-auto mb-2" />
            <p className="text-[13px] text-surface-400">No items match your filters</p>
            <button onClick={openAdd} className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-primary-600 hover:text-primary-700">
              <Plus className="w-3.5 h-3.5" /> Add your first item
            </button>
          </div>
        ) : null}
      </div>

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]" onClick={() => !busy && setShowImport(false)}>
          <div role="dialog" aria-modal="true" aria-label="Review stock reconciliation" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-healthcare-lg" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-surface-100 px-6 py-5"><div><h3 className="text-[15px] font-semibold text-surface-800">Review Stock Reconciliation</h3><p className="mt-1 text-[12px] text-surface-400">Only matched SKUs will be updated. Nothing changes until you apply this review.</p></div><button onClick={() => setShowImport(false)} className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100" aria-label="Close import review"><X className="h-4 w-4" /></button></div>
            <div className="p-6">{importError && <p className="mb-3 rounded-xl border border-danger-200 bg-danger-50 px-3 py-2 text-[12px] font-medium text-danger-700">{importError}</p>}<div className="overflow-x-auto rounded-xl border border-surface-200"><table className="w-full text-left text-[12px]"><thead className="bg-surface-50 text-[10px] uppercase tracking-wider text-surface-400"><tr><th className="px-3 py-2">Item</th><th className="px-3 py-2">Current</th><th className="px-3 py-2">Imported</th><th className="px-3 py-2">Difference</th></tr></thead><tbody className="divide-y divide-surface-100">{importRows.map(row => <tr key={row.itemId}><td className="px-3 py-2.5 font-semibold text-surface-700">{row.name}</td><td className="px-3 py-2.5 text-surface-500">{row.currentQuantity}</td><td className="px-3 py-2.5 text-surface-700">{row.quantity}</td><td className={`px-3 py-2.5 font-semibold ${row.quantity === row.currentQuantity ? 'text-surface-400' : row.quantity > row.currentQuantity ? 'text-success-600' : 'text-danger-600'}`}>{row.quantity - row.currentQuantity > 0 ? '+' : ''}{row.quantity - row.currentQuantity}</td></tr>)}</tbody></table></div></div>
            <div className="flex justify-end gap-2 border-t border-surface-100 px-6 py-4"><Button variant="secondary" onClick={() => setShowImport(false)} disabled={busy}>Cancel</Button><Button onClick={() => void applyImport()} disabled={busy || importRows.length === 0}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{busy ? 'Applying…' : 'Apply Reconciliation'}</Button></div>
          </div>
        </div>
      )}

      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          onClick={() => !busy && setShowAdd(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add inventory item"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-healthcare-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-surface-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-healthcare">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-surface-800">Add Inventory Item</h3>
                  <p className="text-[12px] text-surface-400">Shared across Pharmacy · Lab · Clinic supplies</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdd(false)}
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

              <Field label="Item Name" required error={fieldErrors.name}>
                <input
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. Nitrile Gloves (M)"
                  autoFocus
                  className={inputCls(Boolean(fieldErrors.name))}
                />
              </Field>

              <Field label="Category" required error={fieldErrors.category}>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon
                    const active = form.category === c.value
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => updateField('category', c.value)}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[12px] font-medium transition-all ${
                          active
                            ? 'border-primary-400 bg-primary-50 text-primary-700 ring-2 ring-primary-500/20'
                            : 'border-surface-200 bg-surface-50 text-surface-600 hover:border-surface-300'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" /> {c.label}
                      </button>
                    )
                  })}
                </div>
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Opening Qty" required error={fieldErrors.quantity}>
                  <input
                    value={form.quantity}
                    onChange={(e) => updateField('quantity', e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="0"
                    inputMode="numeric"
                    className={inputCls(Boolean(fieldErrors.quantity))}
                  />
                </Field>
                <Field label="Reorder At" required error={fieldErrors.reorderLevel}>
                  <input
                    value={form.reorderLevel}
                    onChange={(e) => updateField('reorderLevel', e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="0"
                    inputMode="numeric"
                    className={inputCls(Boolean(fieldErrors.reorderLevel))}
                  />
                </Field>
                <Field label="Unit Price (₹)" required error={fieldErrors.priceRupees}>
                  <input
                    value={form.priceRupees}
                    onChange={(e) => updateField('priceRupees', e.target.value.replace(/[^\d.]/g, ''))}
                    placeholder="0.00"
                    inputMode="decimal"
                    className={inputCls(Boolean(fieldErrors.priceRupees))}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Counting Unit" required error={fieldErrors.unit}>
                  <input
                    value={form.unit}
                    onChange={(e) => updateField('unit', e.target.value)}
                    placeholder="units / tabs / pcs"
                    className={inputCls(Boolean(fieldErrors.unit))}
                  />
                </Field>
                <Field label="Expiry Date" error={fieldErrors.expiryDate}>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => updateField('expiryDate', e.target.value)}
                    className={inputCls(Boolean(fieldErrors.expiryDate))}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Batch No.">
                  <input
                    value={form.batchNo}
                    onChange={(e) => updateField('batchNo', e.target.value)}
                    placeholder="MTF-2408"
                    className={inputCls()}
                  />
                </Field>
                <Field label="Supplier">
                  <input
                    value={form.supplier}
                    onChange={(e) => updateField('supplier', e.target.value)}
                    placeholder="Cipla Distributors"
                    className={inputCls()}
                  />
                </Field>
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-surface-100 bg-white px-6 py-4">
              <button
                onClick={() => setShowAdd(false)}
                disabled={busy}
                className="rounded-xl border border-surface-200 px-4 py-2.5 text-[13px] font-medium text-surface-600 transition-colors hover:bg-surface-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <Button onClick={submitAdd} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {busy ? 'Adding…' : 'Add Item'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {moveTarget && (() => {
        const projected = moveTarget.quantity + (moveDirection === 'in' ? 1 : -1) * (Number(moveQty) || 0)
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
            onClick={() => !busy && setMoveTarget(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Record stock movement"
              className="w-full max-w-md rounded-2xl bg-white shadow-healthcare-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-surface-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 shadow-healthcare">
                    <ArrowLeftRight className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-surface-800">Stock Movement</h3>
                    <p className="text-[12px] text-surface-400">{moveTarget.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setMoveTarget(null)}
                  disabled={busy}
                  className="rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 px-6 py-5">
                {moveError && (
                  <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-2.5 text-[12px] font-medium text-danger-700">
                    {moveError}
                  </div>
                )}
                <p className="text-[12px] text-surface-500">
                  On hand: <strong className="text-surface-800">{moveTarget.quantity.toLocaleString()} {moveTarget.unit}</strong>
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setMoveDirection('in'); setMoveFieldError(null) }}
                    className={`rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition-all ${
                      moveDirection === 'in'
                        ? 'border-success-300 bg-success-50 text-success-700 ring-2 ring-success-500/20'
                        : 'border-surface-200 bg-surface-50 text-surface-500 hover:border-surface-300'
                    }`}
                  >
                    ↓ Stock In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMoveDirection('out'); setMoveFieldError(null) }}
                    className={`rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition-all ${
                      moveDirection === 'out'
                        ? 'border-danger-300 bg-danger-50 text-danger-700 ring-2 ring-danger-500/20'
                        : 'border-surface-200 bg-surface-50 text-surface-500 hover:border-surface-300'
                    }`}
                  >
                    ↑ Stock Out
                  </button>
                </div>

                <Field label="Quantity" required error={moveFieldError ?? undefined}>
                  <input
                    value={moveQty}
                    onChange={(e) => { setMoveQty(e.target.value.replace(/[^\d]/g, '')); setMoveFieldError(null) }}
                    placeholder="0"
                    inputMode="numeric"
                    autoFocus
                    className={inputCls(Boolean(moveFieldError))}
                  />
                </Field>

                {moveQty !== '' && Number(moveQty) > 0 && (
                  <p className={`text-[12px] font-medium ${projected < 0 ? 'text-danger-600' : 'text-surface-500'}`}>
                    Projected on hand: {projected.toLocaleString()} {moveTarget.unit}
                  </p>
                )}

                <Field label="Reason" required>
                  <select
                    value={moveReason}
                    onChange={(e) => setMoveReason(e.target.value as typeof moveReason)}
                    className={inputCls()}
                  >
                    {MOVEMENT_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Notes">
                  <textarea
                    value={moveNotes}
                    onChange={(e) => setMoveNotes(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Invoice ref, branch, remarks…"
                    className={`${inputCls()} resize-none`}
                  />
                </Field>
              </div>

              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-surface-100 bg-white px-6 py-4">
                <button
                  onClick={() => setMoveTarget(null)}
                  disabled={busy}
                  className="rounded-xl border border-surface-200 px-4 py-2.5 text-[13px] font-medium text-surface-600 transition-colors hover:bg-surface-50 disabled:opacity-40"
                >
                  Cancel
                </button>
                <Button onClick={submitMove} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {busy ? 'Saving…' : 'Record Movement'}
                </Button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
