import {
  Users, Calendar, Clock, CheckCircle2,
  UserPlus, CreditCard, Beaker, Pill,
  Sparkles, Stethoscope, IndianRupee, TrendingUp,
  Inbox, Bell, BarChart3,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  PageHeader, StatCard,
} from '../components/ui'
import EmptyState from '../components/EmptyState'
import { SkeletonCard, SkeletonRows } from '../components/Skeleton'
import { useAuth } from '../auth/useAuth'
import { useEffect, useState, useMemo } from 'react'
import {
  listQueue, listAppointments, listInvoices, getDailyRevenue,
} from '../lib/api'
import type { QueueToken, Appointment, Invoice, DailyRevenue } from '../lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area,
} from 'recharts'

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

function paise(n: number): string {
  return `₹${(n / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

type DatePreset = 'today' | '7d' | '30d' | '90d' | 'custom'

function getDateRange(preset: DatePreset, customFrom?: string, customTo?: string): { from: string; to: string } {
  const today = new Date()
  const to = customTo || today.toISOString().slice(0, 10)
  let from: string
  switch (preset) {
    case 'today': from = to; break
    case '7d': from = new Date(today.getTime() - 6 * 86400000).toISOString().slice(0, 10); break
    case '30d': from = new Date(today.getTime() - 29 * 86400000).toISOString().slice(0, 10); break
    case '90d': from = new Date(today.getTime() - 89 * 86400000).toISOString().slice(0, 10); break
    default: from = customFrom || to; break
  }
  return { from, to }
}

export default function Dashboard() {
  const { user } = useAuth()
  const [queue, setQueue] = useState<QueueToken[]>([])
  const [appts, setAppts] = useState<Appointment[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [revenueData, setRevenueData] = useState<DailyRevenue[]>([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().slice(0, 10)

  const [datePreset, setDatePreset] = useState<DatePreset>('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const { from: dateFrom, to: dateTo } = getDateRange(datePreset, customFrom, customTo)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        if (datePreset === 'today') {
          const [q, a, inv] = await Promise.all([
            listQueue(today),
            listAppointments(today),
            listInvoices().catch(() => [] as Invoice[]),
          ])
          if (!cancelled) {
            setQueue(q.tokens)
            setAppts(a)
            setInvoices(inv)
          }
        } else {
          const inv = await listInvoices().catch(() => [] as Invoice[])
          const rev = await getDailyRevenue(dateFrom, dateTo).catch(() => [] as DailyRevenue[])
          if (!cancelled) {
            setInvoices(inv)
            setRevenueData(rev)
            setQueue([])
            setAppts([])
          }
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
  }, [dateFrom, dateTo, datePreset])

  const waitingCount = queue.filter((t) => t.status === 'waiting').length
  const consultingCount = queue.filter((t) => t.status === 'consulting').length
  const checkedInCount = queue.filter((t) => t.status === 'checked_in').length
  const completedCount = queue.filter((t) => t.status === 'completed').length

  const todaysInvoices = datePreset === 'today'
    ? invoices.filter(i => (i.issuedAt ?? i.createdAt).slice(0, 10) === today)
    : invoices.filter(i => {
        const d = (i.issuedAt ?? i.createdAt).slice(0, 10)
        return d >= dateFrom && d <= dateTo
      })

  const revenueToday = todaysInvoices.reduce((s, i) => s + i.totalPaise, 0)
  const collectedToday = todaysInvoices.reduce((s, i) => s + i.paidPaise, 0)
  const pendingToday = todaysInvoices.reduce((s, i) => s + Math.max(0, i.balancePaise), 0)

  const revenueTrend = useMemo(() => {
    if (datePreset === 'today') return []
    return revenueData.map(d => ({
      ...d,
      billed: d.billed / 100,
      collected: d.collected / 100,
    }))
  }, [revenueData, datePreset])

  const flowData = [
    { name: 'Scheduled', value: appts.length, color: '#1688f8' },
    { name: 'Checked In', value: checkedInCount, color: '#08bfa9' },
    { name: 'Waiting', value: waitingCount, color: '#f59e0b' },
    { name: 'Consulting', value: consultingCount, color: '#0f54c6' },
    { name: 'Completed', value: completedCount, color: '#16a36a' },
  ]

  const firstName = user?.fullName.split(/\s+/)[0] ?? 'Doctor'

  const insights = [
    waitingCount > 0
      ? `You have ${waitingCount} patient${waitingCount > 1 ? 's' : ''} waiting — keep the queue moving.`
      : 'No patients waiting right now. Great flow!',
    consultingCount > 0
      ? `${consultingCount} consultation${consultingCount > 1 ? 's' : ''} in progress.`
      : 'No active consultations. Start one from the queue.',
    revenueToday > 0
      ? `${paise(revenueToday)} billed today across ${todaysInvoices.length} invoice${todaysInvoices.length === 1 ? '' : 's'}.`
      : 'No invoices issued yet today.',
    pendingToday > 0
      ? `${paise(pendingToday)} in pending collections to follow up.`
      : 'All invoices for today are settled.',
  ]

  const activity = [
    ...queue.map(q => ({
      time: new Date(q.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `${q.patientName} · ${queueStatusLabel[q.status] ?? q.status}`,
      color: q.status === 'completed' ? 'bg-success-500' : q.status === 'consulting' ? 'bg-primary-500' : q.status === 'checked_in' ? 'bg-info-500' : 'bg-warning-500',
    })),
    ...appts.slice(0, 4).map(a => ({
      time: new Date(a.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Appointment booked · ${a.patientName}`,
      color: 'bg-accent-500',
    })),
  ].sort((x, y) => y.time.localeCompare(x.time)).slice(0, 6)

  const datePresets: Array<{ key: DatePreset; label: string }> = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
    { key: 'custom', label: 'Custom' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greetingForNow()}, ${firstName}`}
        subtitle={user ? `Here's what's happening at ${user.clinic.name}${datePreset !== 'today' ? ` (${dateFrom} to ${dateTo})` : ' today'}` : "Here's what's happening at your clinic today"}
        actions={
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1 bg-surface-100 rounded-xl p-1">
              {datePresets.map(p => (
                <button
                  key={p.key}
                  onClick={() => setDatePreset(p.key)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                    datePreset === p.key
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-surface-500 hover:text-surface-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {datePreset === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="border border-surface-200 rounded-lg px-2 py-1 text-[12px]"
                />
                <span className="text-surface-400">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="border border-surface-200 rounded-lg px-2 py-1 text-[12px]"
                />
              </div>
            )}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-200/50">
              <Sparkles className="w-4 h-4 text-primary-600" />
              <span className="text-[13px] font-medium text-primary-700">Live clinic insights</span>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Appointments" value={loading ? '—' : datePreset === 'today' ? String(appts.length) : String(todaysInvoices.length)} icon={Calendar} tone="teal" />
        <StatCard label="Checked In" value={loading ? '—' : String(checkedInCount)} icon={CheckCircle2} tone="green" />
        <StatCard label="Waiting" value={loading ? '—' : String(waitingCount)} icon={Clock} tone="amber" />
        <StatCard label="In Consultation" value={loading ? '—' : String(consultingCount)} icon={Stethoscope} tone="indigo" />
        <StatCard label="Completed" value={loading ? '—' : String(completedCount)} icon={Users} tone="slate" />
        <StatCard label={datePreset === 'today' ? 'Revenue Today' : 'Total Revenue'} value={loading ? '—' : paise(revenueToday)} icon={IndianRupee} tone="rose" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-100 shadow-healthcare overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
              <h2 className="text-[15px] font-semibold text-surface-800">
                {datePreset === 'today' ? 'Live Queue' : `Revenue Trend (${dateFrom} to ${dateTo})`}
              </h2>
            </div>
            <Link to="/appointments" className="text-[12px] font-medium text-primary-600 hover:text-primary-700 transition-colors">
              View All →
            </Link>
          </div>
          <div className="overflow-x-auto">
            {datePreset === 'today' ? (
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
                    <tr><td colSpan={4} className="px-5 py-6"><SkeletonRows rows={3} /></td></tr>
                  ) : queue.length === 0 ? (
                    <tr><td colSpan={4} className="px-5 py-8">
                      <EmptyState
                        icon={Inbox}
                        title="No tokens for today"
                        description="Patients who check in will appear here in real time."
                        action={<Link to="/appointments?new=1" className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-[13px] font-semibold text-white shadow-healthcare hover:bg-primary-700">New Appointment</Link>}
                      />
                    </td></tr>
                  ) : (
                    queue.map((q, i) => {
                      const label = queueStatusLabel[q.status] || q.status
                      const colorCls = statusColor[label] || 'bg-surface-100 text-surface-600 border-surface-200'
                      return (
                        <tr key={q.id} className="border-b border-surface-50 last:border-0 hover:bg-surface-50/50 transition-colors cursor-pointer">
                          <td className="px-5 py-3">
                            <span className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center text-[13px] font-bold text-surface-600">{q.tokenNo}</span>
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
                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${colorCls}`}>{label}</span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            ) : (
              <div className="p-5">
                {loading ? <SkeletonCard /> : revenueTrend.length === 0 ? (
                  <EmptyState icon={BarChart3} title="No revenue data" description="No invoices found for the selected period." />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={revenueTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradBilled" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1265e8" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#1265e8" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16a36a" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#16a36a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef4f8" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={d => d.slice(5)} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, '']} />
                      <Area type="monotone" dataKey="billed" stroke="#1265e8" strokeWidth={2} fill="url(#gradBilled)" name="Billed" />
                      <Area type="monotone" dataKey="collected" stroke="#16a36a" strokeWidth={2} fill="url(#gradCollected)" name="Collected" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
            <h2 className="text-[15px] font-semibold text-surface-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: UserPlus, label: 'New Patient', color: 'bg-primary-500 hover:bg-primary-600', to: '/patients?new=1' },
                { icon: Calendar, label: 'Appointment', color: 'bg-accent-500 hover:bg-accent-600', to: '/appointments?new=1' },
                { icon: Stethoscope, label: 'Consult', color: 'bg-success-500 hover:bg-success-600', to: '/consultation' },
                { icon: CreditCard, label: 'New Bill', color: 'bg-warning-500 hover:bg-warning-600', to: '/billing' },
                { icon: Pill, label: 'Pharmacy', color: 'bg-info-500 hover:bg-info-600', to: '/pharmacy' },
                { icon: Beaker, label: 'Lab Order', color: 'bg-danger-500 hover:bg-danger-600', to: '/laboratory' },
              ].map((a) => (
                <Link key={a.label} to={a.to} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-surface-50 transition-all duration-200 group">
                  <div className={`w-11 h-11 rounded-xl ${a.color} flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform`}>
                    <a.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium text-surface-600 text-center leading-tight">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600 rounded-2xl p-5 text-white shadow-healthcare-lg">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5" />
              <h2 className="text-[15px] font-semibold">AI Insights</h2>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="h-3 w-3/4 animate-pulse rounded bg-white/20" />
              ) : insights.map((text, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-200" />
                  <p className="text-[12px] leading-relaxed text-white/90">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-50 text-success-600"><IndianRupee className="h-4 w-4" /></div>
              <h2 className="text-[15px] font-semibold text-surface-800">{datePreset === 'today' ? "Today's" : 'Period'} Collections</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface-50 p-3">
                <p className="text-[11px] uppercase tracking-wider text-surface-400">Billed</p>
                <p className="mt-0.5 text-[16px] font-bold text-surface-800">{loading ? '—' : paise(revenueToday)}</p>
              </div>
              <div className="rounded-xl bg-surface-50 p-3">
                <p className="text-[11px] uppercase tracking-wider text-surface-400">Collected</p>
                <p className="mt-0.5 text-[16px] font-bold text-success-600">{loading ? '—' : paise(collectedToday)}</p>
              </div>
              <div className="col-span-2 rounded-xl bg-warning-50/60 border border-warning-100 p-3">
                <p className="text-[11px] uppercase tracking-wider text-warning-500">Pending</p>
                <p className="mt-0.5 text-[16px] font-bold text-warning-700">{loading ? '—' : paise(pendingToday)}</p>
              </div>
            </div>
          </div>

          {datePreset === 'today' && (
            <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
              <h2 className="text-[15px] font-semibold text-surface-800 mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {loading ? (
                  <div className="h-3 w-full animate-pulse rounded bg-surface-200" />
                ) : activity.length === 0 ? (
                  <p className="text-[12px] text-surface-400">No activity yet today.</p>
                ) : (
                  activity.map((a, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${a.color} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-surface-700 truncate">{a.text}</p>
                        <p className="text-[11px] text-surface-400">{a.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {datePreset === 'today' && (
        <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600"><Bell className="h-4 w-4" /></div>
            <div>
              <h2 className="text-[15px] font-semibold text-surface-800">Today's Patient Flow</h2>
              <p className="text-[11px] text-surface-400">Live counts across each stage of care</p>
            </div>
          </div>
          {loading ? (
            <SkeletonCard />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={flowData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef4f8" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} cursor={{ fill: '#f6f9fc' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {flowData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  )
}
