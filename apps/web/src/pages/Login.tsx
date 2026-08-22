import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertCircle, Baby, Eye, EyeOff, Fingerprint, HeartHandshake,
  Loader2, Lock, Phone, ScanFace, ShieldCheck, Stethoscope, Users, Pill,
  CheckCircle2,
} from 'lucide-react'
import { ApiError } from '../lib/api'
import { useAuth } from '../auth/useAuth'
import BrandLogo from '../components/BrandLogo'

const specialties = [
  { icon: ScanFace, label: 'Dental' },
  { icon: Baby, label: 'Pediatrics' },
  { icon: Fingerprint, label: 'Dermatology' },
  { icon: HeartHandshake, label: 'Gynecology' },
]

const demoAccounts = [
  { label: 'Doctor', name: 'Dr. Priya', role: 'Consultant', phone: '+919800000101', icon: Stethoscope, color: 'text-primary-600 bg-primary-50 border-primary-100' },
  { label: 'Receptionist', name: 'Ramesh', role: 'Front Desk', phone: '+919800000201', icon: Users, color: 'text-accent-600 bg-accent-50 border-accent-100' },
  { label: 'Pharmacist', name: 'Sunita', role: 'Pharmacy', phone: '+919800000202', icon: Pill, color: 'text-info-600 bg-info-50 border-info-100' },
]

const DEMO_PASSWORD = 'demo1234'

function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'INVALID_CREDENTIALS':
        return 'Phone number or password is incorrect.'
      case 'TENANT_NOT_FOUND':
        return 'No active clinic found with that Clinic ID. Check the spelling and try again.'
      case 'VALIDATION_FAILED':
        return 'Please check your details — clinic ID, phone and password are all required.'
      case 'NETWORK_ERROR':
        return 'Cannot reach the Jioplix server. Check that the API is running and try again.'
      default:
        return `Something went wrong (${err.code}). Please try again.`
    }
  }
  return 'Something went wrong. Please try again.'
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [clinic, setClinic] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (pending) return
    setError(null)
    setPending(true)
    try {
      await login(clinic.trim().toLowerCase(), phone.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setPending(false)
    }
  }

  function fillDemo(accountPhone: string) {
    setClinic('nova')
    setPhone(accountPhone)
    setPassword(DEMO_PASSWORD)
    setError(null)
  }

  return (
    <div className="min-h-screen flex bg-surface-50">
      {/* Brand Showcase Panel (Left on Desktop) */}
      <div className="hidden lg:flex w-[48%] xl:w-[45%] relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-accent-700 flex-col justify-between p-12 text-white shadow-2xl">
        {/* Background ambient lighting */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 -left-20 w-80 h-80 rounded-full bg-accent-400/20 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        {/* Big Brand Logo Header */}
        <div className="relative z-10">
          <BrandLogo variant="on-dark" size="3xl" />
        </div>

        {/* Hero Section */}
        <div className="relative z-10 max-w-lg my-auto py-8">
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight text-white">
            Healthcare Management, Reimagined.
          </h1>
          <p className="mt-4 text-[16px] text-white/90 leading-relaxed font-normal">
            Unified patient health records, live queue tracking, multi-specialty clinical notes,
            integrated pharmacy dispensing, and digital workflows in one secure platform.
          </p>

          {/* Specialties Pills */}
          <div className="mt-8 flex flex-wrap gap-2.5">
            {specialties.map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-[13px] font-medium backdrop-blur-md shadow-sm hover:bg-white/15 transition-colors"
              >
                <s.icon className="w-4 h-4 text-accent-200" />
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* Security & Compliance Footer */}
        <div className="relative z-10 flex items-center gap-2 text-[12px] text-white/80 pt-6 border-t border-white/15">
          <ShieldCheck className="w-4 h-4 text-accent-300" />
          <span>ABDM-ready · Data isolated per clinic · Audit-logged</span>
        </div>
      </div>

      {/* Form Panel (Right) */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white sm:p-8 sm:rounded-3xl sm:border sm:border-surface-200 sm:shadow-healthcare-lg">
          {/* Big Logo on Mobile and Small Screens */}
          <div className="lg:hidden flex justify-center mb-8">
            <BrandLogo variant="pure" size="3xl" />
          </div>

          {/* Clean Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-surface-900 tracking-tight">
              Sign in
            </h2>
            <p className="text-[13px] text-surface-500 mt-1">
              Welcome back. Enter your clinic credentials to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="clinic" className="block text-[12px] font-semibold text-surface-700 mb-1.5">
                Clinic ID
              </label>
              <input
                id="clinic"
                type="text"
                autoComplete="organization"
                placeholder="e.g. nova"
                value={clinic}
                onChange={(e) => setClinic(e.target.value)}
                aria-invalid={!!error}
                required
                className="w-full px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-[12px] font-semibold text-surface-700 mb-1.5">
                Phone number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 98000 00101"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  aria-invalid={!!error}
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-[12px] font-semibold text-surface-700">
                  Password
                </label>
                <span className="text-[11px] text-surface-400">demo1234</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!error}
                  required
                  className="w-full pl-10 pr-11 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-600 transition-colors rounded-lg hover:bg-surface-100"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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
              disabled={pending || !clinic || !phone || !password}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-[13px] font-semibold py-3 shadow-healthcare hover:shadow-healthcare-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {pending && <Loader2 className="w-4 h-4 animate-spin" />}
              {pending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Quick Demo Access */}
          <div className="mt-8 pt-6 border-t border-surface-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-3">
              Demo accounts · Nova Children's Clinic
            </p>

            <div className="grid grid-cols-3 gap-2">
              {demoAccounts.map((a) => (
                <button
                  key={a.phone}
                  type="button"
                  onClick={() => fillDemo(a.phone)}
                  className="p-2.5 rounded-xl bg-surface-50 border border-surface-200 hover:border-primary-300 hover:bg-primary-50/60 transition-all text-left group cursor-pointer"
                >
                  <span className="block text-[12px] font-bold text-surface-700 group-hover:text-primary-700">{a.name}</span>
                  <span className="block text-[10px] text-surface-400 truncate mt-0.5">{a.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-surface-400 mt-3">
              One click fills the form — sign in as different roles to see permissions in action.
            </p>
          </div>

          {/* Compliance trust banner */}
          <div className="mt-6 pt-4 border-t border-surface-100/60 flex items-center justify-center gap-4 text-[10px] font-medium text-surface-400">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-success-600" /> ABDM Ready
            </span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-primary-600" /> HIPAA Compliant
            </span>
            <span className="inline-flex items-center gap-1">
              <Lock className="w-3 h-3 text-surface-500" /> 256-Bit SSL
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
