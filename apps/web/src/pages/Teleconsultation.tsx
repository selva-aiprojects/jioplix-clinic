import { useCallback, useEffect, useState } from 'react'
import {
  Video, PhoneCall, Clock, Users, Activity,
  CheckCircle2, XCircle, ArrowRight, Radio,
} from 'lucide-react'
import { PageHeader, Button, StatCard } from '../components/ui'
import { api } from '../lib/api'

interface Session {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  encounterId: string | null
  status: 'scheduled' | 'waiting' | 'in_progress' | 'completed' | 'cancelled'
  roomUrl: string | null
  scheduledAt: string
  startedAt: string | null
  endedAt: string | null
  durationMinutes: number | null
  recordingConsent: boolean
  notes: string | null
  createdAt: string
}

interface SessionStats {
  totalToday: number
  inProgress: number
  completed: number
  averageDuration: number | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-info-50 text-info-700 border-info-200', dot: 'bg-info-500' },
  waiting: { label: 'Waiting', color: 'bg-warning-50 text-warning-700 border-warning-200', dot: 'bg-warning-500' },
  in_progress: { label: 'In Progress', color: 'bg-success-50 text-success-700 border-success-200', dot: 'bg-success-500' },
  completed: { label: 'Completed', color: 'bg-surface-100 text-surface-600 border-surface-200', dot: 'bg-surface-400' },
  cancelled: { label: 'Cancelled', color: 'bg-danger-50 text-danger-600 border-danger-200', dot: 'bg-danger-500' },
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function Teleconsultation() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeCall, setActiveCall] = useState<Session | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [sessionRes, statsRes] = await Promise.all([
        api<{ data: Session[] }>('teleconsultation/sessions'),
        api<{ data: SessionStats }>('teleconsultation/sessions?stats=true'),
      ])
      setSessions(sessionRes.data)
      setStats(statsRes.data)
    } catch {
      setSessions([])
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function joinSession(session: Session) {
    if (session.status === 'scheduled' || session.status === 'waiting') {
      try {
        await api(`teleconsultation/sessions/${session.id}/status`, {
          method: 'PATCH',
          body: { status: 'in_progress' },
        })
        await refresh()
      } catch {
        // proceed to show mock call even if status update fails
      }
    }
    setActiveCall(session)
  }

  async function endCall(session: Session) {
    try {
      await api(`teleconsultation/sessions/${session.id}/status`, {
        method: 'PATCH',
        body: { status: 'completed' },
      })
      await refresh()
    } catch { /* no-op */ }
    setActiveCall(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Video}
        title="Teleconsultation"
        subtitle="Video consultation sessions"
        actions={
          <Button onClick={() => void refresh()} disabled={loading}>
            <Activity className="w-4 h-4" /> Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Today" value={stats?.totalToday ?? 0} icon={Users} tone="teal" />
        <StatCard label="In Progress" value={stats?.inProgress ?? 0} icon={Radio} tone="green" />
        <StatCard label="Completed" value={stats?.completed ?? 0} icon={CheckCircle2} tone="indigo" />
        <StatCard
          label="Avg Duration"
          value={stats?.averageDuration != null ? `${stats.averageDuration}m` : '—'}
          icon={Clock}
          tone="amber"
        />
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-10 text-center text-[13px] text-surface-400">
          Loading sessions…
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-10 text-center">
          <Video className="w-10 h-10 text-surface-300 mx-auto mb-3" />
          <p className="text-[14px] font-medium text-surface-700">No sessions today</p>
          <p className="text-[13px] text-surface-400 mt-1">Teleconsultation sessions scheduled for today will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50/70">
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-surface-500">Patient</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-surface-500">Doctor</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-surface-500">Scheduled</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-surface-500">Status</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-surface-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {sessions.map((s) => {
                  const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.scheduled
                  const canJoin = s.status === 'scheduled' || s.status === 'waiting' || s.status === 'in_progress'
                  const canEnd = s.status === 'in_progress'
                  return (
                    <tr key={s.id} className="hover:bg-surface-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-[13px] font-semibold text-surface-800">{s.patientName}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-[13px] text-surface-600">{s.doctorName}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-[13px] text-surface-600">{formatTime(s.scheduledAt)}</p>
                        {s.durationMinutes != null && (
                          <p className="text-[11px] text-surface-400">{s.durationMinutes}m duration</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {canJoin && (
                            <button
                              onClick={() => void joinSession(s)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-[11px] font-semibold hover:bg-primary-700 transition-colors"
                            >
                              {s.status === 'in_progress' ? (
                                <><ArrowRight className="w-3 h-3" /> Rejoin</>
                              ) : (
                                <><PhoneCall className="w-3 h-3" /> Join</>
                              )}
                            </button>
                          )}
                          {canEnd && (
                            <button
                              onClick={() => void endCall(s)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger-50 text-danger-600 text-[11px] font-semibold border border-danger-200 hover:bg-danger-100 transition-colors"
                            >
                              <XCircle className="w-3 h-3" /> End
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-healthcare-lg w-full max-w-lg mx-4 p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center mx-auto">
              <Video className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-surface-900">Video Call</h2>
            <p className="text-[13px] text-surface-500">
              Connecting to session with <strong>{activeCall.patientName}</strong>
            </p>
            <div className="bg-surface-50 rounded-2xl border border-surface-100 p-6">
              <p className="text-[14px] font-semibold text-surface-700">Video call would start here</p>
              <p className="text-[12px] text-surface-400 mt-1">
                Room: {activeCall.roomUrl ? activeCall.roomUrl.split('/').pop() : 'N/A'}
              </p>
              <p className="text-[12px] text-surface-400 mt-1">
                Provider: {import.meta.env.VITE_TELECONSULTATION_PROVIDER ?? 'mock'}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button onClick={() => void endCall(activeCall)} variant="secondary">
                <XCircle className="w-4 h-4" /> End Call
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
