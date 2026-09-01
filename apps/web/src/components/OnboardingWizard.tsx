import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, UserPlus, Users, Puzzle, CheckCircle2,
  ChevronRight, ChevronLeft, Stethoscope, Pill, FlaskConical,
  Warehouse, Bandage, Loader2, Check,
} from 'lucide-react'

const TOTAL_STEPS = 6

const clinicTypes = [
  'General',
  'Dental',
  'Pediatric',
  'Dermatology',
  'Gynecology',
] as const

interface AddonOption {
  id: string
  name: string
  desc: string
  icon: typeof Pill
  price: string
}

const addonOptions: AddonOption[] = [
  { id: 'pharmacy', name: 'Pharmacy', desc: 'In-house dispensing counter with prescription queue', icon: Pill, price: '₹999/mo' },
  { id: 'laboratory', name: 'Laboratory', desc: 'In-house or external lab — orders to reviewed reports', icon: FlaskConical, price: '₹1,499/mo' },
  { id: 'inventory', name: 'Inventory', desc: 'Shared stock engine for medicines, consumables & reagents', icon: Warehouse, price: '₹499/mo' },
  { id: 'procedures', name: 'Procedures', desc: 'Record procedures, consume stock, bill automatically', icon: Bandage, price: '₹499/mo' },
]

function ProgressIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all duration-300 ${
              i < current
                ? 'bg-primary-600 text-white shadow-healthcare'
                : i === current
                ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-400 shadow-sm'
                : 'bg-surface-100 text-surface-400'
            }`}
          >
            {i < current ? <Check className="w-4 h-4" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={`w-8 h-0.5 rounded-full transition-all duration-300 ${
                i < current ? 'bg-primary-500' : 'bg-surface-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function StepWelcome() {
  return (
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-healthcare-lg">
        <Building2 className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-3xl font-bold text-surface-900 mb-3">
        Welcome to Jioplix Clinic OS
      </h2>
      <p className="text-[15px] text-surface-500 max-w-md mx-auto leading-relaxed">
        Let's get your clinic set up in just a few minutes. We'll configure your clinic profile,
        add your first team members, and choose the modules you need.
      </p>
      <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm mx-auto">
        {[
          { label: 'Clinic Profile', icon: Building2 },
          { label: 'Team Setup', icon: Users },
          { label: 'Choose Modules', icon: Puzzle },
        ].map((item) => (
          <div key={item.label} className="p-3 rounded-xl bg-surface-50 border border-surface-100">
            <item.icon className="w-5 h-5 text-primary-600 mx-auto mb-1.5" />
            <p className="text-[11px] font-semibold text-surface-600">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

interface ClinicProfileData {
  clinicName: string
  clinicType: string
  address: string
  phone: string
  email: string
}

function StepClinicProfile({
  data,
  onChange,
  errors,
}: {
  data: ClinicProfileData
  onChange: (d: ClinicProfileData) => void
  errors: Record<string, string>
}) {
  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-healthcare">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-surface-900">Clinic Profile</h2>
        <p className="text-[13px] text-surface-500 mt-1">Tell us about your clinic</p>
      </div>

      <div>
        <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Clinic Name *</label>
        <input
          type="text"
          value={data.clinicName}
          onChange={(e) => onChange({ ...data, clinicName: e.target.value })}
          placeholder="e.g. Nova Children's Clinic"
          className={`w-full px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400 ${errors.clinicName ? 'border-danger-300' : 'border-surface-200'}`}
        />
        {errors.clinicName && <p className="text-[11px] text-danger-600 mt-1">{errors.clinicName}</p>}
      </div>

      <div>
        <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Clinic Type *</label>
        <select
          value={data.clinicType}
          onChange={(e) => onChange({ ...data, clinicType: e.target.value })}
          className={`w-full px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all ${errors.clinicType ? 'border-danger-300' : 'border-surface-200'}`}
        >
          <option value="">Select type</option>
          {clinicTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {errors.clinicType && <p className="text-[11px] text-danger-600 mt-1">{errors.clinicType}</p>}
      </div>

      <div>
        <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Address</label>
        <input
          type="text"
          value={data.address}
          onChange={(e) => onChange({ ...data, address: e.target.value })}
          placeholder="Full clinic address"
          className="w-full px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Phone *</label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => onChange({ ...data, phone: e.target.value })}
            placeholder="+91 98000 00101"
            className={`w-full px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400 ${errors.phone ? 'border-danger-300' : 'border-surface-200'}`}
          />
          {errors.phone && <p className="text-[11px] text-danger-600 mt-1">{errors.phone}</p>}
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Email *</label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => onChange({ ...data, email: e.target.value })}
            placeholder="clinic@example.com"
            className={`w-full px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400 ${errors.email ? 'border-danger-300' : 'border-surface-200'}`}
          />
          {errors.email && <p className="text-[11px] text-danger-600 mt-1">{errors.email}</p>}
        </div>
      </div>
    </div>
  )
}

interface DoctorData {
  name: string
  specialty: string
  phone: string
  email: string
}

function StepDoctorSetup({
  data,
  onChange,
  errors,
}: {
  data: DoctorData
  onChange: (d: DoctorData) => void
  errors: Record<string, string>
}) {
  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-success-400 to-success-600 flex items-center justify-center shadow-healthcare">
          <Stethoscope className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-surface-900">Add Your First Doctor</h2>
        <p className="text-[13px] text-surface-500 mt-1">Set up the primary doctor for your clinic</p>
      </div>

      <div>
        <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Doctor Name *</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder="e.g. Dr. Name"
          className={`w-full px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400 ${errors.name ? 'border-danger-300' : 'border-surface-200'}`}
        />
        {errors.name && <p className="text-[11px] text-danger-600 mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Specialty</label>
        <input
          type="text"
          value={data.specialty}
          onChange={(e) => onChange({ ...data, specialty: e.target.value })}
          placeholder="e.g. General Practice, Pediatrics"
          className="w-full px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Phone *</label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => onChange({ ...data, phone: e.target.value })}
            placeholder="+91 98000 00101"
            className={`w-full px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400 ${errors.phone ? 'border-danger-300' : 'border-surface-200'}`}
          />
          {errors.phone && <p className="text-[11px] text-danger-600 mt-1">{errors.phone}</p>}
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Email</label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => onChange({ ...data, email: e.target.value })}
            placeholder="doctor@example.com"
            className="w-full px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400"
          />
        </div>
      </div>
    </div>
  )
}

interface ReceptionistData {
  name: string
  phone: string
}

function StepReceptionistSetup({
  data,
  onChange,
  errors,
}: {
  data: ReceptionistData
  onChange: (d: ReceptionistData) => void
  errors: Record<string, string>
}) {
  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-healthcare">
          <UserPlus className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-surface-900">Add First Receptionist</h2>
        <p className="text-[13px] text-surface-500 mt-1">Set up your front desk staff</p>
      </div>

      <div>
        <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Receptionist Name *</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder="e.g. Ramesh Kumar"
          className={`w-full px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400 ${errors.name ? 'border-danger-300' : 'border-surface-200'}`}
        />
        {errors.name && <p className="text-[11px] text-danger-600 mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Phone *</label>
        <input
          type="tel"
          value={data.phone}
          onChange={(e) => onChange({ ...data, phone: e.target.value })}
          placeholder="+91 98000 00201"
          className={`w-full px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400 ${errors.phone ? 'border-danger-300' : 'border-surface-200'}`}
        />
        {errors.phone && <p className="text-[11px] text-danger-600 mt-1">{errors.phone}</p>}
      </div>
    </div>
  )
}

function StepAddonSelection({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-info-400 to-info-600 flex items-center justify-center shadow-healthcare">
          <Puzzle className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-surface-900">Choose Your Modules</h2>
        <p className="text-[13px] text-surface-500 mt-1">Select the add-ons you need. You can change these later.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {addonOptions.map((addon) => {
          const active = selected.includes(addon.id)
          return (
            <button
              key={addon.id}
              type="button"
              onClick={() => onToggle(addon.id)}
              className={`relative text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
                active
                  ? 'border-primary-400 bg-primary-50 ring-1 ring-primary-200 shadow-healthcare'
                  : 'border-surface-200 bg-white hover:border-surface-300 hover:shadow-sm'
              }`}
            >
              {active && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${active ? 'bg-primary-100' : 'bg-surface-100'}`}>
                <addon.icon className={`w-4.5 h-4.5 ${active ? 'text-primary-600' : 'text-surface-400'}`} />
              </div>
              <h3 className={`text-[13px] font-semibold ${active ? 'text-primary-800' : 'text-surface-800'}`}>{addon.name}</h3>
              <p className="text-[11px] text-surface-500 mt-0.5 leading-relaxed">{addon.desc}</p>
              <p className={`text-[12px] font-semibold mt-2 ${active ? 'text-primary-600' : 'text-surface-600'}`}>{addon.price}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StepComplete({ onGoDashboard }: { onGoDashboard: () => void }) {
  const navigate = useNavigate()

  return (
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-success-400 to-success-600 flex items-center justify-center shadow-healthcare-lg">
        <CheckCircle2 className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-3xl font-bold text-surface-900 mb-3">Your Clinic is Ready!</h2>
      <p className="text-[15px] text-surface-500 max-w-md mx-auto leading-relaxed">
        All set! You can start using Jioplix Clinic OS right away.
      </p>

      <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm mx-auto">
        <button
          type="button"
          onClick={onGoDashboard}
          className="p-4 rounded-2xl bg-white border border-surface-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all group cursor-pointer"
        >
          <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center transition-colors">
            <Stethoscope className="w-5 h-5 text-primary-600" />
          </div>
          <p className="text-[12px] font-semibold text-surface-700 group-hover:text-primary-700">Dashboard</p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/patients')}
          className="p-4 rounded-2xl bg-white border border-surface-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all group cursor-pointer"
        >
          <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-accent-50 group-hover:bg-accent-100 flex items-center justify-center transition-colors">
            <Users className="w-5 h-5 text-accent-600" />
          </div>
          <p className="text-[12px] font-semibold text-surface-700 group-hover:text-accent-700">Add Patient</p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/appointments')}
          className="p-4 rounded-2xl bg-white border border-surface-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all group cursor-pointer"
        >
          <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-info-50 group-hover:bg-info-100 flex items-center justify-center transition-colors">
            <UserPlus className="w-5 h-5 text-info-600" />
          </div>
          <p className="text-[12px] font-semibold text-surface-700 group-hover:text-info-700">Book Appointment</p>
        </button>
      </div>
    </div>
  )
}

export default function OnboardingWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const [clinicProfile, setClinicProfile] = useState<ClinicProfileData>({
    clinicName: '',
    clinicType: '',
    address: '',
    phone: '',
    email: '',
  })
  const [doctor, setDoctor] = useState<DoctorData>({
    name: '',
    specialty: '',
    phone: '',
    email: '',
  })
  const [receptionist, setReceptionist] = useState<ReceptionistData>({
    name: '',
    phone: '',
  })
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])

  const [clinicErrors, setClinicErrors] = useState<Record<string, string>>({})
  const [doctorErrors, setDoctorErrors] = useState<Record<string, string>>({})
  const [receptionistErrors, setReceptionistErrors] = useState<Record<string, string>>({})

  function validateStep(s: number): boolean {
    if (s === 1) {
      const errs: Record<string, string> = {}
      if (!clinicProfile.clinicName.trim()) errs.clinicName = 'Clinic name is required'
      if (!clinicProfile.clinicType) errs.clinicType = 'Clinic type is required'
      if (!clinicProfile.phone.trim()) errs.phone = 'Phone is required'
      if (!clinicProfile.email.trim()) errs.email = 'Email is required'
      setClinicErrors(errs)
      return Object.keys(errs).length === 0
    }
    if (s === 2) {
      const errs: Record<string, string> = {}
      if (!doctor.name.trim()) errs.name = 'Doctor name is required'
      if (!doctor.phone.trim()) errs.phone = 'Phone is required'
      setDoctorErrors(errs)
      return Object.keys(errs).length === 0
    }
    if (s === 3) {
      const errs: Record<string, string> = {}
      if (!receptionist.name.trim()) errs.name = 'Receptionist name is required'
      if (!receptionist.phone.trim()) errs.phone = 'Phone is required'
      setReceptionistErrors(errs)
      return Object.keys(errs).length === 0
    }
    return true
  }

  function goNext() {
    if (!validateStep(step)) return
    if (step === TOTAL_STEPS - 2) {
      setSubmitting(true)
      const payload = {
        clinicProfile,
        doctor,
        receptionist,
        addons: selectedAddons,
      }
      fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {}).finally(() => {
        localStorage.setItem('jioplix.onboarding.completed', 'true')
        setSubmitting(false)
        setStep((s) => s + 1)
      })
      return
    }
    setStep((s) => s + 1)
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1))
  }

  function toggleAddon(id: string) {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  function handleGoDashboard() {
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="fixed inset-0 z-[100] bg-surface-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-surface-200 shadow-healthcare-lg p-8 sm:p-10 my-8">
        <ProgressIndicator current={step} total={TOTAL_STEPS} />

        {step === 0 && <StepWelcome />}
        {step === 1 && (
          <StepClinicProfile data={clinicProfile} onChange={setClinicProfile} errors={clinicErrors} />
        )}
        {step === 2 && (
          <StepDoctorSetup data={doctor} onChange={setDoctor} errors={doctorErrors} />
        )}
        {step === 3 && (
          <StepReceptionistSetup data={receptionist} onChange={setReceptionist} errors={receptionistErrors} />
        )}
        {step === 4 && (
          <StepAddonSelection selected={selectedAddons} onToggle={toggleAddon} />
        )}
        {step === 5 && (
          <StepComplete onGoDashboard={handleGoDashboard} />
        )}

        {step < TOTAL_STEPS - 1 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-surface-100">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-surface-600 border border-surface-200 hover:bg-surface-50 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-[13px] font-semibold hover:bg-primary-700 shadow-healthcare transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {step === TOTAL_STEPS - 2 ? 'Complete Setup' : 'Next'}
              {!submitting && step !== TOTAL_STEPS - 2 && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
