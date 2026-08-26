import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'
import BrandLogo from '../components/BrandLogo'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid = token && email && password.length >= 8 && password === confirm

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || loading) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, newPassword: password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.code ?? 'UNKNOWN')
      setDone(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'UNKNOWN'
      if (msg === 'TOKEN_EXPIRED') setError('This reset link has expired. Please request a new one.')
      else if (msg === 'INVALID_TOKEN') setError('Invalid reset link. Please request a new one.')
      else setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 p-6">
        <div className="w-full max-w-md bg-white rounded-3xl border border-surface-200 shadow-healthcare-lg p-8 text-center">
          <AlertCircle className="w-10 h-10 text-danger-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-surface-900 mb-2">Invalid reset link</h2>
          <p className="text-[13px] text-surface-500 mb-6">This link is missing required parameters.</p>
          <Link to="/forgot-password" className="text-[13px] font-semibold text-primary-600 hover:text-primary-700">
            Request a new reset link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-6">
      <div className="w-full max-w-md bg-white rounded-3xl border border-surface-200 shadow-healthcare-lg p-8">
        <div className="flex justify-center mb-6">
          <BrandLogo variant="pure" size="3xl" />
        </div>

        {done ? (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success-50 mb-4">
              <CheckCircle2 className="w-6 h-6 text-success-600" />
            </div>
            <h2 className="text-xl font-bold text-surface-900 mb-2">Password updated</h2>
            <p className="text-[13px] text-surface-500 mb-6">Your password has been reset successfully.</p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-[13px] font-semibold px-6 py-3 shadow-healthcare transition-all"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-surface-900">Set new password</h2>
              <p className="text-[13px] text-surface-500 mt-1">Enter a new password for {email}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="pw" className="block text-[12px] font-semibold text-surface-700 mb-1.5">New password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
                  <input
                    id="pw"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-11 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm" className="block text-[12px] font-semibold text-surface-700 mb-1.5">Confirm password</label>
                <input
                  id="confirm"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400"
                />
                {confirm && password !== confirm && (
                  <p className="mt-1 text-[11px] text-danger-600">Passwords don't match</p>
                )}
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-xl bg-danger-50 border border-danger-200">
                  <AlertCircle className="w-4 h-4 text-danger-600 mt-0.5 shrink-0" />
                  <p className="text-[12px] font-medium text-danger-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!valid || loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-[13px] font-semibold py-3 shadow-healthcare transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Updating...' : 'Reset password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
