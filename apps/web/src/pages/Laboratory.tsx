// TODO: wire to backend laboratory API when endpoints are available
import { useState } from 'react'
import {
  Beaker, FlaskConical, Clock, CheckCircle2, AlertTriangle, Search,
  Upload, FileText, Microscope, IndianRupee, ArrowRight, Droplets,
  ShieldCheck, MoreHorizontal,
} from 'lucide-react'
import { PageHeader, StatCard, Button } from '../components/ui'

type OrderStatus = 'Ordered' | 'Collected' | 'Processing' | 'Completed' | 'Reviewed'
type Priority = 'Routine' | 'Urgent' | 'STAT'

const pipelineSteps: OrderStatus[] = ['Ordered', 'Collected', 'Processing', 'Completed', 'Reviewed']

interface Investigation {
  name: string
  result?: string
  unit: string
  range: string
  flag?: 'H' | 'L'
}

interface LabOrder {
  id: string
  patient: string
  age: number
  gender: string
  avatar: string
  doctor: string
  model: 'In-House' | 'External'
  priority: Priority
  sample: string
  time: string
  status: OrderStatus
  investigations: Investigation[]
}

const orders: LabOrder[] = [
  {
    id: 'LAB-2418', patient: 'Ananya Sharma', age: 52, gender: 'F', avatar: 'AS',
    doctor: 'Dr. Anand', model: 'In-House', priority: 'Routine', sample: 'Blood',
    time: '10:40 AM', status: 'Processing',
    investigations: [
      { name: 'Total Cholesterol', unit: 'mg/dL', range: '< 200' },
      { name: 'LDL', unit: 'mg/dL', range: '< 100' },
      { name: 'HDL', unit: 'mg/dL', range: '40 – 60' },
      { name: 'Triglycerides', unit: 'mg/dL', range: '< 150' },
    ],
  },
  {
    id: 'LAB-2417', patient: 'Rajesh Kumar', age: 45, gender: 'M', avatar: 'RK',
    doctor: 'Dr. Priya', model: 'In-House', priority: 'Urgent', sample: 'Blood',
    time: '10:15 AM', status: 'Completed',
    investigations: [
      { name: 'HbA1c', result: '7.2', unit: '%', range: '4.0 – 5.6', flag: 'H' },
      { name: 'Fasting Glucose', result: '128', unit: 'mg/dL', range: '70 – 100', flag: 'H' },
      { name: 'Creatinine', result: '1.0', unit: 'mg/dL', range: '0.7 – 1.3' },
    ],
  },
  {
    id: 'LAB-2416', patient: 'Meera Patel', age: 29, gender: 'F', avatar: 'MP',
    doctor: 'Dr. Priya', model: 'External', priority: 'Routine', sample: 'Urine',
    time: '09:50 AM', status: 'Ordered',
    investigations: [
      { name: 'Urine Routine', unit: '-', range: '-' },
      { name: 'Urine Culture', unit: '-', range: 'No growth' },
    ],
  },
  {
    id: 'LAB-2415', patient: 'Suresh Reddy', age: 61, gender: 'M', avatar: 'SR',
    doctor: 'Dr. Anand', model: 'In-House', priority: 'STAT', sample: 'Blood',
    time: '09:30 AM', status: 'Reviewed',
    investigations: [
      { name: 'Troponin-I', result: '0.01', unit: 'ng/mL', range: '< 0.04' },
      { name: 'CK-MB', result: '12', unit: 'U/L', range: '5 – 25' },
      { name: 'ECG', result: 'Normal sinus rhythm', unit: '-', range: '-' },
    ],
  },
  {
    id: 'LAB-2414', patient: 'Kavita Nair', age: 34, gender: 'F', avatar: 'KN',
    doctor: 'Dr. Priya', model: 'In-House', priority: 'Routine', sample: 'Blood',
    time: '09:10 AM', status: 'Collected',
    investigations: [
      { name: 'CBC · Hemoglobin', unit: 'g/dL', range: '12 – 15' },
      { name: 'CBC · WBC', unit: '/µL', range: '4000 – 11000' },
      { name: 'Platelets', unit: '/µL', range: '150k – 450k' },
    ],
  },
]

const priorityStyles: Record<Priority, string> = {
  Routine: 'bg-surface-100 text-surface-600 border-surface-200',
  Urgent: 'bg-warning-50 text-warning-600 border-warning-100',
  STAT: 'bg-danger-50 text-danger-600 border-danger-100',
}

function Pipeline({ status }: { status: OrderStatus }) {
  const idx = pipelineSteps.indexOf(status)
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
            <span className={`text-[9px] font-medium whitespace-nowrap ${i <= idx ? 'text-surface-700' : 'text-surface-300'}`}>{step}</span>
          </div>
          {i < pipelineSteps.length - 1 && (
            <div className={`w-4 h-0.5 mx-0.5 mb-3.5 ${i < idx ? 'bg-success-400' : 'bg-surface-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

const tabs = ['Lab Orders', 'Result Entry'] as const

export default function Laboratory() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Lab Orders')
  const [activeOrder, setActiveOrder] = useState<LabOrder>(orders[1])
  const [results, setResults] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      orders[1].investigations.filter((i) => i.result).map((i) => [i.name, i.result!])
    )
  )

  const pending = orders.filter((o) => o.status !== 'Reviewed').length

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FlaskConical}
        tint="rose"
        badge="Add-on"
        title="Laboratory"
        subtitle="In-house & external lab orders, samples and results"
        actions={
          <>
            <Button variant="secondary">
              <Upload className="w-4 h-4" /> Upload External Report
            </Button>
            <Button>
              <Beaker className="w-4 h-4" /> New Lab Order
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Orders Today', value: '12', icon: FileText, tone: 'indigo' as const },
          { label: 'Samples Pending', value: '3', icon: Droplets, tone: 'sky' as const },
          { label: 'Processing', value: '2', icon: Microscope, tone: 'amber' as const },
          { label: 'Awaiting Review', value: '2', icon: AlertTriangle, tone: 'rose' as const },
          { label: 'Completed Today', value: '9', icon: CheckCircle2, tone: 'green' as const },
          { label: 'Lab Revenue', value: '₹9,850', icon: IndianRupee, tone: 'teal' as const },
        ].map((m) => (
          <StatCard key={m.label} {...m} />
        ))}
      </div>

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
              {t === 'Lab Orders' && pending > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-danger-100 text-danger-600 text-[10px] font-bold">{pending}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            placeholder="Search patient or order ID..."
            className="w-full pl-10 pr-4 py-2 text-[13px] bg-white border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-danger-500/20 focus:border-danger-400 transition-all placeholder:text-surface-400"
          />
        </div>
      </div>

      {tab === 'Lab Orders' && (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5 hover:shadow-healthcare-lg transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-center gap-3 min-w-[220px]">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-danger-400 to-danger-600 flex items-center justify-center text-white text-[11px] font-bold">{o.avatar}</div>
                  <div>
                    <p className="text-[13px] font-semibold text-surface-800 leading-tight">{o.patient}</p>
                    <p className="text-[11px] text-surface-400">{o.id} · {o.age}{o.gender} · {o.time}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 flex-1 max-w-md">
                  {o.investigations.map((inv) => (
                    <span key={inv.name} className="px-2 py-1 rounded-lg bg-surface-50 border border-surface-200 text-[11px] font-medium text-surface-600 whitespace-nowrap">
                      {inv.name}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${priorityStyles[o.priority]}`}>{o.priority}</span>
                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${o.model === 'In-House' ? 'bg-info-50 text-info-600 border-info-100' : 'bg-accent-50 text-accent-600 border-accent-100'}`}>
                    {o.model}
                  </span>
                </div>

                <Pipeline status={o.status} />

                <div className="flex items-center gap-2 ml-auto">
                  {o.status === 'Ordered' && (
                    <button className="px-3 py-2 rounded-xl bg-info-500 text-white text-[12px] font-semibold hover:bg-info-600 transition-colors whitespace-nowrap">
                      Collect Sample
                    </button>
                  )}
                  {(o.status === 'Completed' || o.status === 'Processing') && (
                    <button
                      onClick={() => {
                        setActiveOrder(o)
                        setResults(Object.fromEntries(o.investigations.filter((i) => i.result).map((i) => [i.name, i.result!])))
                        setTab('Result Entry')
                      }}
                      className="px-3 py-2 rounded-xl bg-primary-500 text-white text-[12px] font-semibold hover:bg-primary-600 transition-colors whitespace-nowrap"
                    >
                      Enter Results
                    </button>
                  )}
                  {o.status === 'Collected' && (
                    <button className="px-3 py-2 rounded-xl bg-warning-500 text-white text-[12px] font-semibold hover:bg-warning-600 transition-colors whitespace-nowrap">
                      Start Processing
                    </button>
                  )}
                  {o.status === 'Reviewed' && (
                    <>
                      <button className="px-3 py-2 rounded-xl bg-success-50 text-success-700 border border-success-200 text-[12px] font-semibold flex items-center gap-1.5 cursor-default">
                        <ShieldCheck className="w-4 h-4" /> Reviewed
                      </button>
                      <button className="p-2 rounded-xl border border-surface-200 text-surface-500 hover:bg-surface-50 transition-colors" title="Download report">
                        <FileText className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button className="p-2 rounded-lg text-surface-300 hover:text-surface-600 hover:bg-surface-100 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Result Entry' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-100 shadow-healthcare overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <div>
                <h2 className="text-[15px] font-semibold text-surface-800">Result Entry — {activeOrder.id}</h2>
                <p className="text-[12px] text-surface-400 mt-0.5">{activeOrder.patient} · {activeOrder.sample} · Ordered by {activeOrder.doctor}</p>
              </div>
              <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${priorityStyles[activeOrder.priority]}`}>{activeOrder.priority}</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50/50">
                  {['Investigation', 'Result', 'Unit', 'Reference Range', 'Flag'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeOrder.investigations.map((inv) => {
                  const val = results[inv.name]
                  const isAbnormal = inv.flag && val !== undefined
                  return (
                    <tr key={inv.name} className={`border-b border-surface-50 last:border-0 ${isAbnormal ? 'bg-danger-50/40' : ''}`}>
                      <td className="px-5 py-3 text-[13px] font-medium text-surface-800">{inv.name}</td>
                      <td className="px-5 py-3">
                        <input
                          value={val ?? ''}
                          onChange={(e) => setResults({ ...results, [inv.name]: e.target.value })}
                          placeholder="Enter value"
                          className={`w-28 px-3 py-1.5 text-[13px] font-semibold border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                            isAbnormal
                              ? 'border-danger-300 text-danger-600 bg-danger-50 focus:ring-danger-500/20'
                              : 'border-surface-200 text-surface-800 bg-surface-50 focus:ring-primary-500/30 focus:border-primary-400 focus:bg-white'
                          }`}
                        />
                      </td>
                      <td className="px-5 py-3 text-[12px] text-surface-500">{inv.unit}</td>
                      <td className="px-5 py-3 text-[12px] text-surface-500 font-mono">{inv.range}</td>
                      <td className="px-5 py-3">
                        {isAbnormal ? (
                          <span className={`inline-flex w-6 h-6 items-center justify-center rounded-md text-[11px] font-bold text-white ${inv.flag === 'H' ? 'bg-danger-500' : 'bg-info-500'}`}>
                            {inv.flag}
                          </span>
                        ) : (
                          <span className="text-[12px] text-surface-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="flex items-center gap-2 px-5 py-4 border-t border-surface-100">
              <button className="px-4 py-2 rounded-xl border border-surface-200 text-[13px] font-medium text-surface-600 hover:bg-surface-50 transition-colors">
                Save Draft
              </button>
              <button className="px-4 py-2 rounded-xl bg-primary-500 text-white text-[13px] font-semibold hover:bg-primary-600 shadow-healthcare transition-all flex items-center gap-2">
                Submit for Doctor Review <ArrowRight className="w-4 h-4" />
              </button>
              <span className="ml-auto text-[11px] text-surface-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Auto-notifies patient via WhatsApp after review
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gradient-to-br from-danger-500 to-accent-600 rounded-2xl p-5 text-white shadow-healthcare-lg">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-[14px] font-semibold">Critical Values</h3>
              </div>
              <div className="space-y-2">
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <p className="text-[12px] font-semibold">HbA1c 7.2% — High</p>
                  <p className="text-[11px] text-white/70 mt-0.5">Rajesh Kumar · LAB-2417</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <p className="text-[12px] font-semibold">Fasting Glucose 128 mg/dL — High</p>
                  <p className="text-[11px] text-white/70 mt-0.5">Rajesh Kumar · LAB-2417</p>
                </div>
              </div>
              <p className="text-[11px] text-white/60 mt-3">Doctor is notified instantly for values outside critical limits.</p>
            </div>

            <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
              <h3 className="text-[14px] font-semibold text-surface-800 mb-3">Sample Workflow</h3>
              <div className="space-y-3">
                {pipelineSteps.map((s, i) => (
                  <div key={s} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i <= 3 ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-400'}`}>
                      {i + 1}
                    </div>
                    <span className="text-[12px] text-surface-600">{s}</span>
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
