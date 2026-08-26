import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react'
import BrandLogo from '../components/BrandLogo'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading || !email.trim()) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error?.code ?? 'UNKNOWN')
      }
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-6">
      <div className="w-full max-w-md bg-white rounded-3xl border border-surface-200 shadow-healthcare-lg p-8">
        <div className="flex justify-center mb-6">
          <BrandLogo variant="pure" size="3xl" />
        </div>

        {sent ? (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success-50 mb-4">
              <CheckCircle2 className="w-6 h-6 text-success-600" />
            </div>
            <h2 className="text-xl font-bold text-surface-900 mb-2">Check your email</h2>
            <p className="text-[13px] text-surface-500 mb-6">
              If an account exists with <strong>{email}</strong>, we've sent a password reset link.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-[13px] font-semibold text-primary-600 hover:text-primary-700"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-surface-900">Forgot your password?</h2>
              <p className="text-[13px] text-surface-500 mt-1">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-[12px] font-semibold text-surface-700 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@clinic.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400"
                  />
                </div>
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-xl bg-danger-50 border border-danger-200">
                  <AlertCircle className="w-4 h-4 text-danger-600 mt-0.5 shrink-0" />
                  <p className="text-[12px] font-medium text-danger-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-[13px] font-semibold py-3 shadow-healthcare transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/login" className="text-[12px] font-semibold text-surface-500 hover:text-primary-600 transition-colors">
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
