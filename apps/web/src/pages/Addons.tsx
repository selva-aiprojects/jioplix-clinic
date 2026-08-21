// TODO: wire to backend addons/plans API when endpoints are available
import { useState } from 'react'
import {
  Users, Calendar, Stethoscope, CreditCard, MessageSquare, BarChart3,
  Pill, FlaskConical, Warehouse, Bandage, ShieldCheck, FileText,
  Sparkles, Lock, Check, Building2, Baby, ScanFace, HeartHandshake,
  Fingerprint, Mic, Bot, TrendingUp, Puzzle, Zap,
} from 'lucide-react'
import { PageHeader } from '../components/ui'

interface Module {
  name: string
  desc: string
  icon: typeof Pill
  price?: string
  enabled?: boolean
  core?: boolean
  badge?: string
}

const coreModules: Module[] = [
  { name: 'Patient Management', desc: 'Registration, ABHA ID, longitudinal records & timeline', icon: Users, core: true },
  { name: 'Appointments & Queue', desc: 'Doctor calendar, tokens, check-in, waiting time', icon: Calendar, core: true },
  { name: 'Clinical EMR', desc: 'Consultation workflow, vitals, diagnosis, clinical notes', icon: Stethoscope, core: true },
  { name: 'e-Prescription', desc: 'Digital prescriptions with drug interactions', icon: FileText, core: true },
  { name: 'Billing & Payments', desc: 'GST invoices, UPI / cash / card, outstanding tracking', icon: CreditCard, core: true },
  { name: 'Patient CRM', desc: 'Follow-ups, reminders & patient engagement', icon: MessageSquare, core: true },
  { name: 'Basic Analytics', desc: 'Revenue, footfall, no-shows and doctor utilization', icon: BarChart3, core: true },
  { name: 'ABDM / ABHA', desc: 'Linking, consent & compliant record sharing', icon: ShieldCheck, core: true, badge: 'India-first' },
]

const operationalAddons: Module[] = [
  { name: 'Pharmacy', desc: 'In-house dispensing counter with prescription queue', icon: Pill, price: '₹999/mo', enabled: true },
  { name: 'Laboratory', desc: 'In-house or external lab — orders to reviewed reports', icon: FlaskConical, price: '₹1,499/mo', enabled: true },
  { name: 'Inventory', desc: 'Shared stock engine for medicines, consumables & reagents', icon: Warehouse, price: '₹499/mo', enabled: true },
  { name: 'Procedures', desc: 'Record procedures, consume stock, bill automatically', icon: Bandage, price: '₹499/mo' },
  { name: 'Advanced Billing', desc: 'Memberships, health packages & TPA support', icon: CreditCard, price: '₹799/mo' },
  { name: 'Multi-Branch', desc: 'Central admin, cross-branch history & consolidated reports', icon: Building2, price: '₹1,999/mo' },
]

const specialtyPacks: Module[] = [
  { name: 'Dental', desc: 'FDI tooth chart, treatment plans & X-ray attachments', icon: ScanFace, price: '₹499/mo' },
  { name: 'Pediatrics', desc: 'Growth charts, vaccination schedule & milestones', icon: Baby, price: '₹499/mo' },
  { name: 'Dermatology', desc: 'Clinical images, lesion tracking & treatment timeline', icon: Fingerprint, price: '₹499/mo' },
  { name: 'Gynecology', desc: 'Menstrual & obstetric history, ANC tracking, EDD', icon: HeartHandshake, price: '₹499/mo' },
]

const intelligenceAddons: Module[] = [
  { name: 'AI Scribe', desc: 'Dictation → structured SOAP notes for doctor approval', icon: Mic, price: 'Usage-based', enabled: true, badge: 'Popular' },
  { name: 'AI Clinical Copilot', desc: 'Pre-consult summaries & documentation assistance', icon: Sparkles, price: 'Included quota', enabled: true },
  { name: 'AI Receptionist', desc: 'Handles booking requests, reschedules & FAQs on WhatsApp', icon: Bot, price: '₹1,499/mo' },
  { name: 'AI Analytics', desc: '"What happened in my clinic this week?" — instant answers', icon: TrendingUp, price: '₹999/mo' },
]

function Toggle({ on, locked, onToggle }: { on: boolean; locked?: boolean; onToggle?: () => void }) {
  if (locked) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-success-50 border border-success-200">
        <Lock className="w-3 h-3 text-success-600" />
        <span className="text-[11px] font-bold text-success-700">Included</span>
      </div>
    )
  }
  return (
    <button
      onClick={onToggle}
      className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${on ? 'bg-primary-500' : 'bg-surface-200'}`}
      role="switch"
      aria-checked={on}
    >
      <span
        className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${on ? 'left-[21px]' : 'left-[3px]'}`}
      />
    </button>
  )
}

function ModuleCard({ m }: { m: Module }) {
  const [on, setOn] = useState(!!m.enabled)
  return (
    <div className={`bg-white rounded-2xl p-5 border shadow-healthcare hover:shadow-healthcare-lg transition-all duration-200 ${
      on ? 'border-primary-200 ring-1 ring-primary-100' : 'border-surface-100'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          m.core ? 'bg-primary-50' : on ? 'bg-primary-50' : 'bg-surface-100'
        }`}>
          <m.icon className={`w-5 h-5 ${m.core || on ? 'text-primary-600' : 'text-surface-400'}`} />
        </div>
        <Toggle on={on} locked={m.core} onToggle={() => setOn(!on)} />
      </div>
      <div className="flex items-center gap-2">
        <h3 className="text-[14px] font-semibold text-surface-800">{m.name}</h3>
        {m.badge && (
          <span className="px-1.5 py-0.5 rounded-md bg-accent-50 text-accent-600 text-[9px] font-bold uppercase tracking-wider border border-accent-100">{m.badge}</span>
        )}
      </div>
      <p className="text-[12px] text-surface-500 mt-1 leading-relaxed min-h-[32px]">{m.desc}</p>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-100">
        <span className={`text-[12px] font-semibold ${m.core ? 'text-success-600' : 'text-surface-700'}`}>
          {m.core ? 'In every plan' : m.price}
        </span>
        {!m.core && (
          <span className={`text-[11px] font-medium flex items-center gap-1 ${on ? 'text-primary-600' : 'text-surface-400'}`}>
            {on && <Check className="w-3.5 h-3.5" />} {on ? 'Active' : 'Inactive'}
          </span>
        )}
      </div>
    </div>
  )
}

export default function Addons() {
  return (
    <div className="space-y-8 max-w-6xl">
      <PageHeader
        icon={Puzzle}
        title="Plans & Add-ons"
        subtitle="Start simple. Add what you need. Grow without changing platforms."
        actions={
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-200/50">
            <Zap className="w-4 h-4 text-primary-600" />
            <span className="text-[13px] font-semibold text-primary-800">Current plan: Professional · ₹1,999/mo</span>
          </div>
        }
      />

      <section>
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4.5 h-4.5 text-primary-600" />
          <h2 className="text-[15px] font-semibold text-surface-800">Core Platform</h2>
          <span className="text-[12px] text-surface-400">— included in every subscription</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {coreModules.map((m) => <ModuleCard key={m.name} m={m} />)}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Warehouse className="w-4.5 h-4.5 text-accent-600" />
          <h2 className="text-[15px] font-semibold text-surface-800">Operational Add-ons</h2>
          <span className="text-[12px] text-surface-400">— enable instantly, billed monthly</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {operationalAddons.map((m) => <ModuleCard key={m.name} m={m} />)}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope className="w-4.5 h-4.5 text-info-600" />
          <h2 className="text-[15px] font-semibold text-surface-800">Specialty Packs</h2>
          <span className="text-[12px] text-surface-400">— specialty EMR templates without rebuilding the platform</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {specialtyPacks.map((m) => <ModuleCard key={m.name} m={m} />)}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4.5 h-4.5 text-primary-600" />
          <h2 className="text-[15px] font-semibold text-surface-800">Jioplix Intelligence</h2>
          <span className="text-[12px] text-surface-400">— AI that works where you work</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {intelligenceAddons.map((m) => <ModuleCard key={m.name} m={m} />)}
        </div>
      </section>

      <div className="rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600 p-6 text-white shadow-healthcare-lg flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <h3 className="text-[16px] font-bold">Need a custom bundle?</h3>
          <p className="text-[13px] text-white/80 mt-1">Clinic chains get volume pricing, dedicated onboarding and a named success manager.</p>
        </div>
        <button className="px-5 py-2.5 rounded-xl bg-white text-primary-700 text-[13px] font-bold hover:bg-primary-50 transition-colors whitespace-nowrap self-start md:self-auto">
          Talk to Sales
        </button>
      </div>
    </div>
  )
}
