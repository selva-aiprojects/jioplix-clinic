// TODO: wire to backend procedures API when endpoints are available
import { useState } from 'react'
import {
  Syringe, Bandage, HeartPulse, Activity, Stethoscope, Clock,
  IndianRupee, CheckCircle2, Play, ArrowRight, Plus, Calendar,
  MoreHorizontal, Sparkles,
} from 'lucide-react'
import { PageHeader, StatCard, Button } from '../components/ui'

interface Procedure {
  name: string
  icon: typeof Syringe
  duration: string
  price: number
  consumables: number
  color: string
  light: string
}

const catalog: Procedure[] = [
  { name: 'IM / IV Injection', icon: Syringe, duration: '10 min', price: 100, consumables: 2, color: 'bg-primary-500', light: 'bg-primary-50' },
  { name: 'Wound Dressing', icon: Bandage, duration: '15 min', price: 250, consumables: 4, color: 'bg-warning-500', light: 'bg-warning-50' },
  { name: 'Nebulization', icon: Activity, duration: '20 min', price: 200, consumables: 3, color: 'bg-info-500', light: 'bg-info-50' },
  { name: 'Vaccination', icon: HeartPulse, duration: '10 min', price: 450, consumables: 2, color: 'bg-success-500', light: 'bg-success-50' },
  { name: 'ECG', icon: Stethoscope, duration: '15 min', price: 350, consumables: 1, color: 'bg-accent-500', light: 'bg-accent-50' },
  { name: 'Minor Procedure', icon: Plus, duration: '45 min', price: 1500, consumables: 8, color: 'bg-danger-500', light: 'bg-danger-50' },
]

type ProcStatus = 'Ordered' | 'Prepared' | 'In Progress' | 'Completed' | 'Billed'

const statusStyles: Record<ProcStatus, string> = {
  Ordered: 'bg-surface-100 text-surface-600 border-surface-200',
  Prepared: 'bg-info-50 text-info-600 border-info-100',
  'In Progress': 'bg-warning-50 text-warning-600 border-warning-100',
  Completed: 'bg-success-50 text-success-700 border-success-200',
  Billed: 'bg-accent-50 text-accent-600 border-accent-100',
}

interface ScheduledProcedure {
  id: number
  time: string
  patient: string
  age: number
  gender: string
  avatar: string
  procedure: string
  doctor: string
  room: string
  status: ProcStatus
}

const schedule: ScheduledProcedure[] = [
  { id: 1, time: '09:30 AM', patient: 'Suresh Reddy', age: 61, gender: 'M', avatar: 'SR', procedure: 'ECG', doctor: 'Dr. Anand', room: 'Room 2', status: 'Billed' },
  { id: 2, time: '10:00 AM', patient: 'Meera Patel', age: 29, gender: 'F', avatar: 'MP', procedure: 'Nebulization', doctor: 'Dr. Priya', room: 'Room 1', status: 'Completed' },
  { id: 3, time: '10:45 AM', patient: 'Vikram Singh', age: 38, gender: 'M', avatar: 'VS', procedure: 'Wound Dressing', doctor: 'Dr. Priya', room: 'Procedure Room', status: 'In Progress' },
  { id: 4, time: '11:30 AM', patient: 'Baby Aarav', age: 4, gender: 'M', avatar: 'AA', procedure: 'Vaccination', doctor: 'Dr. Priya', room: 'Room 1', status: 'Prepared' },
  { id: 5, time: '12:15 PM', patient: 'Lakshmi Iyer', age: 47, gender: 'F', avatar: 'LI', procedure: 'IM Injection', doctor: 'Dr. Anand', room: 'Room 2', status: 'Ordered' },
]

export default function Procedures() {
  const [, setSelected] = useState<string>(catalog[0].name)

  const completedToday = schedule.filter((s) => s.status === 'Completed' || s.status === 'Billed').length

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bandage}
        tint="green"
        badge="Add-on"
        title="Procedures"
        subtitle="Order → record → consume inventory → bill"
        actions={
          <Button>
            <Plus className="w-4 h-4" /> Order Procedure
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Scheduled Today', value: String(schedule.length), icon: Calendar, tone: 'indigo' as const },
          { label: 'In Progress', value: '1', icon: Play, tone: 'amber' as const },
          { label: 'Completed Today', value: String(completedToday), icon: CheckCircle2, tone: 'green' as const },
          { label: "Today's Revenue", value: '₹22,050', icon: IndianRupee, tone: 'teal' as const },
          { label: 'Avg. Turnaround', value: '18 min', icon: Clock, tone: 'sky' as const },
        ].map((m) => (
          <StatCard key={m.label} {...m} />
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-surface-800">Procedure Catalog</h2>
          <span className="text-[12px] text-surface-400">Consumables auto-deducted from inventory on completion</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {catalog.map((p) => (
            <button
              key={p.name}
              onClick={() => setSelected(p.name)}
              className="bg-white rounded-2xl p-4 border border-surface-100 shadow-healthcare hover:shadow-healthcare-lg hover:-translate-y-0.5 transition-all duration-200 text-left group"
            >
              <div className={`w-10 h-10 rounded-xl ${p.light} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                <p.icon className={`w-5 h-5`} style={{}} />
              </div>
              <p className="text-[13px] font-semibold text-surface-800 leading-tight">{p.name}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] text-surface-400 flex items-center gap-1"><Clock className="w-3 h-3" />{p.duration}</span>
                <span className="text-[13px] font-bold text-surface-800 ml-auto">₹{p.price}</span>
              </div>
              <p className="text-[10px] text-surface-400 mt-1">{p.consumables} linked consumables</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-100 shadow-healthcare overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h2 className="text-[15px] font-semibold text-surface-800">Today's Schedule</h2>
            <span className="text-[12px] font-medium text-primary-600">21 Aug 2026</span>
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
                {schedule.map((s) => (
                  <tr key={s.id} className="border-b border-surface-50 last:border-0 hover:bg-surface-50/50 transition-colors">
                    <td className="px-5 py-3 text-[12px] font-medium text-surface-600 whitespace-nowrap">{s.time}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-success-400 to-success-600 flex items-center justify-center text-white text-[10px] font-bold">{s.avatar}</div>
                        <div>
                          <p className="text-[13px] font-semibold text-surface-800 leading-tight">{s.patient}</p>
                          <p className="text-[11px] text-surface-400">{s.age}{s.gender}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[13px] text-surface-700 whitespace-nowrap">{s.procedure}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="text-[12px] text-surface-600">{s.doctor}</p>
                      <p className="text-[11px] text-surface-400">{s.room}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border whitespace-nowrap ${statusStyles[s.status]}`}>{s.status}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        {(s.status === 'Ordered' || s.status === 'Prepared') && (
                          <button className="px-3 py-1.5 rounded-lg bg-success-500 text-white text-[11px] font-semibold hover:bg-success-600 transition-colors whitespace-nowrap">
                            {s.status === 'Ordered' ? 'Prepare' : 'Start'}
                          </button>
                        )}
                        {s.status === 'In Progress' && (
                          <button className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-[11px] font-semibold hover:bg-primary-600 transition-colors whitespace-nowrap flex items-center gap-1">
                            Complete <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        {s.status === 'Completed' && (
                          <button className="px-3 py-1.5 rounded-lg bg-accent-500 text-white text-[11px] font-semibold hover:bg-accent-600 transition-colors whitespace-nowrap">
                            Generate Bill
                          </button>
                        )}
                        {s.status === 'Billed' && (
                          <button className="p-1.5 rounded-lg text-surface-300 hover:text-surface-600 hover:bg-surface-100 transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
              {['Doctor orders procedure', 'Recorded in patient EMR', 'Consumables deducted from stock', 'Auto-added to billing', 'Payment & receipt'].map((step, i) => (
                <div key={step} className="flex items-center gap-2.5 bg-white/10 rounded-xl px-3 py-2 backdrop-blur-sm">
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                  <p className="text-[12px] text-white/90">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
            <h3 className="text-[14px] font-semibold text-surface-800 mb-3">Consumption Today</h3>
            <div className="space-y-2.5">
              {[
                { item: 'Nitrile Gloves', used: 24 },
                { item: 'Alcohol Swabs', used: 31 },
                { item: 'Syringes 5ml', used: 12 },
                { item: 'Nebulizer Masks', used: 3 },
                { item: 'ECG Electrodes', used: 10 },
              ].map((c) => (
                <div key={c.item} className="flex items-center justify-between">
                  <span className="text-[12px] text-surface-600">{c.item}</span>
                  <span className="text-[12px] font-bold text-surface-800">−{c.used}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-surface-400 mt-3 pt-3 border-t border-surface-100">Deducted live from the shared Inventory engine</p>
          </div>
        </div>
      </div>
    </div>
  )
}
