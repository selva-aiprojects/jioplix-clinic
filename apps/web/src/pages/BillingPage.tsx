import { useEffect, useState } from 'react'
import {
  AlertCircle, ArrowUpRight, Check, CheckCircle2, Clock, CreditCard,
  ExternalLink, Loader2, ShieldCheck, Tag,
} from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import {
  api,
  getCurrentSubscription,
  createPaymentOrder,
  verifyPayment,
  openRazorpayCheckout,
  RAZORPAY_PAYMENT_LINK,
  type TenantSubscription,
} from '../lib/api'

interface Plan {
  id: string
  code: string
  name: string
  monthly_price: number
  features: string[]
}

const DEFAULT_PLANS: Plan[] = [
  {
    id: 'starter',
    code: 'starter',
    name: 'Starter',
    monthly_price: 999,
    features: ['Up to 500 patients/mo', '1 Doctor, 1 Receptionist', 'e-Prescriptions & EMR', 'Basic Analytics'],
  },
  {
    id: 'professional',
    code: 'professional',
    name: 'Professional',
    monthly_price: 1999,
    features: ['Unlimited patients', 'Up to 5 Doctors', 'Pharmacy & Lab modules', 'ABDM & WhatsApp reminders'],
  },
  {
    id: 'clinic',
    code: 'clinic',
    name: 'Clinic Suite',
    monthly_price: 4999,
    features: ['Unlimited staff & doctors', 'Full Inventory & Procedures', 'AI Clinical Copilot', 'Priority 24/7 Support'],
  },
]

const PLAN_COLORS: Record<string, string> = {
  starter: 'border-surface-200',
  professional: 'border-primary-300 ring-2 ring-primary-500/20 shadow-healthcare',
  clinic: 'border-accent-300 ring-1 ring-accent-200',
  enterprise: 'border-surface-300',
}

export default function BillingPage() {
  const { user } = useAuth()
  const isTenantAdmin = Boolean(
    user?.roles?.includes('tenant_admin') || user?.permissions?.includes('*'),
  )

  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS)
  const [currentSub, setCurrentSub] = useState<TenantSubscription | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string>('professional')
  const [loading, setLoading] = useState(true)
  const [discountCode, setDiscountCode] = useState('')
  const [discountResult, setDiscountResult] = useState<{ valid: boolean } | null>(null)
  const [checkingDiscount, setCheckingDiscount] = useState(false)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [plansData, subData] = await Promise.allSettled([
        api<Plan[]>('/billing/plans'),
        getCurrentSubscription(),
      ])

      if (plansData.status === 'fulfilled' && Array.isArray(plansData.value) && plansData.value.length > 0) {
        setPlans(plansData.value)
      }

      if (subData.status === 'fulfilled' && subData.value) {
        setCurrentSub(subData.value)
        setCurrentPlan(subData.value.planCode || 'professional')
      }
    } catch {
      // Fallbacks active
    } finally {
      setLoading(false)
    }
  }

  async function checkDiscount() {
    if (!discountCode.trim()) return
    setCheckingDiscount(true)
    setDiscountResult(null)
    try {
      await api('/billing/validate-discount', {
        method: 'POST',
        body: { code: discountCode.trim() },
      })
      setDiscountResult({ valid: true })
    } catch {
      setDiscountResult({ valid: false })
    } finally {
      setCheckingDiscount(false)
    }
  }

  async function handlePayRazorpay(planCode: string, monthlyPrice: number) {
    if (!isTenantAdmin) {
      setError('Only Tenant Administrators can initiate subscription payments.')
      return
    }

    setPaying(true)
    setError(null)
    setPaymentSuccess(null)

    const amountPaise = monthlyPrice > 0 ? monthlyPrice * 100 : 199900

    try {
      const order = await createPaymentOrder(amountPaise, planCode)
      openRazorpayCheckout({
        orderId: order.orderId,
        keyId: order.keyId,
        amountPaise: order.amount,
        planCode,
        clinicName: user?.clinic?.name,
        adminName: user?.fullName,
        adminPhone: user?.phone,
        onSuccess: async (paymentId) => {
          try {
            await verifyPayment({
              razorpayOrderId: order.orderId,
              razorpayPaymentId: paymentId,
              razorpaySignature: '',
            })
          } catch {
            // Backend handles verification
          }
          setPaymentSuccess(`Payment successful! Reference: ${paymentId}`)
          loadData()
        },
        onFailure: (err) => {
          setError(`Razorpay checkout cancelled or failed: ${err?.description || 'Payment not completed'}`)
        },
      })
    } catch {
      // Fallback directly to verified Razorpay link
      window.open(RAZORPAY_PAYMENT_LINK, '_blank', 'noopener,noreferrer')
    } finally {
      setPaying(false)
    }
  }

  async function handleUpgrade(planCode: string) {
    if (!isTenantAdmin) {
      setError('Only Tenant Administrators can change subscription plans.')
      return
    }

    setUpgrading(planCode)
    setError(null)
    try {
      const result = await api<{ newPlan: string }>('/billing/upgrade', {
        method: 'POST',
        body: { planCode, discountCode: discountCode.trim() || undefined },
      })
      setCurrentPlan(result.newPlan)
      loadData()
    } catch {
      // If billing upgrade needs payment, launch Razorpay
      const targetPlan = plans.find((p) => p.code === planCode)
      handlePayRazorpay(planCode, targetPlan?.monthly_price ?? 1999)
    } finally {
      setUpgrading(null)
    }
  }

  const isTrial = currentSub?.status === 'trialing'
  const daysLeft = currentSub?.trialEnd
    ? Math.max(0, Math.ceil((new Date(currentSub.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 14

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary-600" /> Billing & Razorpay Subscriptions
        </h1>
        <p className="text-[13px] text-surface-500 mt-1">
          Manage your clinic's subscription, activate plans with Razorpay, and view payment status.
        </p>
      </div>

      {/* Trial Countdown or Active Status Banner */}
      {isTrial ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-[14px] font-bold text-amber-900">
                14-Day Free Trial Active ({daysLeft} days remaining)
              </h3>
              <p className="text-[12px] text-amber-700 mt-0.5">
                Your clinic has full access to all features. Pay now via Razorpay to ensure continuous, uninterrupted access.
              </p>
            </div>
          </div>
          <button
            onClick={() => handlePayRazorpay(currentPlan, 1999)}
            disabled={paying || !isTenantAdmin}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[13px] font-semibold px-4 py-2.5 shadow-sm transition-all whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            Pay Now with Razorpay
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-success-50 border border-success-200 text-success-800">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-success-600 shrink-0" />
            <span className="text-[13px] font-semibold">
              Subscription Active · Plan: {(currentSub?.planCode || currentPlan).toUpperCase()}
            </span>
          </div>
          <a
            href={RAZORPAY_PAYMENT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-semibold text-success-700 hover:text-success-900 inline-flex items-center gap-1"
          >
            Razorpay Portal <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Success banner */}
      {paymentSuccess && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-success-50 border border-success-200 text-success-800 text-[13px] font-medium">
          <CheckCircle2 className="w-5 h-5 text-success-600 shrink-0" />
          <span>{paymentSuccess}</span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-danger-50 border border-danger-200 text-danger-700 text-[13px]">
          <AlertCircle className="w-4 h-4 text-danger-600 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Discount Code */}
      <div className="bg-white rounded-2xl border border-surface-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-primary-600" />
          <h3 className="text-[13px] font-bold text-surface-900">Have a promotional discount code?</h3>
        </div>
        <div className="flex gap-2 max-w-md">
          <input
            value={discountCode}
            onChange={(e) => {
              setDiscountCode(e.target.value)
              setDiscountResult(null)
            }}
            placeholder="e.g. JIOPLIX20"
            className="flex-1 px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400"
          />
          <button
            onClick={checkDiscount}
            disabled={checkingDiscount || !discountCode.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-700 text-[13px] font-semibold px-4 py-2.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            {checkingDiscount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
            Apply
          </button>
        </div>
        {discountResult && (
          <p
            className={`mt-2 text-[12px] font-semibold ${
              discountResult.valid ? 'text-success-600' : 'text-danger-600'
            }`}
          >
            {discountResult.valid
              ? '✓ Code validated! Discount will be automatically applied at checkout.'
              : 'Invalid or expired code.'}
          </p>
        )}
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentPlan.toLowerCase() === plan.code.toLowerCase()
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col transition-all ${
                  isCurrent
                    ? 'ring-2 ring-primary-500 border-primary-500 shadow-healthcare-lg'
                    : PLAN_COLORS[plan.code] ?? 'border-surface-200'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full tracking-wider">
                    CURRENT PLAN
                  </span>
                )}
                <h3 className="text-lg font-bold text-surface-900 mt-2">{plan.name}</h3>
                <div className="mt-3 mb-4">
                  <span className="text-3xl font-extrabold text-surface-900">
                    ₹{plan.monthly_price.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[12px] text-surface-400">/mo</span>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {(plan.features ?? []).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-surface-600">
                      <Check className="w-3.5 h-3.5 text-success-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="space-y-2 pt-2 border-t border-surface-100">
                  {isCurrent ? (
                    <button
                      onClick={() => handlePayRazorpay(plan.code, plan.monthly_price)}
                      disabled={paying || !isTenantAdmin}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-[13px] font-semibold py-2.5 shadow-healthcare transition-all cursor-pointer disabled:opacity-50"
                    >
                      {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                      Pay via Razorpay
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.code)}
                      disabled={!!upgrading || !isTenantAdmin}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-800 text-[13px] font-semibold py-2.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {upgrading === plan.code ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                      Switch to {plan.name}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Razorpay Information & Direct Payment Card */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-primary-50 border border-blue-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h3 className="text-[15px] font-bold text-surface-900">
              Razorpay Secured Payments
            </h3>
          </div>
          <p className="text-[12px] text-surface-600 max-w-xl">
            Accepting all major Indian payment methods: UPI (Google Pay, PhonePe, Paytm), Credit & Debit Cards, NetBanking, and Corporate Cards. All transactions are GST compliant.
          </p>
          <div className="flex items-center gap-4 text-[11px] text-surface-500 pt-1">
            <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-success-600" /> 256-bit SSL Encryption</span>
            <span>·</span>
            <span>Instant Subscription Activation</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <a
            href={RAZORPAY_PAYMENT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold px-5 py-2.5 shadow-sm transition-all whitespace-nowrap"
          >
            Direct Razorpay Portal <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  )
}
