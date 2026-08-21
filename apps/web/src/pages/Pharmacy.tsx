// TODO: wire to backend pharmacy API when endpoints are available
import { useState } from 'react'
import {
  Pill, CheckCircle2, Clock, AlertTriangle, Search, Package,
  IndianRupee, TrendingUp, Printer, ShieldCheck, Boxes, ArrowRight,
  CircleDot, MoreHorizontal,
} from 'lucide-react'
import { PageHeader, StatCard, Button } from '../components/ui'

type RxStatus = 'New' | 'Verified' | 'Partial' | 'Dispensed'

interface MedLine {
  name: string
  strength: string
  form: string
  dosage: string
  qty: number
  available: boolean
}

interface RxItem {
  id: number
  token: number
  patient: string
  age: number
  gender: string
  avatar: string
  doctor: string
  since: string
  status: RxStatus
  meds: MedLine[]
}

const statusStyles: Record<RxStatus, string> = {
  New: 'bg-info-50 text-info-600 border-info-100',
  Verified: 'bg-primary-50 text-primary-700 border-primary-200',
  Partial: 'bg-warning-50 text-warning-600 border-warning-100',
  Dispensed: 'bg-success-50 text-success-700 border-success-200',
}

const rxQueue: RxItem[] = [
  {
    id: 1, token: 13, patient: 'Rajesh Kumar', age: 45, gender: 'M', avatar: 'RK',
    doctor: 'Dr. Priya', since: '5 min ago', status: 'New',
    meds: [
      { name: 'Metformin', strength: '500mg', form: 'Tablet', dosage: '1-0-1 · After food', qty: 30, available: true },
      { name: 'Amlodipine', strength: '5mg', form: 'Tablet', dosage: '1-0-0 · Morning', qty: 15, available: true },
      { name: 'Glimepiride', strength: '1mg', form: 'Tablet', dosage: '0-0-1 · Before dinner', qty: 15, available: false },
    ],
  },
  {
    id: 2, token: 9, patient: 'Ananya Sharma', age: 52, gender: 'F', avatar: 'AS',
    doctor: 'Dr. Anand', since: '12 min ago', status: 'Partial',
    meds: [
      { name: 'Telmisartan', strength: '40mg', form: 'Tablet', dosage: '1-0-0 · Morning', qty: 30, available: true },
      { name: 'Atorvastatin', strength: '10mg', form: 'Tablet', dosage: '0-0-1 · Night', qty: 10, available: true },
    ],
  },
  {
    id: 3, token: 11, patient: 'Meera Patel', age: 29, gender: 'F', avatar: 'MP',
    doctor: 'Dr. Priya', since: '18 min ago', status: 'Verified',
    meds: [
      { name: 'Azithromycin', strength: '500mg', form: 'Tablet', dosage: '1-0-0 × 3 days', qty: 3, available: true },
      { name: 'Paracetamol', strength: '650mg', form: 'Tablet', dosage: 'SOS · Max 3/day', qty: 10, available: true },
      { name: 'Cetirizine', strength: '10mg', form: 'Tablet', dosage: '0-0-1 · Night', qty: 6, available: true },
    ],
  },
  {
    id: 4, token: 7, patient: 'Vikram Singh', age: 38, gender: 'M', avatar: 'VS',
    doctor: 'Dr. Anand', since: '25 min ago', status: 'Dispensed',
    meds: [
      { name: 'Pantoprazole', strength: '40mg', form: 'Capsule', dosage: '1-0-0 · Empty stomach', qty: 15, available: true },
      { name: 'Drotaverine', strength: '40mg', form: 'Tablet', dosage: '1-1-1 × 2 days', qty: 6, available: true },
    ],
  },
]

interface Drug {
  brand: string
  generic: string
  form: string
  strength: string
  batch: string
  expiry: string
  stock: number
  reorder: number
  price: number
}

const drugMaster: Drug[] = [
  { brand: 'Metformin SR', generic: 'Metformin HCl', form: 'Tablet', strength: '500mg', batch: 'MTF-2408', expiry: 'Mar 2027', stock: 420, reorder: 100, price: 1.2 },
  { brand: 'Amlodipine', generic: 'Amlodipine Besylate', form: 'Tablet', strength: '5mg', batch: 'AML-2412', expiry: 'Jul 2027', stock: 85, reorder: 100, price: 0.8 },
  { brand: 'Glimepiride', generic: 'Glimepiride', form: 'Tablet', strength: '1mg', batch: 'GLM-2311', expiry: 'Nov 2026', stock: 0, reorder: 60, price: 2.1 },
  { brand: 'Telma-H', generic: 'Telmisartan + HCTZ', form: 'Tablet', strength: '40mg', batch: 'TEL-2502', expiry: 'Feb 2027', stock: 210, reorder: 80, price: 3.4 },
  { brand: 'Azithral', generic: 'Azithromycin', form: 'Tablet', strength: '500mg', batch: 'AZI-2409', expiry: 'Sep 2026', stock: 34, reorder: 50, price: 6.8 },
  { brand: 'Pan-D', generic: 'Pantoprazole + Domperidone', form: 'Capsule', strength: '40mg', batch: 'PAN-2501', expiry: 'Jan 2027', stock: 156, reorder: 60, price: 4.5 },
  { brand: 'Dolo', generic: 'Paracetamol', form: 'Tablet', strength: '650mg', batch: 'DOL-2510', expiry: 'Oct 2027', stock: 640, reorder: 150, price: 0.6 },
  { brand: 'Cetzine', generic: 'Cetirizine HCl', form: 'Tablet', strength: '10mg', batch: 'CTZ-2406', expiry: 'Aug 2026', stock: 22, reorder: 40, price: 0.5 },
]

const salesToday = [
  { time: '11:20 AM', patient: 'Rajesh Kumar', items: 2, amount: 86.4, mode: 'UPI', status: 'Paid' },
  { time: '11:05 AM', patient: 'Ananya Sharma', items: 2, amount: 124.0, mode: 'Cash', status: 'Paid' },
  { time: '10:48 AM', patient: 'Vikram Singh', items: 2, amount: 152.8, mode: 'UPI', status: 'Paid' },
  { time: '10:30 AM', patient: 'Suresh Reddy', items: 4, amount: 310.5, mode: 'Card', status: 'Paid' },
  { time: '10:12 AM', patient: 'Kavita Nair', items: 1, amount: 42.0, mode: 'Cash', status: 'Refunded' },
]

function drugStatus(d: Drug) {
  if (d.stock === 0) return { label: 'Out of Stock', cls: 'bg-danger-50 text-danger-600 border-danger-100' }
  if (d.expiry.startsWith('Aug 2026') || d.expiry.startsWith('Sep 2026') || d.expiry.startsWith('Nov 2026'))
    return { label: 'Expiring Soon', cls: 'bg-warning-50 text-warning-600 border-warning-100' }
  if (d.stock < d.reorder) return { label: 'Low Stock', cls: 'bg-warning-50 text-warning-600 border-warning-100' }
  return { label: 'In Stock', cls: 'bg-success-50 text-success-700 border-success-200' }
}

const tabs = ['Dispense Queue', 'Drug Master', "Today's Sales"] as const

export default function Pharmacy() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Dispense Queue')
  const [search, setSearch] = useState('')

  const filteredDrugs = drugMaster.filter(
    (d) =>
      d.brand.toLowerCase().includes(search.toLowerCase()) ||
      d.generic.toLowerCase().includes(search.toLowerCase())
  )

  const pendingCount = rxQueue.filter((r) => r.status !== 'Dispensed').length

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Pill}
        tint="sky"
        badge="Add-on"
        title="Pharmacy"
        subtitle="Prescription dispensing & drug inventory counter"
        actions={
          <>
            <Button variant="secondary">
              <Boxes className="w-4 h-4" /> Purchase Entry
            </Button>
            <Button>
              <Package className="w-4 h-4" /> New Sale
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Pending Rx', value: String(pendingCount), icon: Clock, tone: 'amber' as const },
          { label: 'Ready to Dispense', value: '2', icon: ShieldCheck, tone: 'teal' as const },
          { label: 'Dispensed Today', value: '24', icon: CheckCircle2, tone: 'green' as const },
          { label: 'Revenue Today', value: '₹18,430', icon: IndianRupee, tone: 'indigo' as const },
          { label: 'Low Stock', value: '6', icon: AlertTriangle, tone: 'rose' as const },
          { label: 'Expiring ≤90d', value: '4', icon: CircleDot, tone: 'slate' as const },
        ].map((m) => (
          <StatCard key={m.label} {...m} />
        ))}
      </div>

      {(pendingCount > 0) && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-warning-50 border border-warning-100">
          <AlertTriangle className="w-4.5 h-4.5 text-warning-600 flex-shrink-0" />
          <p className="text-[13px] text-warning-700 flex-1">
            <strong>Glimepiride 1mg is out of stock</strong> — prescribed in Token #13. Azithral & Cetzine expire within 60 days.
          </p>
          <button className="px-3 py-1.5 rounded-lg bg-white border border-warning-200 text-[12px] font-semibold text-warning-700 hover:bg-warning-100 transition-colors whitespace-nowrap">
            Create Purchase Order
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
              {t === 'Dispense Queue' && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-warning-100 text-warning-700 text-[10px] font-bold">{pendingCount}</span>
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
          {rxQueue.map((rx) => (
            <div key={rx.id} className="bg-white rounded-2xl border border-surface-100 shadow-healthcare overflow-hidden hover:shadow-healthcare-lg transition-shadow">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100 bg-surface-50/50">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-surface-800 text-white flex items-center justify-center text-[13px] font-bold">{rx.token}</span>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-info-400 to-info-600 flex items-center justify-center text-white text-[11px] font-bold">{rx.avatar}</div>
                  <div>
                    <p className="text-[13px] font-semibold text-surface-800 leading-tight">{rx.patient}</p>
                    <p className="text-[11px] text-surface-400">{rx.age}{rx.gender} · {rx.doctor} · {rx.since}</p>
                  </div>
                </div>
                <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${statusStyles[rx.status]}`}>{rx.status}</span>
              </div>
              <div className="px-5 py-3 space-y-2">
                {rx.meds.map((m) => (
                  <div key={m.name} className="flex items-center gap-3 py-1.5">
                    <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${m.available ? 'bg-success-400' : 'bg-danger-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-surface-800 truncate">
                        {m.name} <span className="text-surface-400 font-normal">{m.strength} · {m.form}</span>
                      </p>
                      <p className="text-[11px] text-surface-400">{m.dosage}</p>
                    </div>
                    <span className={`text-[12px] font-semibold ${m.available ? 'text-surface-600' : 'text-danger-500'}`}>
                      ×{m.qty}{!m.available && ' · NA'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 px-5 py-3 border-t border-surface-100">
                {rx.status === 'New' ? (
                  <>
                    <button className="flex-1 py-2 rounded-xl bg-primary-500 text-white text-[12px] font-semibold hover:bg-primary-600 transition-colors flex items-center justify-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" /> Verify Prescription
                    </button>
                    <button className="px-3 py-2 rounded-xl border border-surface-200 text-surface-500 hover:bg-surface-50 transition-colors" title="Print label">
                      <Printer className="w-4 h-4" />
                    </button>
                  </>
                ) : rx.status === 'Dispensed' ? (
                  <button className="flex-1 py-2 rounded-xl bg-surface-50 text-surface-500 text-[12px] font-semibold border border-surface-200 flex items-center justify-center gap-1.5 cursor-default">
                    <CheckCircle2 className="w-4 h-4 text-success-500" /> Dispensed & Billed
                  </button>
                ) : (
                  <>
                    <button className="flex-1 py-2 rounded-xl bg-success-500 text-white text-[12px] font-semibold hover:bg-success-600 transition-colors flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Dispense {rx.status === 'Partial' ? 'Remaining' : 'All'}
                    </button>
                    <button className="px-3 py-2 rounded-xl border border-surface-200 text-surface-600 hover:bg-surface-50 transition-colors text-[12px] font-semibold flex items-center gap-1">
                      Bill <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </>
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
                  {['Medicine', 'Form / Strength', 'Batch', 'Expiry', 'Stock', 'MRP', 'Status', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDrugs.map((d) => {
                  const s = drugStatus(d)
                  const pct = Math.min(100, Math.round((d.stock / (d.reorder * 4)) * 100))
                  return (
                    <tr key={d.brand + d.batch} className="border-b border-surface-50 last:border-0 hover:bg-surface-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-[13px] font-semibold text-surface-800">{d.brand}</p>
                        <p className="text-[11px] text-surface-400">{d.generic}</p>
                      </td>
                      <td className="px-5 py-3 text-[12px] text-surface-600 whitespace-nowrap">{d.form} · {d.strength}</td>
                      <td className="px-5 py-3 text-[12px] text-surface-500 font-mono">{d.batch}</td>
                      <td className="px-5 py-3 text-[12px] text-surface-600 whitespace-nowrap">{d.expiry}</td>
                      <td className="px-5 py-3 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-surface-100 overflow-hidden">
                            <div className={`h-full rounded-full ${d.stock === 0 ? 'bg-danger-400' : d.stock < d.reorder ? 'bg-warning-400' : 'bg-success-400'}`} style={{ width: `${Math.max(pct, 4)}%` }} />
                          </div>
                          <span className="text-[12px] font-semibold text-surface-700">{d.stock}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[12px] text-surface-600">₹{d.price.toFixed(2)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${s.cls}`}>{s.label}</span>
                      </td>
                      <td className="px-5 py-3">
                        <button className="p-1.5 rounded-lg text-surface-300 hover:text-surface-600 hover:bg-surface-100 transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
                  {['Time', 'Patient', 'Items', 'Amount', 'Mode', 'Status'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salesToday.map((s) => (
                  <tr key={s.time} className="border-b border-surface-50 last:border-0 hover:bg-surface-50/50 transition-colors">
                    <td className="px-5 py-3 text-[12px] text-surface-500 whitespace-nowrap">{s.time}</td>
                    <td className="px-5 py-3 text-[13px] font-medium text-surface-800">{s.patient}</td>
                    <td className="px-5 py-3 text-[12px] text-surface-600">{s.items}</td>
                    <td className="px-5 py-3 text-[13px] font-semibold text-surface-800">₹{s.amount.toFixed(2)}</td>
                    <td className="px-5 py-3"><span className="px-2 py-0.5 rounded-md bg-surface-100 text-surface-600 text-[11px] font-medium">{s.mode}</span></td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${s.status === 'Paid' ? 'bg-success-50 text-success-700 border-success-200' : 'bg-warning-50 text-warning-600 border-warning-100'}`}>{s.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-info-500 to-info-600 rounded-2xl p-5 text-white shadow-healthcare-lg">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5" />
                <h3 className="text-[14px] font-semibold">Pharmacy Summary</h3>
              </div>
              <p className="text-3xl font-bold">₹18,430</p>
              <p className="text-[12px] text-white/70 mt-1">Collected today · 24 bills</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <p className="text-[11px] text-white/70">Avg. bill value</p>
                  <p className="text-[15px] font-bold mt-0.5">₹768</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <p className="text-[11px] text-white/70">Rx conversion</p>
                  <p className="text-[15px] font-bold mt-0.5">92%</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
              <h3 className="text-[14px] font-semibold text-surface-800 mb-3">Top Sellers Today</h3>
              <div className="space-y-2.5">
                {[
                  { name: 'Metformin SR 500', sold: 42 },
                  { name: 'Dolo 650', sold: 38 },
                  { name: 'Telma-H 40', sold: 21 },
                  { name: 'Pan-D 40', sold: 17 },
                ].map((t) => (
                  <div key={t.name} className="flex items-center justify-between">
                    <span className="text-[12px] text-surface-600">{t.name}</span>
                    <span className="text-[12px] font-bold text-surface-800">{t.sold} units</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
