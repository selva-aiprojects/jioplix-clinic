import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle, ArrowLeft, CheckCircle2, CreditCard, Globe, Loader2,
  Settings, Shield,
} from 'lucide-react'
import {
  getPlatformSettings, updatePlatformSettings,
  type PlatformSettings,
} from '../lib/api'

const STORAGE_KEY = 'jioplix.platform_admin'

function Toggle({
  enabled,
  onToggle,
  disabled,
}: {
  enabled: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        enabled ? 'bg-primary-600' : 'bg-surface-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [user, setUser] = useState<{ email: string; fullName: string } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setUser(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getPlatformSettings()
      .then(setSettings)
      .catch(() => setError('Failed to load settings.'))
      .finally(() => setLoading(false))
  }, [user])

  async function handleSave(updates: Partial<PlatformSettings>) {
    if (!settings) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const merged = { ...settings, ...updates }
      const result = await updatePlatformSettings(merged)
      setSettings(result)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="bg-white border-b border-surface-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="text-surface-400 hover:text-primary-600 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Settings className="w-5 h-5 text-primary-600" />
            <span className="text-[15px] font-bold text-surface-900">Platform Settings</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[12px] text-surface-500">{user.fullName}</span>
            <Link to="/admin" className="text-[12px] font-semibold text-surface-400 hover:text-danger-600 transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : !settings ? (
          <div className="text-center py-20 text-[13px] text-surface-400">Failed to load settings.</div>
        ) : (
          <div className="space-y-6">
            {/* Status Messages */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-danger-50 border border-danger-200">
                <AlertCircle className="w-4 h-4 text-danger-600 mt-0.5 shrink-0" />
                <p className="text-[12px] font-medium text-danger-700">{error}</p>
              </div>
            )}
            {saved && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-success-50 border border-success-200">
                <CheckCircle2 className="w-4 h-4 text-success-600 mt-0.5 shrink-0" />
                <p className="text-[12px] font-medium text-success-700">Settings saved successfully.</p>
              </div>
            )}

            {/* ─── Payment Settings ─── */}
            <section className="bg-white rounded-xl border border-surface-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-[14px] font-bold text-surface-900">Payment &amp; Billing</h2>
                    <p className="text-[11px] text-surface-400">Control Razorpay payment visibility across the platform</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-surface-50">
                <div className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold text-surface-900">Enable Payment Buttons</p>
                    <p className="text-[11px] text-surface-400 mt-0.5">Show &ldquo;Pay now via Razorpay&rdquo; buttons on Suspended page, Landing, and Registration</p>
                  </div>
                  <Toggle
                    enabled={settings.payment_enabled}
                    onToggle={() => handleSave({ payment_enabled: !settings.payment_enabled })}
                    disabled={saving}
                  />
                </div>
                <div className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold text-surface-900">Enable Self-Registration</p>
                    <p className="text-[11px] text-surface-400 mt-0.5">Allow new clinics to register via /register page</p>
                  </div>
                  <Toggle
                    enabled={settings.registration_enabled}
                    onToggle={() => handleSave({ registration_enabled: !settings.registration_enabled })}
                    disabled={saving}
                  />
                </div>
              </div>
            </section>

            {/* ─── Subscription Settings ─── */}
            <section className="bg-white rounded-xl border border-surface-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-warning-50 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-warning-600" />
                  </div>
                  <div>
                    <h2 className="text-[14px] font-bold text-surface-900">Subscription Rules</h2>
                    <p className="text-[11px] text-surface-400 mt-0.5">Control trial and grace period durations</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-surface-50">
                <div className="px-5 py-4 flex items-center justify-between gap-6">
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-surface-900">Trial Period (days)</p>
                    <p className="text-[11px] text-surface-400 mt-0.5">Free trial length for new registrations</p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={settings.trial_days}
                    onChange={(e) => setSettings({ ...settings, trial_days: Number(e.target.value) })}
                    onBlur={() => handleSave({ trial_days: settings.trial_days })}
                    className="w-20 px-3 py-1.5 text-[13px] font-mono font-semibold text-center bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
                <div className="px-5 py-4 flex items-center justify-between gap-6">
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-surface-900">Grace Period (days)</p>
                    <p className="text-[11px] text-surface-400 mt-0.5">Days after expiry before auto-suspension</p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={settings.grace_period_days}
                    onChange={(e) => setSettings({ ...settings, grace_period_days: Number(e.target.value) })}
                    onBlur={() => handleSave({ grace_period_days: settings.grace_period_days })}
                    className="w-20 px-3 py-1.5 text-[13px] font-mono font-semibold text-center bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
              </div>
            </section>

            {/* ─── Branding & Support ─── */}
            <section className="bg-white rounded-xl border border-surface-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-accent-50 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-accent-600" />
                  </div>
                  <div>
                    <h2 className="text-[14px] font-bold text-surface-900">Branding &amp; Support</h2>
                    <p className="text-[11px] text-surface-400 mt-0.5">Platform name and contact details shown to tenants</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-surface-50">
                <div className="px-5 py-4 flex items-center justify-between gap-6">
                  <label className="text-[13px] font-semibold text-surface-900 shrink-0">Platform Name</label>
                  <input
                    type="text"
                    value={settings.platform_name}
                    onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })}
                    onBlur={() => handleSave({ platform_name: settings.platform_name })}
                    className="flex-1 max-w-xs px-3 py-1.5 text-[13px] font-medium bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
                <div className="px-5 py-4 flex items-center justify-between gap-6">
                  <label className="text-[13px] font-semibold text-surface-900 shrink-0">Support Email</label>
                  <input
                    type="email"
                    value={settings.support_email}
                    onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                    onBlur={() => handleSave({ support_email: settings.support_email })}
                    className="flex-1 max-w-xs px-3 py-1.5 text-[13px] font-medium bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
                <div className="px-5 py-4 flex items-center justify-between gap-6">
                  <label className="text-[13px] font-semibold text-surface-900 shrink-0">Support Phone</label>
                  <input
                    type="tel"
                    value={settings.support_phone}
                    onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                    onBlur={() => handleSave({ support_phone: settings.support_phone })}
                    className="flex-1 max-w-xs px-3 py-1.5 text-[13px] font-medium bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
              </div>
            </section>

            {/* ─── Razorpay Info ─── */}
            <section className="bg-white rounded-xl border border-surface-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-info-50 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-info-600" />
                  </div>
                  <div>
                    <h2 className="text-[14px] font-bold text-surface-900">Razorpay Integration</h2>
                    <p className="text-[11px] text-surface-400 mt-0.5">Current payment gateway status</p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4">
                <div className="rounded-xl bg-surface-50 border border-surface-100 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] font-semibold text-surface-700">Payment Link</span>
                    <span className="text-[11px] font-mono text-surface-500">https://razorpay.me/@balakrishnanselvakumar</span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] font-semibold text-surface-700">API Keys</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${import.meta.env.VITE_RAZORPAY_KEY_ID ? 'bg-success-50 text-success-700 border border-success-200' : 'bg-warning-50 text-warning-700 border border-warning-200'}`}>
                      {import.meta.env.VITE_RAZORPAY_KEY_ID ? 'Configured' : 'Not configured (using stub)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-surface-400 leading-relaxed">
                    Payment buttons link directly to the Razorpay payment page. When API keys are configured in <code>.env</code>,
                    the system will also support in-app payment creation and verification.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
