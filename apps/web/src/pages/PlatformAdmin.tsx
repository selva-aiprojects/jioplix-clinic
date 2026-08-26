import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle, Building2, CheckCircle2, Loader2, LogIn, LogOut,
  Pause, Play, Shield, ShieldOff, Trash2, Users, Wallet, XCircle, ExternalLink,
} from 'lucide-react'
import {
  platformLogin, platformListTenants, platformTenantAction, platformDashboard,
  RAZORPAY_PAYMENT_LINK,
  type PlatformAdminUser, type PlatformTenant, type PlatformDashboard,
} from '../lib/api'
import BrandLogo from '../components/BrandLogo'

const STORAGE_KEY = 'jioplix.platform_admin'

function statusColor(s: string) {
  if (s === 'active') return 'bg-success-50 text-success-700 border-success-200'
  if (s === 'suspended') return 'bg-danger-50 text-danger-700 border-danger-200'
  if (s === 'trialing') return 'bg-warning-50 text-warning-700 border-warning-200'
  return 'bg-surface-100 text-surface-600 border-surface-200'
}

export default function PlatformAdmin() {
  const [user, setUser] = useState<PlatformAdminUser | null>(null)
  const [email, setEmail] = useState('admin@jioplix.com')
  const [password, setPassword] = useState('')
  const [logging, setLogging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [tenants, setTenants] = useState<PlatformTenant[]>([])
  const [stats, setStats] = useState<PlatformDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionBusy, setActionBusy] = useState<string | null>(null)

  // Restore session
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setUser(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  // Load data when authenticated
  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([platformListTenants(), platformDashboard()])
      .then(([t, s]) => { setTenants(t); setStats(s) })
      .catch(() => setError('Failed to load platform data.'))
      .finally(() => setLoading(false))
  }, [user])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLogging(true)
    try {
      const res = await platformLogin(email, password)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res.user))
      setUser(res.user)
    } catch {
      setError('Invalid credentials.')
    } finally {
      setLogging(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
    setTenants([])
    setStats(null)
  }

  async function handleAction(tenantId: string, action: 'suspend' | 'unsuspend') {
    setActionBusy(tenantId)
    try {
      const res = await platformTenantAction(tenantId, action)
      setTenants((prev) => prev.map((t) => t.id === tenantId ? { ...t, status: res.status } : t))
      // Refresh stats
      const s = await platformDashboard()
      setStats(s)
    } catch {
      setError(`Failed to ${action} tenant.`)
    } finally {
      setActionBusy(null)
    }
  }

  // ─── Login Form ───
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 p-6">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-surface-200 shadow-lg p-8">
          <div className="flex justify-center mb-6">
            <BrandLogo variant="pure" size="2xl" />
          </div>
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-surface-900">Platform Admin</h1>
            <p className="text-[12px] text-surface-500 mt-1">Sign in to manage tenants and subscriptions.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                className="w-full px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400" />
            </div>
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-danger-50 border border-danger-200">
                <AlertCircle className="w-4 h-4 text-danger-600 mt-0.5 shrink-0" />
                <p className="text-[12px] font-medium text-danger-700">{error}</p>
              </div>
            )}
            <button type="submit" disabled={logging}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-[13px] font-semibold py-3 transition-all disabled:opacity-50 cursor-pointer">
              {logging && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign in
            </button>
          </form>
          <div className="mt-4 text-center">
            <Link to="/" className="text-[12px] text-surface-400 hover:text-primary-600 transition-colors">Back to Jioplix</Link>
          </div>
        </div>
      </div>
    )
  }

  // ─── Dashboard ───
  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="bg-white border-b border-surface-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary-600" />
            <span className="text-[15px] font-bold text-surface-900">Platform Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[12px] text-surface-500">{user.fullName}</span>
            <button onClick={handleLogout} className="text-[12px] font-semibold text-surface-400 hover:text-danger-600 transition-colors cursor-pointer">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : (
          <>
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl border border-surface-200 p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center"><Users className="w-4.5 h-4.5 text-primary-600" /></div>
                    <span className="text-[12px] font-semibold text-surface-500">Total Clinics</span>
                  </div>
                  <p className="text-3xl font-bold text-surface-900">{stats.totalTenants}</p>
                </div>
                <div className="bg-white rounded-xl border border-surface-200 p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-success-50 flex items-center justify-center"><CheckCircle2 className="w-4.5 h-4.5 text-success-600" /></div>
                    <span className="text-[12px] font-semibold text-surface-500">Active</span>
                  </div>
                  <p className="text-3xl font-bold text-success-600">{stats.activeTenants}</p>
                </div>
                <div className="bg-white rounded-xl border border-surface-200 p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-danger-50 flex items-center justify-center"><XCircle className="w-4.5 h-4.5 text-danger-600" /></div>
                    <span className="text-[12px] font-semibold text-surface-500">Suspended</span>
                  </div>
                  <p className="text-3xl font-bold text-danger-600">{stats.suspendedTenants}</p>
                </div>
                <div className="bg-white rounded-xl border border-surface-200 p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-warning-50 flex items-center justify-center"><Wallet className="w-4.5 h-4.5 text-warning-600" /></div>
                    <span className="text-[12px] font-semibold text-surface-500">Pending Revenue</span>
                  </div>
                  <p className="text-3xl font-bold text-surface-900">₹{(stats.revenue.totalPending / 100).toLocaleString('en-IN')}</p>
                </div>
              </div>
            )}

            {/* Tenant Table */}
            <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-100">
                <h2 className="text-[14px] font-bold text-surface-900">All Clinics</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-surface-100">
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-surface-400">Clinic</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-surface-400">Slug</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-surface-400">Status</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-surface-400">Plan</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-surface-400">Subscription</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-surface-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((t) => (
                      <tr key={t.id} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-primary-600" />
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-surface-900">{t.name}</p>
                              <p className="text-[11px] text-surface-400 capitalize">{t.clinicType}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] font-mono text-surface-600">{t.slug}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusColor(t.status)}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] font-semibold text-surface-700 capitalize">{t.planCode}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          {t.subscription ? (
                            <div>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusColor(t.subscription.status)}`}>
                                {t.subscription.status}
                              </span>
                              <p className="text-[11px] text-surface-400 mt-0.5">
                                Until {new Date(t.subscription.periodEnd).toLocaleDateString('en-IN')}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[12px] text-surface-400">No subscription</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {t.status === 'active' ? (
                              <button
                                onClick={() => handleAction(t.id, 'suspend')}
                                disabled={actionBusy === t.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-danger-600 bg-danger-50 hover:bg-danger-100 border border-danger-200 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                {actionBusy === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pause className="w-3 h-3" />}
                                Suspend
                              </button>
                            ) : t.status === 'suspended' ? (
                              <div className="flex items-center gap-2">
                                <a
                                  href={RAZORPAY_PAYMENT_LINK}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 border border-primary-200 transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Pay Link
                                </a>
                                <button
                                  onClick={() => handleAction(t.id, 'unsuspend')}
                                  disabled={actionBusy === t.id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-success-600 bg-success-50 hover:bg-success-100 border border-success-200 transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                  {actionBusy === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                                  Reactivate
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {tenants.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-[13px] text-surface-400">
                          No clinics registered yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
