import { useState } from 'react'
import { ShieldCheck, Search, Link2, CheckCircle2, XCircle, Clock, Activity, Server, Globe } from 'lucide-react'
import { PageHeader, StatCard, Button } from '../components/ui'

const mockActivityLog = [
  { id: '1', action: 'ABHA Linked', detail: 'ABHA 12-3456-7890-1234 linked to patient #P-1042', status: 'success' as const, time: '2 min ago' },
  { id: '2', action: 'Records Fetched', detail: '3 health records retrieved from ABDM for patient #P-1038', status: 'success' as const, time: '15 min ago' },
  { id: '3', action: 'Consent Requested', detail: 'Consent for lab results sharing sent to patient #P-1041', status: 'info' as const, time: '1 hr ago' },
  { id: '4', action: 'Records Pushed', detail: '5 clinical records pushed for patient #P-1035', status: 'success' as const, time: '3 hr ago' },
  { id: '5', action: 'Consent Denied', detail: 'Patient #P-1029 denied consent for data sharing', status: 'error' as const, time: '5 hr ago' },
]

const statusStyles = {
  success: 'bg-success-50 text-success-700 border-success-200',
  info: 'bg-info-50 text-info-700 border-info-200',
  error: 'bg-danger-50 text-danger-600 border-danger-200',
}

export default function ABDMIntegration() {
  const [connected, setConnected] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [abhaNumber, setAbhaNumber] = useState('')
  const [linking, setLinking] = useState(false)

  function handleLink() {
    if (!patientSearch.trim() || !abhaNumber.trim()) return
    setLinking(true)
    setTimeout(() => {
      setLinking(false)
      setPatientSearch('')
      setAbhaNumber('')
    }, 1200)
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <PageHeader
        icon={ShieldCheck}
        title="ABDM Integration"
        subtitle="Ayushman Bharat Digital Mission — link ABHA, manage consent & share records"
        badge="ABHA"
        actions={
          <Button variant={connected ? 'secondary' : 'primary'} onClick={() => setConnected(!connected)}>
            {connected ? 'Disconnect' : 'Connect to ABDM'}
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Linked ABHA"
          value={connected ? '1,247' : '—'}
          icon={Link2}
          tone="teal"
          change={connected ? '+23 today' : undefined}
          up
        />
        <StatCard
          label="Records Shared"
          value={connected ? '8,910' : '—'}
          icon={Activity}
          tone="indigo"
          change={connected ? '+156 this week' : undefined}
          up
        />
        <StatCard
          label="Consent Pending"
          value={connected ? '12' : '—'}
          icon={Clock}
          tone="amber"
        />
      </div>

      {/* Connection Status */}
      <div className={`rounded-2xl border p-5 shadow-healthcare ${connected ? 'border-success-200 bg-success-50/30' : 'border-surface-200 bg-white'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${connected ? 'bg-success-100' : 'bg-surface-100'}`}>
              {connected ? <CheckCircle2 className="w-5 h-5 text-success-600" /> : <XCircle className="w-5 h-5 text-surface-400" />}
            </div>
            <div>
              <p className="text-[14px] font-semibold text-surface-800">
                {connected ? 'Connected to ABDM Sandbox' : 'Not Connected'}
              </p>
              <p className="text-[12px] text-surface-500">
                {connected ? 'All ABDM services are operational in sandbox mode' : 'Connect to start linking ABHA IDs and sharing records'}
              </p>
            </div>
          </div>
          {connected && (
            <span className="px-3 py-1.5 rounded-lg bg-success-100 text-success-700 text-[11px] font-bold uppercase tracking-wider">
              Sandbox Mode
            </span>
          )}
        </div>
      </div>

      {/* ABHA Linking */}
      <div className="rounded-2xl border border-surface-100 bg-white p-5 shadow-healthcare">
        <h2 className="text-[15px] font-semibold text-surface-800 mb-1">Link ABHA to Patient</h2>
        <p className="text-[12px] text-surface-500 mb-4">Search for a patient and enter their ABHA number to create a link.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Search patient by name or ID"
              className="w-full rounded-xl border border-surface-200 bg-surface-50 py-2.5 pl-10 pr-3 text-[13px] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <input
            value={abhaNumber}
            onChange={(e) => setAbhaNumber(e.target.value)}
            placeholder="ABHA Number (e.g. 12-3456-7890-1234)"
            className="rounded-xl border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 sm:w-72"
          />
          <Button onClick={handleLink} disabled={!patientSearch.trim() || !abhaNumber.trim() || linking}>
            <Link2 className="h-4 w-4" />
            {linking ? 'Linking…' : 'Link ABHA'}
          </Button>
        </div>
      </div>

      {/* Activity Log */}
      <div className="rounded-2xl border border-surface-100 bg-white shadow-healthcare overflow-hidden">
        <div className="p-5 pb-3">
          <h2 className="text-[15px] font-semibold text-surface-800">Recent ABDM Activity</h2>
          <p className="text-[12px] text-surface-500">Latest interactions with the ABDM gateway</p>
        </div>
        <div className="divide-y divide-surface-100">
          {mockActivityLog.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between px-5 py-3 hover:bg-surface-50">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusStyles[entry.status]}`}>
                  {entry.action}
                </span>
                <span className="text-[13px] text-surface-600">{entry.detail}</span>
              </div>
              <span className="text-[11px] text-surface-400 whitespace-nowrap ml-4">{entry.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration */}
      <div className="rounded-2xl border border-surface-100 bg-white p-5 shadow-healthcare">
        <h2 className="text-[15px] font-semibold text-surface-800 mb-4">Configuration</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-50 border border-surface-100">
            <Server className="w-5 h-5 text-surface-400" />
            <div>
              <p className="text-[11px] text-surface-400 uppercase tracking-wider font-semibold">API Endpoint</p>
              <p className="text-[13px] text-surface-700 font-medium">https://abhasbx.abdm.gov.in</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-50 border border-surface-100">
            <Globe className="w-5 h-5 text-surface-400" />
            <div>
              <p className="text-[11px] text-surface-400 uppercase tracking-wider font-semibold">Sandbox Mode</p>
              <p className="text-[13px] text-surface-700 font-medium">Enabled — using ABDM sandbox environment</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
