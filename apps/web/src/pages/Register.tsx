import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle, ArrowLeft, Building2, Check, CheckCircle2, ChevronRight,
  ClipboardPlus, Loader2, Lock, Mail, Phone, Pill, ShieldCheck,
  Stethoscope, User,
} from 'lucide-react'
import { registerClinic, listPlans, type PlanOption } from '../lib/api'
import { RAZORPAY_PAYMENT_LINK } from '../lib/api'
import BrandLogo from '../components/BrandLogo'

type Step = 'clinic' | 'admin' | 'plan' | 'success'
type ClinicType = 'general' | 'dental' | 'pediatric' | 'dermatology' | 'gynecology'

const clinicTypes: Array<{ value: ClinicType; label: string; icon: typeof Stethoscope }> = [
  { value: 'general', label: 'General Practice', icon: Stethoscope },
  { value: 'dental', label: 'Dental', icon: ClipboardPlus },
  { value: 'pediatric', label: 'Pediatrics', icon: Pill },
  { value: 'dermatology', label: 'Dermatology', icon: ShieldCheck },
  { value: 'gynecology', label: 'Gynecology', icon: ShieldCheck },
]

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function formatPrice(paise: number): string {
  if (paise === 0) return 'Custom'
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

export default function Register() {
  const [step, setStep] = useState<Step>('clinic')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Clinic fields
  const [clinicName, setClinicName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [clinicType, setClinicType] = useState<ClinicType>('general')

  // Admin fields
  const [adminName, setAdminName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Plan
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [selectedPlan, setSelectedPlan] = useState('professional')

  // Success
  const [result, setResult] = useState<{ slug: string; email: string; password: string } | null>(null)

  // Auto-slugify clinic name
  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(slugify(clinicName))
    }
  }, [clinicName, slugManuallyEdited])

  // Load plans
  useEffect(() => {
    listPlans().then(setPlans).catch(() => {})
  }, [])

  function handleClinicNext(e: FormEvent) {
    e.preventDefault()
    if (!clinicName.trim() || !slug.trim()) {
      setError('Clinic name and slug are required.')
      return
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError('Clinic ID must be lowercase letters, numbers, and hyphens only.')
      return
    }
    setError(null)
    setStep('admin')
  }

  function handleAdminNext(e: FormEvent) {
    e.preventDefault()
    if (!adminName.trim() || !phone.trim() || !email.trim() || !password) {
      setError('All fields are required.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setError(null)
    setStep('plan')
  }

  async function handleRegister() {
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const res = await registerClinic({
        clinicName: clinicName.trim(),
        slug: slug.trim().toLowerCase(),
        clinicType,
        planCode: selectedPlan,
        adminName: adminName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
      })
      setResult({ slug: res.slug, email: email.trim(), password })
      setStep('success')
    } catch (err: any) {
      const code = err?.code ?? err?.message ?? 'UNKNOWN'
      if (code === 'SLUG_TAKEN') setError('This Clinic ID is already taken. Please choose another.')
      else if (code === 'EMAIL_TAKEN') setError('This email is already registered.')
      else setError(`Registration failed (${code}). Please try again.`)
    } finally {
      setSubmitting(false)
    }
  }

  const steps: Array<{ key: Step; label: string }> = [
    { key: 'clinic', label: 'Clinic' },
    { key: 'admin', label: 'Admin' },
    { key: 'plan', label: 'Plan' },
  ]

  return (
    <div className="min-h-screen flex bg-surface-50">
      {/* Left Panel — Brand */}
      <div className="hidden lg:flex w-[45%] relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-accent-700 flex-col justify-between p-12 text-white">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 -left-20 w-80 h-80 rounded-full bg-accent-400/20 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        <div className="relative z-10">
          <BrandLogo variant="on-dark" size="3xl" />
        </div>
        <div className="relative z-10 max-w-lg my-auto py-8">
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
            Set up your clinic in minutes.
          </h1>
          <p className="mt-4 text-[16px] text-white/90 leading-relaxed">
            Get a 14-day free trial with full access to your chosen plan. No credit card required to start.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-[12px] text-white/80 pt-6 border-t border-white/15">
          <ShieldCheck className="w-4 h-4 text-accent-300" />
          <span>ABDM-ready · HIPAA compliant · Data isolated per clinic</span>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-lg">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-6">
            <BrandLogo variant="pure" size="2xl" />
          </div>

          {/* Step Indicator */}
          {step !== 'success' && (
            <div className="flex items-center gap-2 mb-6">
              {steps.map((s, i) => (
                <div key={s.key} className="flex items-center gap-2">
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold transition-colors ${
                    step === s.key
                      ? 'bg-primary-600 text-white'
                      : steps.findIndex((x) => x.key === step) > i
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-surface-100 text-surface-400'
                  }`}>
                    {steps.findIndex((x) => x.key === step) > i ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className={`text-[12px] font-semibold ${
                    step === s.key ? 'text-surface-900' : 'text-surface-400'
                  }`}>{s.label}</span>
                  {i < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-surface-300" />}
                </div>
              ))}
            </div>
          )}

          {/* ─── Step 1: Clinic Details ─── */}
          {step === 'clinic' && (
            <form onSubmit={handleClinicNext} className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-surface-900 tracking-tight">Clinic details</h2>
                <p className="text-[13px] text-surface-500 mt-1">Tell us about your clinic to get started.</p>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Clinic name</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="e.g. Nova Children's Clinic"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Clinic ID (login slug)</label>
                <input
                  type="text"
                  placeholder="e.g. nova-childrens"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugManuallyEdited(true) }}
                  required
                  pattern="^[a-z0-9-]+$"
                  className="w-full px-3.5 py-2.5 text-[13px] font-mono font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400"
                />
                <p className="text-[11px] text-surface-400 mt-1">Lowercase letters, numbers, and hyphens only. This is how you'll log in.</p>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Clinic type</label>
                <div className="grid grid-cols-2 gap-2">
                  {clinicTypes.map((ct) => (
                    <button
                      key={ct.value}
                      type="button"
                      onClick={() => setClinicType(ct.value)}
                      className={`p-2.5 rounded-xl border text-left text-[12px] font-semibold transition-all cursor-pointer ${
                        clinicType === ct.value
                          ? 'bg-primary-50 border-primary-300 text-primary-700'
                          : 'bg-surface-50 border-surface-200 text-surface-600 hover:border-surface-300'
                      }`}
                    >
                      {ct.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-xl bg-danger-50 border border-danger-200">
                  <AlertCircle className="w-4 h-4 text-danger-600 mt-0.5 shrink-0" />
                  <p className="text-[12px] font-medium text-danger-700 leading-relaxed">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!clinicName.trim() || !slug.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-[13px] font-semibold py-3 shadow-healthcare transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* ─── Step 2: Admin Details ─── */}
          {step === 'admin' && (
            <form onSubmit={handleAdminNext} className="space-y-4">
              <div>
                <button type="button" onClick={() => setStep('clinic')} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-surface-500 hover:text-primary-600 transition-colors mb-3">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <h2 className="text-2xl font-bold text-surface-900 tracking-tight">Admin account</h2>
                <p className="text-[13px] text-surface-500 mt-1">Create the primary admin account for this clinic.</p>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Full name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
                  <input type="text" placeholder="Full name" value={adminName} onChange={(e) => setAdminName(e.target.value)} required
                    className="w-full pl-10 pr-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400" />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Phone number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
                  <input type="tel" placeholder="+91 98000 00101" value={phone} onChange={(e) => setPhone(e.target.value)} required
                    className="w-full pl-10 pr-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400" />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
                  <input type="email" placeholder="admin@novaclinic.com" value={email} onChange={(e) => setEmail(e.target.value)} required
                    className="w-full pl-10 pr-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400" />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
                  <input type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                    className="w-full pl-10 pr-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400" />
                </div>
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-xl bg-danger-50 border border-danger-200">
                  <AlertCircle className="w-4 h-4 text-danger-600 mt-0.5 shrink-0" />
                  <p className="text-[12px] font-medium text-danger-700 leading-relaxed">{error}</p>
                </div>
              )}

              <button type="submit" disabled={!adminName.trim() || !phone.trim() || !email.trim() || !password}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-[13px] font-semibold py-3 shadow-healthcare transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* ─── Step 3: Plan Selection ─── */}
          {step === 'plan' && (
            <div className="space-y-4">
              <div>
                <button type="button" onClick={() => setStep('admin')} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-surface-500 hover:text-primary-600 transition-colors mb-3">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <h2 className="text-2xl font-bold text-surface-900 tracking-tight">Choose your plan</h2>
                <p className="text-[13px] text-surface-500 mt-1">Start with a 14-day free trial. No credit card required.</p>
              </div>

              <div className="space-y-3">
                {plans.filter((p) => p.code !== 'enterprise').map((plan) => (
                  <button
                    key={plan.code}
                    type="button"
                    onClick={() => setSelectedPlan(plan.code)}
                    className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedPlan === plan.code
                        ? 'bg-primary-50 border-primary-300 ring-2 ring-primary-500/20'
                        : 'bg-white border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-bold text-surface-900">{plan.name}</span>
                          {plan.code === 'professional' && (
                            <span className="text-[10px] font-bold text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full">Popular</span>
                          )}
                        </div>
                        <span className="text-[12px] text-surface-500">
                          {formatPrice(plan.monthlyPricePaise)}/month
                          {plan.monthlyPricePaise > 0 && ' · 14-day free trial'}
                        </span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedPlan === plan.code ? 'border-primary-600 bg-primary-600' : 'border-surface-300'
                      }`}>
                        {selectedPlan === plan.code && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    {plan.addons.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {plan.addons.map((a) => (
                          <span key={a} className="text-[10px] font-medium text-surface-500 bg-surface-100 px-2 py-0.5 rounded-full capitalize">{a}</span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-xl bg-danger-50 border border-danger-200">
                  <AlertCircle className="w-4 h-4 text-danger-600 mt-0.5 shrink-0" />
                  <p className="text-[12px] font-medium text-danger-700 leading-relaxed">{error}</p>
                </div>
              )}

              <button onClick={handleRegister} disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-[13px] font-semibold py-3 shadow-healthcare transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Creating your clinic...' : 'Start free trial'}
              </button>

              <p className="text-center text-[11px] text-surface-400">
                By registering you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          )}

          {/* ─── Step 4: Success ─── */}
          {step === 'success' && result && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-success-50 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-success-600" />
                </div>
                <h2 className="text-2xl font-bold text-surface-900 tracking-tight">You're all set!</h2>
                <p className="text-[13px] text-surface-500 mt-1">Your clinic has been created with a 14-day free trial.</p>
              </div>

              <div className="bg-surface-50 rounded-xl border border-surface-200 p-5 space-y-3">
                <h3 className="text-[13px] font-bold text-surface-900">Your login credentials</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-surface-500">Clinic ID</span>
                    <span className="text-[13px] font-mono font-semibold text-surface-900">{result.slug}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-surface-500">Email</span>
                    <span className="text-[13px] font-semibold text-surface-900">{result.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-surface-500">Password</span>
                    <span className="text-[13px] font-mono font-semibold text-surface-900">{result.password}</span>
                  </div>
                </div>
              </div>

              <div className="bg-warning-50 rounded-xl border border-warning-200 p-4">
                <p className="text-[12px] font-medium text-warning-700 leading-relaxed">
                  <strong>Save these credentials.</strong> You'll use them to log in at your clinic's Jioplix portal.
                </p>
              </div>

              <Link
                to="/login"
                state={{ clinic: result.slug }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-[13px] font-semibold py-3 shadow-healthcare transition-all text-center"
              >
                Go to login
              </Link>

              <a
                href={RAZORPAY_PAYMENT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-surface-200 text-[12px] font-semibold text-surface-500 hover:border-primary-200 hover:bg-primary-50/40 py-2.5 transition-all"
              >
                Pay now via Razorpay (after trial)
              </a>
            </div>
          )}

          {/* Footer link */}
          {step !== 'success' && (
            <p className="mt-6 text-center text-[12px] text-surface-400">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">Sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
