import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, Calendar, Stethoscope, CreditCard, MessageSquare, BarChart3,
  Pill, FlaskConical, Warehouse, Bandage, ShieldCheck, FileText,
  Sparkles, Lock, Check, Building2, Baby, ScanFace, HeartHandshake,
  Fingerprint, Mic, Bot, TrendingUp, Puzzle, Zap, AlertCircle, Loader2,
  ShieldAlert,
} from 'lucide-react'
import { PageHeader } from '../components/ui'
import { useAuth } from '../auth/useAuth'
import {
  getAddonEntitlements,
  updateAddonEntitlement,
  getCurrentSubscription,
  type TenantSubscription,
} from '../lib/api'

interface ModuleDef {
  key: string
  name: string
  desc: string
  icon: typeof Pill
  price?: string
  core?: boolean
  badge?: string
  defaultEnabled?: boolean
}

const coreModules: ModuleDef[] = [
  { key: 'patients', name: 'Patient Management', desc: 'Registration, ABHA ID, longitudinal records & timeline', icon: Users, core: true },
  { key: 'appointments', name: 'Appointments & Queue', desc: 'Doctor calendar, tokens, check-in, waiting time', icon: Calendar, core: true },
  { key: 'emr', name: 'Clinical EMR', desc: 'Consultation workflow, vitals, diagnosis, clinical notes', icon: Stethoscope, core: true },
  { key: 'prescriptions', name: 'e-Prescription', desc: 'Digital prescriptions with drug interactions', icon: FileText, core: true },
  { key: 'billing', name: 'Billing & Payments', desc: 'GST invoices, UPI / cash / card, outstanding tracking', icon: CreditCard, core: true },
  { key: 'crm', name: 'Patient CRM', desc: 'Follow-ups, reminders & patient engagement', icon: MessageSquare, core: true },
  { key: 'analytics', name: 'Basic Analytics', desc: 'Revenue, footfall, no-shows and doctor utilization', icon: BarChart3, core: true },
  { key: 'abdm', name: 'ABDM / ABHA', desc: 'Linking, consent & compliant record sharing', icon: ShieldCheck, core: true, badge: 'India-first' },
]

const operationalAddons: ModuleDef[] = [
  { key: 'pharmacy', name: 'Pharmacy', desc: 'In-house dispensing counter with prescription queue', icon: Pill, price: '₹999/mo', defaultEnabled: true },
  { key: 'laboratory', name: 'Laboratory', desc: 'In-house or external lab — orders to reviewed reports', icon: FlaskConical, price: '₹1,499/mo', defaultEnabled: true },
  { key: 'inventory', name: 'Inventory', desc: 'Shared stock engine for medicines, consumables & reagents', icon: Warehouse, price: '₹499/mo', defaultEnabled: true },
  { key: 'procedures', name: 'Procedures', desc: 'Record procedures, consume stock, bill automatically', icon: Bandage, price: '₹499/mo', defaultEnabled: true },
  { key: 'billing_advanced', name: 'Advanced Billing', desc: 'Memberships, health packages & TPA support', icon: CreditCard, price: '₹799/mo' },
  { key: 'multi_branch', name: 'Multi-Branch', desc: 'Central admin, cross-branch history & consolidated reports', icon: Building2, price: '₹1,999/mo' },
]

const specialtyPacks: ModuleDef[] = [
  { key: 'dental', name: 'Dental', desc: 'FDI tooth chart, treatment plans & X-ray attachments', icon: ScanFace, price: '₹499/mo' },
  { key: 'pediatric', name: 'Pediatrics', desc: 'Growth charts, vaccination schedule & milestones', icon: Baby, price: '₹499/mo' },
  { key: 'dermatology', name: 'Dermatology', desc: 'Clinical images, lesion tracking & treatment timeline', icon: Fingerprint, price: '₹499/mo' },
  { key: 'gynecology', name: 'Gynecology', desc: 'Menstrual & obstetric history, ANC tracking, EDD', icon: HeartHandshake, price: '₹499/mo' },
]

const intelligenceAddons: ModuleDef[] = [
  { key: 'ai_scribe', name: 'AI Scribe', desc: 'Dictation → structured SOAP notes for doctor approval', icon: Mic, price: 'Usage-based', defaultEnabled: true, badge: 'Popular' },
  { key: 'ai_copilot', name: 'AI Clinical Copilot', desc: 'Pre-consult summaries & documentation assistance', icon: Sparkles, price: 'Included quota', defaultEnabled: true },
  { key: 'ai_receptionist', name: 'AI Receptionist', desc: 'Handles booking requests, reschedules & FAQs on WhatsApp', icon: Bot, price: '₹1,499/mo' },
  { key: 'ai_analytics', name: 'AI Analytics', desc: '"What happened in my clinic this week?" — instant answers', icon: TrendingUp, price: '₹999/mo' },
]

function Toggle({
  on,
  locked,
  disabled,
  loading,
  onToggle,
}: {
  on: boolean
  locked?: boolean
  disabled?: boolean
  loading?: boolean
  onToggle?: () => void
}) {
  if (locked) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-success-50 border border-success-200">
        <Lock className="w-3 h-3 text-success-600" />
        <span className="text-[11px] font-bold text-success-700">Included</span>
      </div>
    )
  }

  if (loading) {
    return <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
  }

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      title={disabled ? 'Tenant Admin privileges required' : undefined}
      className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${
        on ? 'bg-primary-500' : 'bg-surface-200'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      role="switch"
      aria-checked={on}
    >
      <span
        className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
          on ? 'left-[21px]' : 'left-[3px]'
        }`}
      />
    </button>
  )
}

export default function Addons() {
  const { user } = useAuth()
  const isTenantAdmin = Boolean(
    user?.roles?.includes('tenant_admin') || user?.permissions?.includes('*'),
  )

  const [entitlements, setEntitlements] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [updatingKey, setUpdatingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [addonsData, subData] = await Promise.allSettled([
        getAddonEntitlements(),
        getCurrentSubscription(),
      ])

      if (addonsData.status === 'fulfilled' && Array.isArray(addonsData.value)) {
        const entMap: Record<string, boolean> = {}
        for (const item of addonsData.value) {
          entMap[item.moduleCode] = item.enabled
        }
        setEntitlements(entMap)
      }

      if (subData.status === 'fulfilled') {
        setSubscription(subData.value)
      }
    } catch {
      // Use fallback defaults
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle(m: ModuleDef) {
    if (!isTenantAdmin || updatingKey || m.core) return
    const currentStatus = entitlements[m.key] ?? !!m.defaultEnabled
    const newStatus = !currentStatus

    // Optimistic update
    setEntitlements((prev) => ({ ...prev, [m.key]: newStatus }))
    setUpdatingKey(m.key)
    setError(null)

    try {
      await updateAddonEntitlement(m.key, newStatus)
    } catch (err: any) {
      // Revert optimistic update
      setEntitlements((prev) => ({ ...prev, [m.key]: currentStatus }))
      setError(
        err?.message ||
          'Failed to update add-on. Make sure you are signed in as Clinic Administrator.',
      )
    } finally {
      setUpdatingKey(null)
    }
  }

  function renderCard(m: ModuleDef) {
    const on = m.core ? true : (entitlements[m.key] ?? !!m.defaultEnabled)
    const isUpdating = updatingKey === m.key

    return (
      <div
        key={m.key}
        className={`bg-white rounded-2xl p-5 border shadow-healthcare hover:shadow-healthcare-lg transition-all duration-200 ${
          on ? 'border-primary-200 ring-1 ring-primary-100' : 'border-surface-100'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              m.core || on ? 'bg-primary-50' : 'bg-surface-100'
            }`}
          >
            <m.icon
              className={`w-5 h-5 ${m.core || on ? 'text-primary-600' : 'text-surface-400'}`}
            />
          </div>
          <Toggle
            on={on}
            locked={m.core}
            disabled={!isTenantAdmin}
            loading={isUpdating}
            onToggle={() => handleToggle(m)}
          />
        </div>
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-semibold text-surface-800">{m.name}</h3>
          {m.badge && (
            <span className="px-1.5 py-0.5 rounded-md bg-accent-50 text-accent-600 text-[9px] font-bold uppercase tracking-wider border border-accent-100">
              {m.badge}
            </span>
          )}
        </div>
        <p className="text-[12px] text-surface-500 mt-1 leading-relaxed min-h-[32px]">{m.desc}</p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-100">
          <span
            className={`text-[12px] font-semibold ${
              m.core ? 'text-success-600' : 'text-surface-700'
            }`}
          >
            {m.core ? 'In every plan' : m.price}
          </span>
          {!m.core && (
            <span
              className={`text-[11px] font-medium flex items-center gap-1 ${
                on ? 'text-primary-600' : 'text-surface-400'
              }`}
            >
              {on && <Check className="w-3.5 h-3.5" />} {on ? 'Active' : 'Inactive'}
            </span>
          )}
        </div>
      </div>
    )
  }

  const planName = (subscription?.planCode || 'Professional').toUpperCase()
  const planStatus = subscription?.status || 'active'
  const isTrial = planStatus === 'trialing'

  return (
    <div className="space-y-8 max-w-6xl pb-12">
      <PageHeader
        icon={Puzzle}
        title="Plans & Add-ons"
        subtitle="Configure clinic modules and add-ons. Only Clinic Administrators can activate or modify features."
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-200/50">
              <Zap className="w-4 h-4 text-primary-600" />
              <span className="text-[13px] font-semibold text-primary-800">
                Plan: {planName} {isTrial ? '· 14-Day Trial' : ''}
              </span>
            </div>
            <Link
              to="/plans"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-[13px] font-semibold shadow-healthcare transition-all"
            >
              <CreditCard className="w-4 h-4" /> Manage Billing & Razorpay
            </Link>
          </div>
        }
      />

      {/* Permission alert for non-admins */}
      {!isTenantAdmin && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-[13px]">
            <span className="font-bold">View Only Mode:</span> You are viewing the clinic's add-on
            configuration. Only team members with the <span className="font-mono font-semibold">Tenant Admin</span> role can toggle or configure active modules.
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-danger-50 border border-danger-200 text-danger-700 text-[13px] font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-danger-600" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-surface-500">
          <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
          <span className="text-[13px] font-medium">Loading entitlements...</span>
        </div>
      ) : (
        <>
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4.5 h-4.5 text-primary-600" />
              <h2 className="text-[15px] font-semibold text-surface-800">Core Platform</h2>
              <span className="text-[12px] text-surface-400">— included in every subscription</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {coreModules.map(renderCard)}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Warehouse className="w-4.5 h-4.5 text-accent-600" />
              <h2 className="text-[15px] font-semibold text-surface-800">Operational Add-ons</h2>
              <span className="text-[12px] text-surface-400">— managed by Clinic Admin</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {operationalAddons.map(renderCard)}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope className="w-4.5 h-4.5 text-info-600" />
              <h2 className="text-[15px] font-semibold text-surface-800">Specialty Packs</h2>
              <span className="text-[12px] text-surface-400">
                — specialty EMR templates tailored to your clinical department
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {specialtyPacks.map(renderCard)}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4.5 h-4.5 text-primary-600" />
              <h2 className="text-[15px] font-semibold text-surface-800">Jioplix Intelligence</h2>
              <span className="text-[12px] text-surface-400">— AI clinical and operational tools</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {intelligenceAddons.map(renderCard)}
            </div>
          </section>

          <div className="rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-accent-700 p-6 text-white shadow-healthcare-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="max-w-xl">
              <h3 className="text-[16px] font-bold">Have billing or custom feature questions?</h3>
              <p className="text-[13px] text-white/85 mt-1">
                Renew subscriptions, pay invoices with Razorpay, or upgrade your plan anytime in the Billing & Subscription portal.
              </p>
            </div>
            <Link
              to="/plans"
              className="px-5 py-2.5 rounded-xl bg-white text-primary-700 text-[13px] font-bold hover:bg-primary-50 transition-colors whitespace-nowrap self-start md:self-auto inline-flex items-center gap-2 shadow-sm"
            >
              <CreditCard className="w-4 h-4 text-primary-600" /> Go to Billing & Payments
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
