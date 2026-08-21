import { useState } from 'react'
import {
  Stethoscope, User, ClipboardList, Pill, FileText,
  ArrowRight, CheckCircle2, Sparkles, AlertTriangle,
  Plus, Activity, Clock,
} from 'lucide-react'
import { PageHeader, Button } from '../components/ui'

const workflowSteps = [
  { label: 'Patient', icon: User, completed: true },
  { label: 'History', icon: ClipboardList, completed: true },
  { label: 'Vitals', icon: Activity, completed: true },
  { label: 'AI Summary', icon: Sparkles, completed: true },
  { label: 'Consultation', icon: Stethoscope, completed: false, active: true },
  { label: 'Diagnosis', icon: FileText, completed: false },
  { label: 'Prescription', icon: Pill, completed: false },
  { label: 'Billing', icon: CheckCircle2, completed: false },
]

const patientInfo = {
  name: 'Rajesh Kumar', id: 'P-1002', age: 45, gender: 'Male',
  conditions: ['Diabetes Type 2', 'Hypertension'],
  allergies: ['Aspirin'],
  doctor: 'Dr. Priya',
}

const vitals = {
  bp: '138/88 mmHg', pulse: '76 bpm', temp: '98.2°F', spo2: '98%',
  weight: '78 kg', height: '172 cm', bmi: '26.4',
}

const previousConsultations = [
  { date: '18 Aug 2026', complaint: 'Increased thirst and fatigue', diagnosis: 'Uncontrolled diabetes', rx: 'Metformin 500mg' },
  { date: '18 Jul 2026', complaint: 'Routine follow-up', diagnosis: 'Diabetes well controlled', rx: 'Continue same medication' },
]

const diagnosisOptions = [
  { code: 'E11.9', name: 'Type 2 Diabetes Mellitus', type: 'Chronic' },
  { code: 'I10', name: 'Essential Hypertension', type: 'Chronic' },
  { code: 'R51.9', name: 'Headache', type: 'Acute' },
]

export default function Consultation() {
  const [, setActiveStep] = useState(4)
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [examination, setExamination] = useState('')
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string[]>(['E11.9', 'I10'])

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Stethoscope}
        title="Clinical Consultation"
        subtitle="EMR workspace for active consultation"
        actions={
          <>
            <Button variant="secondary">
              <FileText className="w-4 h-4" /> Save Draft
            </Button>
            <Button>
              <CheckCircle2 className="w-4 h-4" /> Complete Consultation
            </Button>
          </>
        }
      />

      {/* Workflow Steps */}
      <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-4 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {workflowSteps.map((step, i) => (
            <div key={step.label} className="flex items-center">
              <button
                onClick={() => setActiveStep(i)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-medium transition-all whitespace-nowrap ${
                  step.active
                    ? 'bg-primary-500 text-white shadow-healthcare'
                    : step.completed
                    ? 'bg-success-50 text-success-700 border border-success-200'
                    : 'bg-surface-50 text-surface-500 border border-surface-200 hover:bg-surface-100'
                }`}
              >
                {step.completed ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <step.icon className="w-4 h-4" />
                )}
                {step.label}
              </button>
              {i < workflowSteps.length - 1 && (
                <ArrowRight className="w-4 h-4 text-surface-300 mx-1 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left - Patient Info + AI */}
        <div className="space-y-6">
          {/* Patient Card */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white text-[13px] font-bold shadow-sm">RK</div>
              <div>
                <h3 className="text-[14px] font-semibold text-surface-800">{patientInfo.name}</h3>
                <p className="text-[12px] text-surface-400">{patientInfo.id} · {patientInfo.age}{patientInfo.gender[0]}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-danger-500" />
                <span className="text-[12px] text-danger-600 font-medium">Allergies: {patientInfo.allergies.join(', ')}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {patientInfo.conditions.map(c => (
                  <span key={c} className="px-2 py-0.5 rounded-md bg-warning-50 text-warning-600 text-[11px] font-medium border border-warning-100">{c}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Vitals */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
            <h3 className="text-[14px] font-semibold text-surface-800 mb-4">Vitals</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(vitals).map(([key, value]) => (
                <div key={key} className="bg-surface-50 rounded-xl p-3">
                  <p className="text-[11px] text-surface-400 uppercase tracking-wider">{key}</p>
                  <p className="text-[14px] font-bold text-surface-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Pre-Consult */}
          <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600 rounded-2xl p-5 text-white shadow-healthcare-lg">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-[14px] font-semibold">AI Pre-Consult Summary</h3>
            </div>
            <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
              <p className="text-[12px] leading-relaxed text-white/90">
                45M | Diabetes Type 2 + Hypertension | Last visit 3 days ago | HbA1c 7.2% (borderline) | Currently on Metformin 500mg + Amlodipine 5mg | Aspirin allergy | Today reports increased thirst and fatigue
              </p>
            </div>
            <div className="mt-3 space-y-2">
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <p className="text-[11px] text-primary-200 font-medium mb-1">Suggested: Check blood glucose, adjust medication if needed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Center - Consultation Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chief Complaint */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
            <label className="text-[13px] font-semibold text-surface-700 block mb-2">Chief Complaint</label>
            <textarea
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="Patient presents with increased thirst, frequent urination, and fatigue for the past week..."
              className="w-full px-4 py-3 text-[13px] bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 resize-none h-24 transition-all placeholder:text-surface-400"
            />
            <button className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-600 text-[12px] font-medium hover:bg-primary-100 transition-colors">
              <Sparkles className="w-3.5 h-3.5" /> AI Scribe - Dictate
            </button>
          </div>

          {/* Examination Notes */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
            <label className="text-[13px] font-semibold text-surface-700 block mb-2">Examination Notes</label>
            <textarea
              value={examination}
              onChange={(e) => setExamination(e.target.value)}
              placeholder="General: Alert, oriented. BMI elevated. Skin: No acanthosis. Fundoscopy: Normal..."
              className="w-full px-4 py-3 text-[13px] bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 resize-none h-24 transition-all placeholder:text-surface-400"
            />
          </div>

          {/* Diagnosis */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
            <label className="text-[13px] font-semibold text-surface-700 block mb-3">Diagnosis</label>
            <div className="space-y-2">
              {diagnosisOptions.map(d => (
                <label key={d.code} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedDiagnosis.includes(d.code)
                    ? 'bg-primary-50 border-primary-200'
                    : 'bg-surface-50 border-surface-200 hover:bg-surface-100'
                }`}>
                  <input
                    type="checkbox"
                    checked={selectedDiagnosis.includes(d.code)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedDiagnosis([...selectedDiagnosis, d.code])
                      else setSelectedDiagnosis(selectedDiagnosis.filter(c => c !== d.code))
                    }}
                    className="w-4 h-4 rounded border-surface-300 text-primary-500 focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-surface-800">{d.name}</p>
                    <p className="text-[11px] text-surface-400">ICD-10: {d.code}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                    d.type === 'Chronic' ? 'bg-warning-50 text-warning-600' : 'bg-info-50 text-info-600'
                  }`}>
                    {d.type}
                  </span>
                </label>
              ))}
            </div>
            <button className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 text-surface-600 text-[12px] font-medium hover:bg-surface-200 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Diagnosis
            </button>
          </div>

          {/* Previous Consultations */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
            <h3 className="text-[14px] font-semibold text-surface-800 mb-4">Previous Consultations</h3>
            <div className="space-y-3">
              {previousConsultations.map((c, i) => (
                <div key={i} className="p-3 rounded-xl bg-surface-50 border border-surface-100">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-surface-400" />
                    <span className="text-[12px] font-medium text-surface-700">{c.date}</span>
                  </div>
                  <p className="text-[12px] text-surface-600"><strong>Complaint:</strong> {c.complaint}</p>
                  <p className="text-[12px] text-surface-600"><strong>Diagnosis:</strong> {c.diagnosis}</p>
                  <p className="text-[12px] text-surface-600"><strong>Rx:</strong> {c.rx}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
