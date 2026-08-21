// TODO: wire to backend inventory API when endpoints are available
import { useState } from 'react'
import {
  Boxes, Package, AlertTriangle, IndianRupee, Truck, Search, Plus,
  ArrowLeftRight, Download, Warehouse, Pill, FlaskConical, Bandage,
  Stethoscope, HeartPulse, MoreHorizontal,
} from 'lucide-react'
import { PageHeader, StatCard, Button } from '../components/ui'

type Category = 'Medicines' | 'Consumables' | 'Lab Reagents' | 'Dental Materials' | 'Clinic Supplies' | 'Equipment'

interface Item {
  name: string
  category: Category
  batch: string
  expiry: string
  stock: number
  unit: string
  reorder: number
  supplier: string
  price: number
}

const categoryIcons: Record<Category, typeof Pill> = {
  Medicines: Pill,
  Consumables: Bandage,
  'Lab Reagents': FlaskConical,
  'Dental Materials': Stethoscope,
  'Clinic Supplies': Boxes,
  Equipment: HeartPulse,
}

const items: Item[] = [
  { name: 'Nitrile Gloves (M)', category: 'Consumables', batch: 'GLV-2504', expiry: 'Apr 2027', stock: 2400, unit: 'pcs', reorder: 500, supplier: 'MedSupply India', price: 2.5 },
  { name: 'Metformin SR 500mg', category: 'Medicines', batch: 'MTF-2408', expiry: 'Mar 2027', stock: 420, unit: 'tabs', reorder: 100, supplier: 'Cipla Distributors', price: 1.2 },
  { name: 'Glimepiride 1mg', category: 'Medicines', batch: 'GLM-2311', expiry: 'Nov 2026', stock: 0, unit: 'tabs', reorder: 60, supplier: 'Cipla Distributors', price: 2.1 },
  { name: 'CBC Reagent Kit', category: 'Lab Reagents', batch: 'CBC-2510', expiry: 'Oct 2026', stock: 12, unit: 'kits', reorder: 10, supplier: 'LabTech Solutions', price: 1450 },
  { name: 'Syringes 5ml', category: 'Consumables', batch: 'SYR-2601', expiry: 'Jan 2028', stock: 850, unit: 'pcs', reorder: 200, supplier: 'MedSupply India', price: 3.8 },
  { name: 'Composite Resin A2', category: 'Dental Materials', batch: 'CMP-2509', expiry: 'Sep 2026', stock: 6, unit: 'syringes', reorder: 8, supplier: 'DentalMart', price: 2100 },
  { name: 'Alcohol Swabs', category: 'Clinic Supplies', batch: 'ALC-2603', expiry: 'Mar 2028', stock: 1800, unit: 'pcs', reorder: 400, supplier: 'MedSupply India', price: 0.9 },
  { name: 'Digital BP Monitor', category: 'Equipment', batch: 'BPM-2401', expiry: '—', stock: 4, unit: 'units', reorder: 2, supplier: 'Romsons Depot', price: 2450 },
  { name: 'Azithral 500mg', category: 'Medicines', batch: 'AZI-2409', expiry: 'Sep 2026', stock: 34, unit: 'tabs', reorder: 50, supplier: 'Alembic Pharma', price: 6.8 },
  { name: 'Lipid Profile Kit', category: 'Lab Reagents', batch: 'LIP-2511', expiry: 'Nov 2026', stock: 9, unit: 'kits', reorder: 8, supplier: 'LabTech Solutions', price: 980 },
  { name: 'Nebulizer Masks', category: 'Consumables', batch: 'NEB-2602', expiry: 'Feb 2028', stock: 45, unit: 'pcs', reorder: 50, supplier: 'Romsons Depot', price: 55 },
  { name: 'HbA1c Analyzer Cartridges', category: 'Lab Reagents', batch: 'A1C-2507', expiry: 'Jul 2026', stock: 5, unit: 'kits', reorder: 6, supplier: 'LabTech Solutions', price: 3200 },
]

const categories: Category[] = ['Medicines', 'Consumables', 'Lab Reagents', 'Dental Materials', 'Clinic Supplies', 'Equipment']

function itemStatus(i: Item) {
  if (i.stock === 0) return { label: 'Out of Stock', cls: 'bg-danger-50 text-danger-600 border-danger-100', bar: 'bg-danger-400' }
  const expSoon = ['Jul 2026', 'Aug 2026', 'Sep 2026'].some((m) => i.expiry.startsWith(m))
  if (expSoon) return { label: 'Expiring Soon', cls: 'bg-warning-50 text-warning-600 border-warning-100', bar: 'bg-warning-400' }
  if (i.stock < i.reorder) return { label: 'Low Stock', cls: 'bg-warning-50 text-warning-600 border-warning-100', bar: 'bg-warning-400' }
  return { label: 'Healthy', cls: 'bg-success-50 text-success-700 border-success-200', bar: 'bg-success-400' }
}

export default function Inventory() {
  const [activeCat, setActiveCat] = useState<Category | 'All'>('All')
  const [search, setSearch] = useState('')

  const filtered = items.filter(
    (i) =>
      (activeCat === 'All' || i.category === activeCat) &&
      i.name.toLowerCase().includes(search.toLowerCase())
  )

  const lowStock = items.filter((i) => i.stock > 0 && i.stock < i.reorder).length
  const outStock = items.filter((i) => i.stock === 0).length
  const expiring = items.filter((i) => itemStatus(i).label === 'Expiring Soon').length
  const stockValue = items.reduce((sum, i) => sum + i.stock * i.price, 0)

  const counts = Object.fromEntries(
    categories.map((c) => [c, items.filter((i) => i.category === c).length])
  ) as Record<Category, number>

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Warehouse}
        tint="indigo"
        badge="Add-on"
        title="Inventory"
        subtitle="Shared engine — Pharmacy · Lab · Clinic consumables"
        actions={
          <>
            <Button variant="secondary">
              <ArrowLeftRight className="w-4 h-4" /> Stock Transfer
            </Button>
            <Button>
              <Plus className="w-4 h-4" /> Add Item
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total SKUs', value: String(items.length), icon: Package, tone: 'slate' as const },
          { label: 'Stock Value', value: `₹${(stockValue / 100000).toFixed(2)}L`, icon: IndianRupee, tone: 'green' as const },
          { label: 'Low Stock', value: String(lowStock), icon: AlertTriangle, tone: 'amber' as const },
          { label: 'Out of Stock', value: String(outStock), icon: Boxes, tone: 'rose' as const },
          { label: 'Suppliers', value: '5', icon: Truck, tone: 'sky' as const },
        ].map((m) => (
          <StatCard key={m.label} {...m} />
        ))}
      </div>

      {(lowStock + outStock + expiring > 0) && (
        <div className="flex flex-col md:flex-row md:items-center gap-3 px-4 py-3 rounded-2xl bg-danger-50 border border-danger-100">
          <AlertTriangle className="w-4.5 h-4.5 text-danger-500 flex-shrink-0" />
          <p className="text-[13px] text-danger-700 flex-1">
            <strong>{outStock + lowStock} items need reordering</strong> — Glimepiride (out of stock), Nebulizer Masks, Azithral, Composite Resin. {expiring} batches expire within 60 days.
          </p>
          <button className="px-3 py-1.5 rounded-lg bg-white border border-danger-200 text-[12px] font-semibold text-danger-600 hover:bg-danger-100 transition-colors whitespace-nowrap flex items-center gap-1.5">
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
          {categories.map((c) => {
            const Icon = categoryIcons[c]
            return (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all border ${
                  activeCat === c ? 'bg-surface-800 text-white border-surface-800' : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {c} · {counts[c]}
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
                const pct = Math.min(100, Math.round((i.stock / (i.reorder * 3)) * 100))
                return (
                  <tr key={i.name} className="border-b border-surface-50 last:border-0 hover:bg-surface-50/50 transition-colors">
                    <td className="px-5 py-3 text-[13px] font-semibold text-surface-800 min-w-[160px]">{i.name}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-50 border border-surface-200 text-[11px] font-medium text-surface-600 whitespace-nowrap">
                        {(() => { const Icon = categoryIcons[i.category]; return <Icon className="w-3 h-3" /> })()}
                        {i.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="text-[12px] text-surface-500 font-mono">{i.batch}</p>
                      <p className="text-[11px] text-surface-400">{i.expiry}</p>
                    </td>
                    <td className="px-5 py-3 min-w-[130px]">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-surface-100 overflow-hidden">
                          <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${Math.max(pct, 4)}%` }} />
                        </div>
                        <span className="text-[12px] font-bold text-surface-700 whitespace-nowrap">{i.stock.toLocaleString()} <span className="font-normal text-surface-400">{i.unit}</span></span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[12px] text-surface-500">{i.reorder.toLocaleString()} {i.unit}</td>
                    <td className="px-5 py-3 text-[12px] text-surface-600">{i.supplier}</td>
                    <td className="px-5 py-3 text-[12px] text-surface-600">₹{i.price.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border whitespace-nowrap ${s.cls}`}>{s.label}</span>
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
        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <Package className="w-8 h-8 text-surface-300 mx-auto mb-2" />
            <p className="text-[13px] text-surface-400">No items match your filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
