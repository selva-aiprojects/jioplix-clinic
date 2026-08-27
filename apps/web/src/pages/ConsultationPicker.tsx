import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Stethoscope, ArrowRight, Lock, Activity, FileText,
  ClipboardList, CheckCircle2,
} from 'lucide-react'
import { PageHeader, StatCard, Button } from '../components/ui'
import { listEncountersByDate } from '../lib/api'
import type { DailyEncounterSummary } from '../lib/api'
import { useAuth } from '../auth/useAuth'

type Tab = 'today' | 'open' | 'signed'

export default function ConsultationPicker() {
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('encounters:create')
  const today = new Date().toISOString().slice(0, 10)
  const [list, setList] = useState<DailyEncounterSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('today')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listEncountersByDate(today)
      .then((data) => { if (!cancelled) setList(data) })
      .catch(() => { if (!cancelled) setList([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [today])

  const filtered = list.filter((e) => tab === 'open' ? !e.isLocked : tab === 'signed' ? e.isLocked : true)
  const openCount = list.filter((e) => !e.isLocked).length
  const signedCount = list.filter((e) => e.isLocked).length
  const vitalsCount = list.filter((e) => e.hasVitals).length

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Stethoscope}
        title="Today's Consultations"
        subtitle="Select an encounter to open its chart"
        actions={
          canCreate ? (
            <Link to="/appointments">
              <Button><ClipboardList className="w-4 h-4" /> Start from Appointments</Button>
            </Link>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Today" value={String(list.length)} icon={Stethoscope} tone="indigo" />
        <StatCard label="Open" value={String(openCount)} icon={FileText} tone="amber" />
        <StatCard label="Signed" value={String(signedCount)} icon={CheckCircle2} tone="green" />
        <StatCard label="With Vitals" value={String(vitalsCount)} icon={Activity} tone="sky" />
      </div>

      <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare">
        <div className="flex items-center gap-1 border-b border-surface-100 p-2">
          {([['today', 'All'], ['open', 'Open'], ['signed', 'Signed']] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                tab === key ? 'bg-primary-50 text-primary-700' : 'text-surface-500 hover:bg-surface-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-10 text-center text-[13px] text-surface-400">Loading encounters…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-[14px] font-medium text-surface-700">
              {tab === 'signed' ? 'No signed consultations today.' : tab === 'open' ? 'No open consultations today.' : 'No consultations yet today.'}
            </p>
            <p className="text-[13px] text-surface-400 mt-1">
              {canCreate ? 'Start one from today\'s appointments.' : 'Encounter lists for today will appear here once a consultation is started.'}
            </p>
            {canCreate && (
              <Link to="/appointments" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white text-[13px] font-medium hover:bg-primary-600 transition-colors">
                Go to Appointments <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-surface-100">
            {filtered.map((e) => (
              <li key={e.id}>
                <Link to={`/encounters/${e.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-50/80">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-surface-800">
                      {e.patientName}
                      {e.isLocked && <Lock className="ml-1.5 inline h-3 w-3 text-success-600" />}
                    </p>
                    <p className="truncate text-[12px] text-surface-400">{e.doctorName} · {new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.hasVitals ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-info-50 px-2 py-1 text-[11px] font-semibold text-info-600"><Activity className="h-3 w-3" /> Vitals</span>
                    ) : null}
                    {e.primaryDiagnoses > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2 py-1 text-[11px] font-semibold text-primary-600"><FileText className="h-3 w-3" /> Dx</span>
                    ) : null}
                    <span className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${e.isLocked ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'}`}>
                      {e.isLocked ? 'Signed' : 'Open'}
                    </span>
                    <ArrowRight className="h-4 w-4 text-surface-300" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}