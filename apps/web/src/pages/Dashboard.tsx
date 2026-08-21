import {
  Users, Calendar, Clock, CheckCircle2, IndianRupee, AlertCircle,
  UserPlus, CreditCard, Beaker, Pill,
  Sparkles, TrendingUp, Timer, Stethoscope,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader, StatCard } from '../components/ui'
import { useAuth } from '../auth/useAuth'
import { useEffect, useState } from 'react'
import { listQueue, listAppointments } from '../lib/api'
import type { QueueToken, Appointment } from '../lib/api'

const metrics = [
  { label: 'Appointments', value: '24', change: '+12%', up: true, icon: Calendar, tone: 'teal' as const },
  { label: 'Checked In', value: '18', change: '+8%', up: true, icon: CheckCircle2, tone: 'green' as const },
  { label: 'Waiting', value: '6', change: '-2', up: false, icon: Clock, tone: 'amber' as const },
  { label: 'In Consultation', value: '3', change: '', up: true, icon: Stethoscope, tone: 'indigo' as const },
  { label: "Today's Revenue", value: '₹48,500', change: '+18%', up: true, icon: IndianRupee, tone: 'green' as const },
  { label: 'Outstanding', value: '₹12,300', change: '-5%', up: false, icon: AlertCircle, tone: 'rose' as const },
]

const statusColor: Record<string, string> = {
  'Waiting': 'bg-warning-100 text-warning-700 border-warning-200',
  'Consulting': 'bg-primary-100 text-primary-700 border-primary-200',
  'In Queue': 'bg-surface-100 text-surface-600 border-surface-200',
  'Checked In': 'bg-success-100 text-success-700 border-success-200',
  'Scheduled': 'bg-accent-100 text-accent-700 border-accent-200',
  'Completed': 'bg-surface-100 text-surface-500 border-surface-200',
}

const avatarColors = [
  'from-primary-400 to-primary-600',
  'from-accent-400 to-accent-600',
  'from-success-400 to-success-600',
  'from-info-400 to-info-600',
  'from-warning-400 to-warning-600',
  'from-danger-400 to-danger-600',
]

function greetingForNow(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || '?'
}

const queueStatusLabel: Record<string, string> = {
  waiting: 'Waiting',
  checked_in: 'Checked In',
  consulting: 'Consulting',
  completed: 'Completed',
  skipped: 'Skipped',
}

export default function Dashboard() {
  const { user } = useAuth()
  const [queue, setQueue] = useState<QueueToken[]>([])
  const [appts, setAppts] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [q, a] = await Promise.all([
          listQueue(today),
          listAppointments(today),
        ])
        if (!cancelled) {
          setQueue(q.tokens)
          setAppts(a)
        }
      } catch {
        if (!cancelled) {
          setQueue([])
          setAppts([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const waitingCount = queue.filter((t) => t.status === 'waiting').length
  const consultingCount = queue.filter((t) => t.status === 'consulting').length
  const checkedInCount = queue.filter((t) => t.status === 'checked_in').length

  const firstName = user?.fullName.split(/\s+/)[0] ?? 'Doctor'
  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`${greetingForNow()}, ${firstName}`}
        subtitle={user ? `Here's what's happening at ${user.clinic.name} today` : "Here's what's happening at your clinic today"}
        actions={
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-200/50">
            <Sparkles className="w-4 h-4 text-primary-600" />
            <span className="text-[13px] font-medium text-primary-700">5 AI insights today</span>
          </div>
        }
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Appointments" value={String(appts.length)} change={appts.length ? '+live' : ''} up={true} icon={Calendar} tone="teal" />
        <StatCard label="Checked In" value={String(checkedInCount)} change="" up={true} icon={CheckCircle2} tone="green" />
        <StatCard label="Waiting" value={String(waitingCount)} change={waitingCount ? '' : ''} up={false} icon={Clock} tone="amber" />
        <StatCard label="In Consultation" value={String(consultingCount)} change="" up={true} icon={Stethoscope} tone="indigo" />
        <StatCard label="In Queue" value={String(queue.length)} change="" up={true} icon={Users} tone="indigo" />
        <StatCard label="Queue Count" value={String(queue.length)} change="" up={true} icon={Timer} tone="slate" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Live Queue - takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-100 shadow-healthcare overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
              <h2 className="text-[15px] font-semibold text-surface-800">Live Queue</h2>
            </div>
            <Link to="/appointments" className="text-[12px] font-medium text-primary-600 hover:text-primary-700 transition-colors">
              View All →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Token</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Patient</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider max-md:hidden">Doctor</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-[13px] text-surface-400">Loading queue…</td></tr>
                ) : queue.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-[13px] text-surface-400">No tokens for today</td></tr>
                ) : (
                  queue.map((q, i) => {
                    const label = queueStatusLabel[q.status] || q.status
                    const colorCls = statusColor[label] || 'bg-surface-100 text-surface-600 border-surface-200'
                    return (
                      <tr key={q.id} className="border-b border-surface-50 last:border-0 hover:bg-surface-50/50 transition-colors cursor-pointer">
                        <td className="px-5 py-3">
                          <span className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center text-[13px] font-bold text-surface-600">
                            {q.tokenNo}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white text-[11px] font-bold shadow-sm`}>
                              {initialsOf(q.patientName)}
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-surface-800">{q.patientName}</p>
                              <p className="text-[11px] text-surface-400">Token #{q.tokenNo}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-[13px] text-surface-600 max-md:hidden">{q.doctorName}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${colorCls}`}>
                            {label}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions + AI Insights */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
            <h2 className="text-[15px] font-semibold text-surface-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: UserPlus, label: 'New Patient', color: 'bg-primary-500 hover:bg-primary-600', to: '/patients' },
                { icon: Calendar, label: 'Appointment', color: 'bg-accent-500 hover:bg-accent-600', to: '/appointments' },
                { icon: Stethoscope, label: 'Consult', color: 'bg-success-500 hover:bg-success-600', to: '/consultation' },
                { icon: CreditCard, label: 'New Bill', color: 'bg-warning-500 hover:bg-warning-600', to: '/billing' },
                { icon: Pill, label: 'Pharmacy', color: 'bg-info-500 hover:bg-info-600', to: '/pharmacy' },
                { icon: Beaker, label: 'Lab Order', color: 'bg-danger-500 hover:bg-danger-600', to: '/laboratory' },
              ].map((a) => (
                <Link
                  key={a.label}
                  to={a.to}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-surface-50 transition-all duration-200 group"
                >
                  <div className={`w-11 h-11 rounded-xl ${a.color} flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform`}>
                    <a.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium text-surface-600 text-center leading-tight">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600 rounded-2xl p-5 text-white shadow-healthcare-lg">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5" />
              <h2 className="text-[15px] font-semibold">AI Insights</h2>
            </div>
            <div className="space-y-3">
              {[
                { icon: Users, text: '18 patients are due for follow-up this week' },
                { icon: Timer, text: 'Avg waiting time increased 15% this month' },
                { icon: TrendingUp, text: 'Revenue up 12% compared to last week' },
              ].map((insight, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <insight.icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-200" />
                  <p className="text-[12px] leading-relaxed text-white/90">{insight.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
            <h2 className="text-[15px] font-semibold text-surface-800 mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {[
                { time: '10:45 AM', text: 'Rajesh Kumar checked in', color: 'bg-success-500' },
                { time: '10:32 AM', text: 'Payment received ₹800 from Meera', color: 'bg-primary-500' },
                { time: '10:15 AM', text: 'Lab report uploaded for Ananya', color: 'bg-accent-500' },
                { time: '10:00 AM', text: 'Dr. Priya started consultation', color: 'bg-info-500' },
              ].map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${a.color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-surface-700 truncate">{a.text}</p>
                    <p className="text-[11px] text-surface-400">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
