import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Phone, Mail, Shield, Calendar, Pill,
  Beaker, AlertTriangle, Sparkles,
  Heart, Activity, Thermometer, Droplets, Stethoscope, User,
  MapPin, Printer,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui'
import { getPatient } from '../lib/api'
import type { Patient } from '../lib/api'

const defaultPatient: Partial<Patient> = {
  id: '', firstName: '', lastName: '', phone: '', email: '', gender: '',
  bloodGroup: '', abhaNumber: null, dateOfBirth: '', address: {},
}

export default function PatientProfile() {
  const { id } = useParams()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!id) return
      try {
        const data = await getPatient(id)
        if (!cancelled) setPatient(data)
      } catch {
        if (!cancelled) setPatient(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  const p = patient ?? { ...defaultPatient, id: id || '' } as Patient
  const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Patient Profile'
  const dobAge = p.dateOfBirth ? Math.max(0, Math.floor((Date.now() - new Date(p.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))) : null

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Link to="/patients" className="p-2 rounded-xl hover:bg-surface-100 text-surface-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${loading ? 'from-surface-200 to-surface-300' : 'from-primary-400 to-primary-600'} flex items-center justify-center text-white text-lg font-bold shadow-healthcare`}>
              {loading ? '…' : ((p.firstName?.[0] ?? '') + (p.lastName?.[0] ?? '')).toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-surface-900">{loading ? 'Loading…' : fullName}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[13px] text-surface-500">{p.mrn || p.id}</span>
                <span className="text-[13px] text-surface-400">·</span>
                <span className="text-[13px] text-surface-500">{dobAge ?? 'N/A'}{p.gender ? ` · ${p.gender}` : ''}</span>
                <span className="text-[13px] text-surface-400">·</span>
                <span className="text-[13px] text-surface-500">{p.bloodGroup || 'N/A'}</span>
                {p.abhaNumber && (
                  <>
                    <span className="text-[13px] text-surface-400">·</span>
                    <span className="inline-flex items-center gap-1 text-[12px] text-primary-600 font-medium bg-primary-50 px-2 py-0.5 rounded-md">
                      <Shield className="w-3 h-3" /> ABHA
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="hidden md:flex gap-2">
          <Button variant="secondary">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button>
            <Calendar className="w-4 h-4" /> Book Appointment
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Info */}
        <div className="space-y-6">
          {/* Contact */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
            <h3 className="text-[14px] font-semibold text-surface-800 mb-4">Contact Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center"><Phone className="w-4 h-4 text-primary-600" /></div>
                <div><p className="text-[12px] text-surface-400">Phone</p><p className="text-[13px] text-surface-700 font-medium">{p.phone || 'N/A'}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-50 flex items-center justify-center"><Mail className="w-4 h-4 text-accent-600" /></div>
                <div><p className="text-[12px] text-surface-400">Email</p><p className="text-[13px] text-surface-700 font-medium">{p.email || 'N/A'}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-info-50 flex items-center justify-center"><MapPin className="w-4 h-4 text-info-600" /></div>
                <div><p className="text-[12px] text-surface-400">Address</p><p className="text-[13px] text-surface-700">{p.address ? Object.values(p.address).join(', ') || 'N/A' : 'N/A'}</p></div>
              </div>
            </div>
          </div>

          {/* ABHA / Blood */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
            <h3 className="text-[14px] font-semibold text-surface-800 mb-3">Identifiers</h3>
            <div className="space-y-2">
              {p.abhaNumber && (
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-primary-500" />
                  <span className="text-[12px] text-primary-600 font-medium">ABHA: {p.abhaNumber}</span>
                </div>
              )}
              {p.bloodGroup && (
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-danger-500" />
                  <span className="text-[12px] text-danger-600 font-medium">Blood Group: {p.bloodGroup}</span>
                </div>
              )}
              {!p.abhaNumber && !p.bloodGroup && (
                <p className="text-[13px] text-surface-400">No additional identifiers</p>
              )}
            </div>
          </div>
        </div>

        {/* Center - Timeline (placeholder pending richer API) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vitals placeholder */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
            <h3 className="text-[14px] font-semibold text-surface-800 mb-4">Patient Record</h3>
            <p className="text-[13px] text-surface-500">
              Registered on {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}.
              Detailed vitals, timeline, prescriptions, and lab reports will appear here as those modules are wired.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
