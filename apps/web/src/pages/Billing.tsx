// TODO: wire to backend billing API when endpoints are available
import {
  CreditCard, Plus, Search,
  CheckCircle2, Clock, AlertCircle, Download, Printer, Send,
  Smartphone, Banknote, Wallet, ArrowUpRight,
} from 'lucide-react'
import { PageHeader, Button } from '../components/ui'

const invoices = [
  { id: 'INV-2026-041', patient: 'Ananya Sharma', avatar: 'AS', color: 'from-primary-400 to-primary-600', date: '20 Aug 2026', items: [{ name: 'Consultation', amount: 800 }, { name: 'BP Monitoring', amount: 100 }], total: 900, paid: 900, status: 'paid', method: 'UPI' },
  { id: 'INV-2026-042', patient: 'Rajesh Kumar', avatar: 'RK', color: 'from-accent-400 to-accent-600', date: '18 Aug 2026', items: [{ name: 'Consultation', amount: 800 }, { name: 'Blood Test', amount: 350 }, { name: 'HbA1c', amount: 400 }], total: 1550, paid: 500, status: 'partial', method: 'Cash' },
  { id: 'INV-2026-043', patient: 'Vikram Singh', avatar: 'VS', color: 'from-success-400 to-success-600', date: '15 Aug 2026', items: [{ name: 'Consultation', amount: 800 }, { name: 'X-Ray', amount: 600 }], total: 1400, paid: 0, status: 'pending', method: '-' },
  { id: 'INV-2026-044', patient: 'Meera Patel', avatar: 'MP', color: 'from-info-400 to-info-600', date: '20 Aug 2026', items: [{ name: 'Consultation', amount: 800 }, { name: 'Prescription', amount: 450 }], total: 1250, paid: 1250, status: 'paid', method: 'Card' },
  { id: 'INV-2026-045', patient: 'Suresh Reddy', avatar: 'SR', color: 'from-warning-400 to-warning-600', date: '10 Aug 2026', items: [{ name: 'Consultation', amount: 1000 }, { name: 'ECG', amount: 500 }, { name: 'Lab Package', amount: 1200 }], total: 2700, paid: 2700, status: 'paid', method: 'UPI' },
]

const statusConfig: Record<string, { bg: string; text: string; icon: typeof CheckCircle2; label: string }> = {
  paid: { bg: 'bg-success-50 border-success-200', text: 'text-success-700', icon: CheckCircle2, label: 'Paid' },
  partial: { bg: 'bg-warning-50 border-warning-200', text: 'text-warning-700', icon: Clock, label: 'Partial' },
  pending: { bg: 'bg-danger-50 border-danger-200', text: 'text-danger-600', icon: AlertCircle, label: 'Pending' },
}

const paymentMethods = [
  { icon: Smartphone, label: 'UPI', color: 'bg-primary-500' },
  { icon: Banknote, label: 'Cash', color: 'bg-success-500' },
  { icon: CreditCard, label: 'Card', color: 'bg-accent-500' },
  { icon: Wallet, label: 'Online', color: 'bg-info-500' },
]

export default function Billing() {
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0)
  const totalCollected = invoices.reduce((sum, inv) => sum + inv.paid, 0)
  const totalOutstanding = totalRevenue - totalCollected

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Payments"
        subtitle="Manage invoices, payments, and collections"
        actions={
          <>
            <Button variant="secondary">
              <Download className="w-4 h-4" /> Export
            </Button>
            <Button>
              <Plus className="w-4 h-4" /> New Invoice
            </Button>
          </>
        }
      />

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-success-500 to-success-600 rounded-2xl p-5 text-white shadow-healthcare-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-medium text-white/80">Total Revenue</span>
            <ArrowUpRight className="w-5 h-5 text-white/60" />
          </div>
          <p className="text-3xl font-bold">₹{totalRevenue.toLocaleString()}</p>
          <p className="text-[12px] text-white/70 mt-1">Today · 5 invoices</p>
        </div>
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-5 text-white shadow-healthcare-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-medium text-white/80">Collected</span>
            <CheckCircle2 className="w-5 h-5 text-white/60" />
          </div>
          <p className="text-3xl font-bold">₹{totalCollected.toLocaleString()}</p>
          <p className="text-[12px] text-white/70 mt-1">3 of 5 paid</p>
        </div>
        <div className="bg-gradient-to-br from-danger-500 to-danger-600 rounded-2xl p-5 text-white shadow-healthcare-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-medium text-white/80">Outstanding</span>
            <AlertCircle className="w-5 h-5 text-white/60" />
          </div>
          <p className="text-3xl font-bold">₹{totalOutstanding.toLocaleString()}</p>
          <p className="text-[12px] text-white/70 mt-1">1 pending + 1 partial</p>
        </div>
      </div>

      {/* Quick Payment */}
      <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
        <h3 className="text-[14px] font-semibold text-surface-800 mb-4">Quick Payment Collection</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {paymentMethods.map(m => (
            <button key={m.label} className="flex items-center gap-3 p-4 rounded-xl bg-surface-50 border border-surface-200 hover:bg-surface-100 transition-all group">
              <div className={`w-10 h-10 rounded-xl ${m.color} flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform`}>
                <m.icon className="w-5 h-5" />
              </div>
              <span className="text-[13px] font-medium text-surface-700">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <h3 className="text-[15px] font-semibold text-surface-800">Recent Invoices</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
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
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Items</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Total</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Paid</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Method</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const sc = statusConfig[inv.status]
                return (
                  <tr key={inv.id} className="border-b border-surface-50 last:border-0 hover:bg-surface-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <span className="text-[13px] font-semibold text-primary-600">{inv.id}</span>
                      <p className="text-[11px] text-surface-400">{inv.date}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${inv.color} flex items-center justify-center text-white text-[10px] font-bold`}>{inv.avatar}</div>
                        <span className="text-[13px] font-medium text-surface-700">{inv.patient}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-[12px] text-surface-600">
                        {inv.items.map(it => it.name).join(', ')}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-[13px] font-bold text-surface-800">₹{inv.total.toLocaleString()}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-[13px] font-medium ${inv.paid === inv.total ? 'text-success-600' : inv.paid > 0 ? 'text-warning-600' : 'text-danger-500'}`}>
                        ₹{inv.paid.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[12px] text-surface-600">{inv.method}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${sc.bg} ${sc.text}`}>
                        <sc.icon className="w-3 h-3" /> {sc.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400"><Printer className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400"><Send className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
