import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, Plus, Phone, FileText,
  ChevronRight, Shield,
} from 'lucide-react'
import { PageHeader, Button } from '../components/ui'
import { listPatients } from '../lib/api'
import type { Patient } from '../lib/api'

const tabs = ['All Patients', 'Recent', 'Follow-up Due', 'Chronic']

function patientAvatar(firstName: string, lastName: string): string {
  return ((firstName?.[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase() || '?'
}

const avatarColors = [
  'from-primary-400 to-primary-600',
  'from-accent-400 to-accent-600',
  'from-success-400 to-success-600',
  'from-info-400 to-info-600',
  'from-warning-400 to-warning-600',
  'from-danger-400 to-danger-600',
]

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('All Patients')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await listPatients()
        if (!cancelled) setPatients(data)
      } catch {
        if (!cancelled) setPatients([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = patients.filter(p => {
    const name = `${p.firstName} ${p.lastName}`.toLowerCase()
    const mrn = p.mrn.toLowerCase()
    const phone = p.phone.toLowerCase()
    return name.includes(search.toLowerCase()) ||
      mrn.includes(search.toLowerCase()) ||
      phone.includes(search.toLowerCase())
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        subtitle={loading ? 'Loading…' : `${patients.length} patients registered`}
        actions={
          <Button>
            <Plus className="w-4 h-4" />
            New Patient
          </Button>
        }
      />

      {/* Tabs + Search */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex gap-1 bg-surface-100 rounded-xl p-1">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                activeTab === tab
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-surface-500 hover:text-surface-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search patients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-white border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all"
          />
        </div>
      </div>

      {/* Patient Cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-[13px] text-surface-400">Loading patients…</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-[13px] text-surface-400">No patients found</div>
        ) : (
          filtered.map((patient, idx) => (
            <Link
              key={patient.id}
              to={`/patients/${patient.id}`}
              className="group bg-white rounded-2xl border border-surface-100 shadow-healthcare hover:shadow-healthcare-lg p-5 transition-all duration-200 hover:border-primary-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-white text-[13px] font-bold shadow-sm`}>
                    {patientAvatar(patient.firstName, patient.lastName)}
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-surface-800 group-hover:text-primary-700 transition-colors">
                      {patient.firstName} {patient.lastName}
                    </h3>
                    <p className="text-[12px] text-surface-400">{patient.mrn} · {patient.gender || 'N/A'}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-surface-300 group-hover:text-primary-500 transition-colors" />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-surface-400" />
                  <span className="text-[12px] text-surface-600">{patient.phone}</span>
                </div>
                {patient.email && (
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-surface-400" />
                    <span className="text-[12px] text-surface-600">{patient.email}</span>
                  </div>
                )}
                {patient.bloodGroup && (
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-primary-500" />
                    <span className="text-[12px] text-primary-600 font-medium">Blood: {patient.bloodGroup}</span>
                  </div>
                )}
                {patient.abhaNumber && (
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-primary-500" />
                    <span className="text-[12px] text-primary-600 font-medium">ABHA: {patient.abhaNumber}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-100">
                <span className="text-[11px] text-surface-400">Registered {new Date(patient.createdAt).toLocaleDateString()}</span>
                <span className="text-[11px] text-surface-300">View profile →</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
