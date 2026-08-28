import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  AlertCircle, Baby, Eye, EyeOff, Fingerprint, HeartHandshake,
  Loader2, Lock, Phone, ScanFace, ShieldCheck, Stethoscope, Users, Pill,
  CheckCircle2, KeyRound, ArrowLeft, Timer, MessageSquare, Microscope, Sparkles,
} from 'lucide-react'
import { ApiError } from '../lib/api'
import { useAuth } from '../auth/useAuth'
import BrandLogo from '../components/BrandLogo'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'

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
  { label: 'Lab Technician', name: 'Vijay', role: 'Lab', phone: '+919800000203', icon: Microscope, color: 'text-success-600 bg-success-50 border-success-100' },
]

const DEMO_PASSWORD = 'demo1234'

type LoginMode = 'otp' | 'password'

function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'INVALID_CREDENTIALS':
        return 'Phone number or password is incorrect.'
      case 'TENANT_NOT_FOUND':
        return 'No active clinic found with that Clinic ID. Check the spelling and try again.'
      case 'TENANT_SUSPENDED':
        return 'Your clinic account has been suspended. Please contact support to restore access.'
      case 'VALIDATION_FAILED':
        return 'Please check your details — clinic ID, phone and password are all required.'
      case 'NETWORK_ERROR':
        return 'Cannot reach the Jioplix server. Check that the API is running and try again.'
      case 'OTP_EXPIRED':
        return 'This OTP has expired. Please request a new one.'
      case 'OTP_INVALID':
        return 'The OTP you entered is incorrect. Please try again.'
      case 'OTP_MAX_ATTEMPTS':
        return 'Too many failed attempts. Please request a new OTP.'
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
  const [otp, setOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // OTP flow state
  const [mode, setMode] = useState<LoginMode>('otp')
  const [otpSent, setOtpSent] = useState(false)
  const [otpExpiry, setOtpExpiry] = useState(0)
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [demoCode, setDemoCode] = useState<string | null>(null)

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  // OTP countdown timer
  useEffect(() => {
    if (otpExpiry <= 0) return
    const id = setInterval(() => {
      setOtpExpiry((prev) => {
        if (prev <= 1) {
          clearInterval(id)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [otpExpiry > 0])

  // Password login
  async function handlePasswordLogin(e: FormEvent) {
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

  // Send OTP
  async function handleSendOtp() {
    if (otpSending || !clinic.trim() || !phone.trim()) return
    setError(null)
    setOtpSending(true)
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic: clinic.trim().toLowerCase(), phone: phone.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new ApiError(data?.error?.code ?? 'UNKNOWN', res.status)
      setOtpSent(true)
      setOtpExpiry(data.data?.expiresIn ?? 300)
      setDemoCode(data.data?.demoCode ?? null)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setOtpSending(false)
    }
  }

  // Verify OTP + login
  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault()
    if (otpVerifying || otp.length !== 6) return
    setError(null)
    setOtpVerifying(true)
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic: clinic.trim().toLowerCase(),
          phone: phone.trim(),
          otp: otp.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new ApiError(data?.error?.code ?? 'UNKNOWN', res.status)

      // Store session (same as password login)
      const session = data.data
      if (session?.accessToken) {
        localStorage.setItem('jioplix.session.v1', JSON.stringify({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          user: session.user,
          expiresAt: Date.now() + 15 * 60 * 1000,
          version: 1,
        }))
        window.location.hash = from
      }
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setOtpVerifying(false)
    }
  }

  function fillDemo(accountPhone: string) {
    setClinic('nova')
    setPhone(accountPhone)
    setPassword(DEMO_PASSWORD)
    setError(null)
    setOtpSent(false)
    setOtp('')
    setDemoCode(null)
  }

  function resetOtpFlow() {
    setOtpSent(false)
    setOtp('')
    setError(null)
    setDemoCode(null)
  }

  return (
    <div className="min-h-screen flex bg-surface-50">
      {/* Brand Showcase Panel */}
      <div className="hidden lg:flex w-[48%] xl:w-[45%] relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-accent-700 flex-col justify-between p-12 text-white shadow-2xl">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 -left-20 w-80 h-80 rounded-full bg-accent-400/20 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        <div className="relative z-10">
          <BrandLogo variant="on-dark" size="3xl" />
        </div>

        <div className="relative z-10 max-w-lg my-auto py-8">
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight text-white">
            Healthcare Management, Reimagined.
          </h1>
          <p className="mt-4 text-[16px] text-white/90 leading-relaxed font-normal">
            Unified patient health records, live queue tracking, multi-specialty clinical notes,
            integrated pharmacy dispensing, and digital workflows in one secure platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {specialties.map((s) => (
              <span key={s.label} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-[13px] font-medium backdrop-blur-md shadow-sm hover:bg-white/15 transition-colors">
                <s.icon className="w-4 h-4 text-accent-200" />
                {s.label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-[12px] text-white/80 pt-6 border-t border-white/15">
          <ShieldCheck className="w-4 h-4 text-accent-300" />
          <span>ABDM-ready · Data isolated per clinic · Audit-logged</span>
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white sm:p-8 sm:rounded-3xl sm:border sm:border-surface-200 sm:shadow-healthcare-lg">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <BrandLogo variant="pure" size="3xl" />
          </div>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-surface-900 tracking-tight">
              {otpSent ? 'Enter verification code' : 'Sign in'}
            </h2>
            <p className="text-[13px] text-surface-500 mt-1">
              {otpSent
                ? `We sent a 6-digit code to ${phone}`
                : 'Enter your phone number to receive a verification code.'}
            </p>
          </div>

          {/* ─── OTP Mode ─────────────────────────────────── */}
          {mode === 'otp' && !otpSent && (
            <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }} className="space-y-4" noValidate>
              <div>
                <label htmlFor="clinic" className="block text-[12px] font-semibold text-surface-700 mb-1.5">Clinic ID</label>
                <input
                  id="clinic"
                  type="text"
                  autoComplete="organization"
                  placeholder="e.g. nova"
                  value={clinic}
                  onChange={(e) => setClinic(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-[12px] font-semibold text-surface-700 mb-1.5">Phone number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+91 98000 00101"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400"
                  />
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
                disabled={otpSending || !clinic || !phone}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-[13px] font-semibold py-3 shadow-healthcare hover:shadow-healthcare-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {otpSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                {otpSending ? 'Sending...' : 'Send verification code'}
              </button>
            </form>
          )}

          {/* ─── OTP Verification ────────────────────────── */}
          {mode === 'otp' && otpSent && (
            <form onSubmit={handleVerifyOtp} className="space-y-4" noValidate>
              <button
                type="button"
                onClick={resetOtpFlow}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-surface-500 hover:text-primary-600 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Change phone number
              </button>

              <div>
                <label htmlFor="otp" className="block text-[12px] font-semibold text-surface-700 mb-1.5">Verification code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                    className="w-full pl-10 pr-3.5 py-2.5 text-[18px] font-mono tracking-[0.3em] text-center bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-300 placeholder:tracking-[0.3em]"
                  />
                </div>
                {otpExpiry > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-surface-400">
                    <Timer className="w-3 h-3" /> Code expires in {Math.floor(otpExpiry / 60)}:{String(otpExpiry % 60).padStart(2, '0')}
                  </div>
                )}
                {demoCode && (
                  <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-info-50 border border-info-200 px-3.5 py-2.5">
                    <Sparkles className="w-4 h-4 text-info-600 shrink-0" />
                    <div className="text-[12px] leading-tight">
                      <span className="block font-semibold text-info-700">Demo mode — enter this code</span>
                      <span className="block font-mono text-[18px] font-bold tracking-[0.3em] text-info-700">{demoCode}</span>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-xl bg-danger-50 border border-danger-200">
                  <AlertCircle className="w-4 h-4 text-danger-600 mt-0.5 shrink-0" />
                  <p className="text-[12px] font-medium text-danger-700 leading-relaxed">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={otpVerifying || otp.length !== 6}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-[13px] font-semibold py-3 shadow-healthcare hover:shadow-healthcare-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {otpVerifying && <Loader2 className="w-4 h-4 animate-spin" />}
                {otpVerifying ? 'Verifying...' : 'Verify & sign in'}
              </button>

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={otpSending}
                className="w-full text-center text-[12px] font-semibold text-primary-600 hover:text-primary-700 transition-colors"
              >
                {otpSending ? 'Resending...' : 'Resend OTP'}
              </button>
            </form>
          )}

          {/* ─── Password Mode ───────────────────────────── */}
          {mode === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4" noValidate>
              <div>
                <label htmlFor="clinic-pw" className="block text-[12px] font-semibold text-surface-700 mb-1.5">Clinic ID</label>
                <input
                  id="clinic-pw"
                  type="text"
                  autoComplete="organization"
                  placeholder="e.g. nova"
                  value={clinic}
                  onChange={(e) => setClinic(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400"
                />
              </div>

              <div>
                <label htmlFor="phone-pw" className="block text-[12px] font-semibold text-surface-700 mb-1.5">Phone number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
                  <input
                    id="phone-pw"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+91 98000 00101"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-[12px] font-semibold text-surface-700">Password</label>
                  <span className="text-[11px] text-surface-400">demo: demo1234</span>
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
                    required
                    className="w-full pl-10 pr-11 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-600 transition-colors rounded-lg hover:bg-surface-100"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end -mt-2">
                <Link to="/forgot-password" className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                  Forgot password?
                </Link>
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
                {pending ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          )}

          {/* Mode Toggle */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'otp' ? 'password' : 'otp')
                setError(null)
                setOtpSent(false)
                setOtp('')
              }}
              className="text-[12px] font-semibold text-primary-600 hover:text-primary-700 transition-colors"
            >
              {mode === 'otp' ? 'Use password instead' : 'Sign in with OTP'}
            </button>
          </div>

          {/* Demo Accounts */}
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

          {/* Compliance Footer */}
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
