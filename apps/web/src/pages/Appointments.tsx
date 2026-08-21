import { useState, useEffect } from 'react'
import {
  Clock, Plus, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Timer, Stethoscope,
  CalendarDays, Activity,
} from 'lucide-react'
import { PageHeader, StatCard, Button } from '../components/ui'
import { listAppointments } from '../lib/api'
import type { Appointment } from '../lib/api'

const hours = Array.from({ length: 12 }, (_, i) => `${i + 8}:00`)

const statusConfig: Record<string, { bg: string; text: string; icon: typeof CheckCircle2; label: string }> = {
  'completed': { bg: 'bg-success-50 border-success-200', text: 'text-success-700', icon: CheckCircle2, label: 'Completed' },
  'in_consultation': { bg: 'bg-primary-50 border-primary-200', text: 'text-primary-700', icon: Stethoscope, label: 'In Progress' },
  'checked_in': { bg: 'bg-info-50 border-info-200', text: 'text-info-700', icon: CheckCircle2, label: 'Checked In' },
  'waiting': { bg: 'bg-warning-50 border-warning-200', text: 'text-warning-700', icon: Timer, label: 'Waiting' },
  'scheduled': { bg: 'bg-surface-50 border-surface-200', text: 'text-surface-600', icon: Clock, label: 'Scheduled' },
  'cancelled': { bg: 'bg-danger-50 border-danger-200', text: 'text-danger-600', icon: XCircle, label: 'Cancelled' },
  'no_show': { bg: 'bg-surface-50 border-surface-200', text: 'text-surface-500', icon: XCircle, label: 'No Show' },
}

const doctors = ['All Doctors', 'Dr. Priya', 'Dr. Anand']

function avatarColorFor(name: string): string {
  const colors = [
    'from-primary-400 to-primary-600',
    'from-accent-400 to-accent-600',
    'from-success-400 to-success-600',
    'from-info-400 to-info-600',
    'from-warning-400 to-warning-600',
    'from-danger-400 to-danger-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || '?'
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [selectedDoctor, setSelectedDoctor] = useState('All Doctors')
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await listAppointments(today)
        if (!cancelled) setAppointments(data)
      } catch {
        if (!cancelled) setAppointments([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = selectedDoctor === 'All Doctors'
    ? appointments
    : appointments.filter(a => a.doctorName === selectedDoctor)

  const stats = {
    total: filtered.length,
    completed: filtered.filter(a => a.status === 'completed').length,
    active: filtered.filter(a => a.status === 'in_consultation' || a.status === 'checked_in' || a.status === 'waiting').length,
    cancelled: filtered.filter(a => a.status === 'cancelled' || a.status === 'no_show').length,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments & Queue"
        subtitle="Manage today's schedule and patient queue"
        actions={
          <Button>
            <Plus className="w-4 h-4" />
            New Appointment
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} icon={CalendarDays} tone="slate" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} tone="green" />
        <StatCard label="Active" value={stats.active} icon={Activity} tone="teal" />
        <StatCard label="Cancelled" value={stats.cancelled} icon={XCircle} tone="rose" />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex gap-1 bg-surface-100 rounded-xl p-1">
          {doctors.map(d => (
            <button
              key={d}
              onClick={() => setSelectedDoctor(d)}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                selectedDoctor === d ? 'bg-white text-primary-700 shadow-sm' : 'text-surface-500 hover:text-surface-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex gap-2 md:ml-auto">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${view === 'list' ? 'bg-white text-primary-700 shadow-sm border border-primary-200' : 'text-surface-500 border border-surface-200 hover:bg-surface-50'}`}
          >
            List View
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${view === 'calendar' ? 'bg-white text-primary-700 shadow-sm border border-primary-200' : 'text-surface-500 border border-surface-200 hover:bg-surface-50'}`}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Patient</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Doctor</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Time</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-[13px] text-surface-400">Loading appointments…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-[13px] text-surface-400">No appointments found</td></tr>
                ) : (
                  filtered.map((appt) => {
                    const sc = statusConfig[appt.status] || statusConfig['scheduled']
                    const time = new Date(appt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    return (
                      <tr key={appt.id} className="border-b border-surface-50 last:border-0 hover:bg-surface-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColorFor(appt.patientName)} flex items-center justify-center text-white text-[11px] font-bold shadow-sm`}>
                              {initialsOf(appt.patientName)}
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-surface-800">{appt.patientName}</p>
                              <p className="text-[11px] text-surface-400">{appt.patientId.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-[13px] text-surface-600">{appt.doctorName}</td>
                        <td className="px-5 py-3 text-[13px] text-surface-600">{time}</td>
                        <td className="px-5 py-3">
                          <span className="text-[12px] font-medium text-surface-600 bg-surface-100 px-2 py-1 rounded-md">{appt.source || 'walk_in'}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${sc.bg} ${sc.text}`}>
                            <sc.icon className="w-3 h-3" />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {appt.status === 'scheduled' && (
                            <button className="px-3 py-1.5 rounded-lg bg-primary-50 text-primary-600 text-[12px] font-medium hover:bg-primary-100 transition-colors">
                              Check In
                            </button>
                          )}
                          {appt.status === 'in_consultation' && (
                            <button className="px-3 py-1.5 rounded-lg bg-success-50 text-success-600 text-[12px] font-medium hover:bg-success-100 transition-colors">
                              Complete
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-lg hover:bg-surface-100 text-surface-400"><ChevronLeft className="w-4 h-4" /></button>
              <h3 className="text-[15px] font-semibold text-surface-800">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}</h3>
              <button className="p-2 rounded-lg hover:bg-surface-100 text-surface-400"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-[60px_1fr_1fr] gap-px bg-surface-100 rounded-xl overflow-hidden">
            <div className="bg-surface-50 p-2 text-[11px] font-semibold text-surface-400">Time</div>
            <div className="bg-surface-50 p-2 text-[11px] font-semibold text-surface-400">Dr. Priya</div>
            <div className="bg-surface-50 p-2 text-[11px] font-semibold text-surface-400">Dr. Anand</div>
              {hours.slice(0, 8).map(h => (
              <div key={h} className="contents">
                <div className="bg-white p-2 text-[11px] text-surface-400 font-medium">{h}</div>
                <div className="bg-white p-1">
                  {appointments.filter(a => new Date(a.scheduledAt).getHours() === parseInt(h) && a.doctorName === 'Dr. Priya').map(a => (
                    <div key={a.id} className={`p-2 rounded-lg border text-[11px] mb-1 ${(statusConfig[a.status] || statusConfig['scheduled']).bg} ${(statusConfig[a.status] || statusConfig['scheduled']).text} font-medium`}>
                      {a.patientName} - {a.source || 'walk_in'}
                    </div>
                  ))}
                </div>
                <div className="bg-white p-1">
                  {appointments.filter(a => new Date(a.scheduledAt).getHours() === parseInt(h) && a.doctorName === 'Dr. Anand').map(a => (
                    <div key={a.id} className={`p-2 rounded-lg border text-[11px] mb-1 ${(statusConfig[a.status] || statusConfig['scheduled']).bg} ${(statusConfig[a.status] || statusConfig['scheduled']).text} font-medium`}>
                      {a.patientName} - {a.source || 'walk_in'}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
