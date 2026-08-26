import { useEffect, useState } from 'react'
import {
  AlertCircle, ArrowUpRight, Check, CheckCircle2, CreditCard, Loader2, Tag, Zap,
} from 'lucide-react'
import { api, RAZORPAY_PAYMENT_LINK } from '../lib/api'

interface Plan {
  id: string; code: string; name: string; monthly_price: number; features: string[];
}

const PLAN_COLORS: Record<string, string> = {
  starter: 'border-surface-200',
  professional: 'border-primary-300 ring-1 ring-primary-200',
  clinic: 'border-accent-300 ring-1 ring-accent-200',
  enterprise: 'border-surface-300',
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [discountCode, setDiscountCode] = useState('')
  const [discountResult, setDiscountResult] = useState<{ valid: boolean; discount?: any } | null>(null)
  const [checkingDiscount, setCheckingDiscount] = useState(false)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const plansData = await api('/billing/plans') as Plan[]
      setPlans(plansData)

      // Try to get current plan from tenant info
      try {
        const tenantInfo = await api('/tenants/me')
        setCurrentPlan(tenantInfo.planCode ?? null)
      } catch { /* ignore */ }
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function checkDiscount() {
    if (!discountCode.trim()) return
    setCheckingDiscount(true)
    setDiscountResult(null)
    try {
      await api('/billing/validate-discount', {
        method: 'POST',
        body: JSON.stringify({ code: discountCode.trim() }),
      })
      setDiscountResult({ valid: true })
    } catch {
      setDiscountResult({ valid: false })
    }
    setCheckingDiscount(false)
  }

  async function handleUpgrade(planCode: string) {
    setUpgrading(planCode)
    setError(null)
    try {
      const result = await api('/billing/upgrade', {
        method: 'POST',
        body: JSON.stringify({ planCode, discountCode: discountCode.trim() || undefined }),
      }) as { newPlan: string; proratedAmount: number; discountApplied: number }
      setCurrentPlan(result.newPlan)
      loadData()
    } catch {
      setError('Upgrade failed. Please try again or contact support.')
    }
    setUpgrading(null)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary-600" /> Billing & Plans
        </h1>
        <p className="text-[13px] text-surface-500 mt-1">Upgrade or downgrade your plan. All changes are prorated.</p>
      </div>

      {/* Discount Code */}
      <div className="bg-white rounded-2xl border border-surface-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-primary-600" />
          <h3 className="text-[13px] font-bold text-surface-900">Have a discount code?</h3>
        </div>
        <div className="flex gap-2">
          <input
            value={discountCode} onChange={e => { setDiscountCode(e.target.value); setDiscountResult(null) }}
            placeholder="e.g. WELCOME20"
            className="flex-1 px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400"
          />
          <button onClick={checkDiscount} disabled={checkingDiscount || !discountCode.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-700 text-[13px] font-semibold px-4 py-2.5 transition-all disabled:opacity-50 cursor-pointer">
            {checkingDiscount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
            Apply
          </button>
        </div>
        {discountResult && (
          <p className={`mt-2 text-[12px] font-semibold ${discountResult.valid ? 'text-success-600' : 'text-danger-600'}`}>
            {discountResult.valid ? '✓ Code applied! Discount will be reflected at checkout.' : 'Invalid or expired code.'}
          </p>
        )}
      </div>

      {/* Plans */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-primary-600" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map(plan => {
            const isCurrent = currentPlan === plan.code
            const isHigher = plans.findIndex(p => p.code === plan.code) > (plans.findIndex(p => p.code === currentPlan) ?? -1)
            return (
              <div key={plan.id}
                className={`relative bg-white rounded-2xl border-2 p-5 flex flex-col transition-all ${isCurrent ? 'ring-2 ring-primary-500 border-primary-400' : PLAN_COLORS[plan.code] ?? 'border-surface-200'}`}>
                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                    CURRENT
                  </span>
                )}
                <h3 className="text-lg font-bold text-surface-900 mt-2">{plan.name}</h3>
                <div className="mt-3 mb-4">
                  <span className="text-3xl font-bold text-surface-900">₹{plan.monthly_price.toLocaleString()}</span>
                  <span className="text-[12px] text-surface-400">/mo</span>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {(plan.features ?? []).slice(0, 4).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-surface-600">
                      <Check className="w-3.5 h-3.5 text-success-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && (
                  <button
                    onClick={() => handleUpgrade(plan.code)}
                    disabled={!!upgrading}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-xl text-[13px] font-semibold py-2.5 transition-all disabled:opacity-50 cursor-pointer ${
                      isHigher
                        ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-healthcare'
                        : 'bg-surface-100 hover:bg-surface-200 text-surface-700'
                    }`}>
                    {upgrading === plan.code ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                    {upgrading === plan.code ? 'Upgrading...' : isHigher ? 'Upgrade' : 'Switch'}
                  </button>
                )}
                {isCurrent && (
                  <div className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-success-50 text-success-700 text-[13px] font-semibold py-2.5 border border-success-200">
                    <CheckCircle2 className="w-4 h-4" /> Active
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-start gap-2.5 p-3.5 rounded-xl bg-danger-50 border border-danger-200">
          <AlertCircle className="w-4 h-4 text-danger-600 mt-0.5 shrink-0" />
          <p className="text-[12px] text-danger-700">{error}</p>
        </div>
      )}

      {/* Payment CTA */}
      <div className="mt-8 bg-gradient-to-r from-primary-50 to-accent-50 rounded-2xl border border-primary-100 p-6 text-center">
        <Zap className="w-6 h-6 text-primary-600 mx-auto mb-2" />
        <h3 className="text-[15px] font-bold text-surface-900 mb-1">Need help choosing?</h3>
        <p className="text-[12px] text-surface-500 mb-4">All plans include a 14-day free trial. No credit card required to start.</p>
        <a
          href={RAZORPAY_PAYMENT_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-[13px] font-semibold px-6 py-2.5 shadow-healthcare transition-all"
        >
          <CreditCard className="w-4 h-4" /> Pay now
        </a>
      </div>
    </div>
  )
}
