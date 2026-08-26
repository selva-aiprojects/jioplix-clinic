import { useEffect, useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart,
} from 'recharts'
import {
  Users, IndianRupee, Clock, Stethoscope,
  TrendingUp, Sparkles,
} from 'lucide-react'
import { PageHeader, StatCard } from '../components/ui'
import { SkeletonCard } from '../components/Skeleton'
import { getAnalyticsSummary, getDailyRevenue, getDailyPatients } from '../lib/api'
import type { AnalyticsSummary, DailyRevenue, DailyPatients } from '../lib/api'

type Period = '7d' | '30d' | '90d'

function getDateRange(period: Period): { from: string; to: string } {
  const today = new Date()
  const to = today.toISOString().slice(0, 10)
  const days = period === '7d' ? 6 : period === '30d' ? 29 : 89
  const from = new Date(today.getTime() - days * 86400000).toISOString().slice(0, 10)
  return { from, to }
}

function paise(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`
  return `₹${n}`
}

export default function Analytics() {
  const [period, setPeriod] = useState<Period>('30d')
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [revenueData, setRevenueData] = useState<DailyRevenue[]>([])
  const [patientData, setPatientData] = useState<DailyPatients[]>([])
  const [loading, setLoading] = useState(true)

  const { from, to } = getDateRange(period)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [s, r, p] = await Promise.all([
          getAnalyticsSummary(from, to),
          getDailyRevenue(from, to),
          getDailyPatients(from, to),
        ])
        if (!cancelled) {
          setSummary(s)
          setRevenueData(r)
          setPatientData(p)
        }
      } catch {
        if (!cancelled) {
          setSummary(null)
          setRevenueData([])
          setPatientData([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [from, to])

  const revenueTrend = useMemo(() =>
    revenueData.map(d => ({ ...d, billed: d.billed / 100, collected: d.collected / 100 })),
    [revenueData]
  )

  const patientTrend = useMemo(() =>
    patientData.map(d => ({ date: d.date.slice(5) || d.date, count: d.count })),
    [patientData]
  )

  const drugSplit = useMemo(() => {
    if (!summary?.topDrugs?.length) return []
    const total = summary.topDrugs.reduce((s, d) => s + d.count, 0)
    const colors = ['#1265e8', '#08bfa9', '#f59e0b', '#e5484d', '#6366f1', '#16a36a', '#ec4899', '#94a3b8']
    return summary.topDrugs.slice(0, 6).map((d, i) => ({
      name: d.drugName,
      value: Math.round((d.count / total) * 100),
      color: colors[i % colors.length],
    }))
  }, [summary])

  return (
    <div className="space-y-6">
      <PageHeader
        icon={TrendingUp}
        title="Analytics"
        subtitle="Clinic performance and insights"
        actions={
          <div className="flex items-center gap-1 bg-surface-100 rounded-xl p-1">
            {(['7d', '30d', '90d'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                  period === p
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-surface-500 hover:text-surface-700'
                }`}
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-surface-100 p-5 animate-pulse">
              <div className="h-3 w-20 bg-surface-200 rounded mb-2" />
              <div className="h-6 w-16 bg-surface-200 rounded" />
            </div>
          ))
        ) : (
          <>
            <StatCard label="Total Revenue" value={paise(summary?.revenue.billedPaise ?? 0)} icon={IndianRupee} tone="green" />
            <StatCard label="Total Patients" value={String(summary?.patients.total ?? 0)} icon={Users} tone="teal" />
            <StatCard label="Consultations" value={String(summary?.consultations.total ?? 0)} icon={Stethoscope} tone="indigo" />
            <StatCard label="Avg/Day" value={String(summary?.consultations.avgPerDay ?? 0)} icon={Clock} tone="amber" />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
          <h3 className="text-[14px] font-semibold text-surface-800 mb-4">Revenue Trend</h3>
          {loading ? <SkeletonCard /> : revenueTrend.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-[12px] text-surface-400">No revenue data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1265e8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#1265e8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a36a" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#16a36a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, '']} />
                <Area type="monotone" dataKey="billed" stroke="#1265e8" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" name="Billed" />
                <Area type="monotone" dataKey="collected" stroke="#16a36a" strokeWidth={2} fillOpacity={1} fill="url(#colorCollected)" name="Collected" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
          <h3 className="text-[14px] font-semibold text-surface-800 mb-4">Top Drugs</h3>
          {loading ? <SkeletonCard /> : drugSplit.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-[12px] text-surface-400">No prescriptions yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={drugSplit} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    {drugSplit.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {drugSplit.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: d.color }} />
                    <span className="text-[12px] text-surface-600 flex-1 truncate">{d.name}</span>
                    <span className="text-[12px] font-semibold text-surface-700">{d.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
          <h3 className="text-[14px] font-semibold text-surface-800 mb-4">Daily Patients</h3>
          {loading ? <SkeletonCard /> : patientTrend.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-[12px] text-surface-400">No patient data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={patientTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} name="Patients" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
          <h3 className="text-[14px] font-semibold text-surface-800 mb-4">Summary</h3>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-4 bg-surface-100 rounded animate-pulse" />)}
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-surface-50 p-3">
                  <p className="text-[11px] text-surface-400">Billed</p>
                  <p className="text-[16px] font-bold text-surface-800">{paise(summary.revenue.billedPaise)}</p>
                </div>
                <div className="rounded-xl bg-surface-50 p-3">
                  <p className="text-[11px] text-surface-400">Collected</p>
                  <p className="text-[16px] font-bold text-success-600">{paise(summary.revenue.collectedPaise)}</p>
                </div>
                <div className="rounded-xl bg-surface-50 p-3">
                  <p className="text-[11px] text-surface-400">Pending</p>
                  <p className="text-[16px] font-bold text-warning-600">{paise(summary.revenue.pendingPaise)}</p>
                </div>
                <div className="rounded-xl bg-surface-50 p-3">
                  <p className="text-[11px] text-surface-400">Appointments</p>
                  <p className="text-[16px] font-bold text-surface-800">{summary.appointments.total}</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-200/50">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary-600" />
                  <span className="text-[12px] font-semibold text-primary-700">Period Insight</span>
                </div>
                <p className="text-[12px] text-primary-700/80">
                  {summary.revenue.billedPaise > 0
                    ? `₹${(summary.revenue.collectedPaise / summary.revenue.billedPaise * 100).toFixed(0)}% collection rate with ${summary.consultations.total} consultations averaging ${summary.consultations.avgPerDay}/day.`
                    : `No billing activity in this period. ${summary.consultations.total} consultations recorded.`}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-surface-400">No data available</p>
          )}
        </div>
      </div>
    </div>
  )
}
