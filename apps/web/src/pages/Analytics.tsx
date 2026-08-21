// TODO: wire to backend analytics API when endpoints are available
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart,
} from 'recharts'
import {
  Users, IndianRupee, Clock, Stethoscope,
  TrendingUp, Sparkles,
} from 'lucide-react'
import { PageHeader, StatCard } from '../components/ui'

const revenueData = [
  { month: 'Mar', revenue: 320000, consultations: 180 },
  { month: 'Apr', revenue: 345000, consultations: 195 },
  { month: 'May', revenue: 310000, consultations: 170 },
  { month: 'Jun', revenue: 380000, consultations: 210 },
  { month: 'Jul', revenue: 420000, consultations: 235 },
  { month: 'Aug', revenue: 465000, consultations: 258 },
]

const dailyData = [
  { day: 'Mon', patients: 22, revenue: 16500 },
  { day: 'Tue', patients: 28, revenue: 21000 },
  { day: 'Wed', patients: 25, revenue: 18750 },
  { day: 'Thu', patients: 30, revenue: 22500 },
  { day: 'Fri', patients: 26, revenue: 19500 },
  { day: 'Sat', patients: 18, revenue: 13500 },
]

const doctorPerformance = [
  { name: 'Dr. Priya', consultations: 145, revenue: 280000, satisfaction: 4.8, utilization: 82 },
  { name: 'Dr. Anand', consultations: 113, revenue: 185000, satisfaction: 4.6, utilization: 75 },
]

const departmentSplit = [
  { name: 'General Medicine', value: 45, color: '#0d9488' },
  { name: 'Follow-up', value: 25, color: '#6366f1' },
  { name: 'Vaccination', value: 15, color: '#f59e0b' },
  { name: 'Other', value: 15, color: '#94a3b8' },
]

export default function Analytics() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={TrendingUp}
        title="Analytics"
        subtitle="Clinic performance and insights"
        actions={
          <select className="px-4 py-2 rounded-xl bg-white border border-surface-200 text-[13px] text-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/30">
            <option>This Month</option>
            <option>Last Month</option>
            <option>This Quarter</option>
          </select>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Monthly Revenue', value: '₹4.65L', change: '+10.7%', up: true, icon: IndianRupee, tone: 'green' as const },
          { label: 'Total Patients', value: '258', change: '+9.8%', up: true, icon: Users, tone: 'teal' as const },
          { label: 'Avg Wait Time', value: '14 min', change: '-8%', up: false, icon: Clock, tone: 'amber' as const },
          { label: 'Doctor Utilization', value: '78%', change: '+3%', up: true, icon: Stethoscope, tone: 'indigo' as const },
        ].map(kpi => (
          <StatCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
          <h3 className="text-[14px] font-semibold text-surface-800 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v) => `₹${v/1000}k`} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Department Split */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
          <h3 className="text-[14px] font-semibold text-surface-800 mb-4">Consultation Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={departmentSplit}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {departmentSplit.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {departmentSplit.map(d => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: d.color }} />
                <span className="text-[12px] text-surface-600 flex-1">{d.name}</span>
                <span className="text-[12px] font-semibold text-surface-700">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Doctor Performance + Daily Chart */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily Patients */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
          <h3 className="text-[14px] font-semibold text-surface-800 mb-4">Daily Patients This Week</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="patients" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Doctor Performance */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
          <h3 className="text-[14px] font-semibold text-surface-800 mb-4">Doctor Performance</h3>
          <div className="space-y-4">
            {doctorPerformance.map(doc => (
              <div key={doc.name} className="p-4 rounded-xl bg-surface-50 border border-surface-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-[12px] font-bold">
                    {doc.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-surface-800">{doc.name}</p>
                    <p className="text-[11px] text-surface-400">Utilization: {doc.utilization}%</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[11px] text-surface-400">Consultations</p>
                    <p className="text-[15px] font-bold text-surface-800">{doc.consultations}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-surface-400">Revenue</p>
                    <p className="text-[15px] font-bold text-surface-800">₹{(doc.revenue/1000).toFixed(0)}k</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-surface-400">Satisfaction</p>
                    <p className="text-[15px] font-bold text-surface-800">⭐ {doc.satisfaction}</p>
                  </div>
                </div>
                {/* Utilization Bar */}
                <div className="mt-3">
                  <div className="w-full h-2 bg-surface-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all" style={{ width: `${doc.utilization}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* AI Insight */}
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-200/50">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary-600" />
              <span className="text-[12px] font-semibold text-primary-700">AI Insight</span>
            </div>
            <p className="text-[12px] text-primary-700/80">Dr. Anand's average waiting time increased 18% this month. Consider adjusting slot allocation.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
