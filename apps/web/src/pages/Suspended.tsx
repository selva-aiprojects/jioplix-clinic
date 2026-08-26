import { Link } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, Clock, CreditCard, ExternalLink, Mail, Phone,
} from 'lucide-react'
import BrandLogo from '../components/BrandLogo'
import { RAZORPAY_PAYMENT_LINK } from '../lib/api'

export default function Suspended() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-6">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <BrandLogo variant="pure" size="2xl" />
        </div>

        <div className="w-16 h-16 mx-auto rounded-full bg-danger-50 flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-danger-600" />
        </div>

        <h1 className="text-2xl font-bold text-surface-900 tracking-tight mb-2">
          Account Suspended
        </h1>
        <p className="text-[14px] text-surface-500 mb-8 leading-relaxed">
          Your clinic&apos;s Jioplix access has been temporarily suspended due to an
          expired subscription. Please renew your plan to restore access.
        </p>

        {/* ─── Primary CTA: Razorpay Payment ─── */}
        <a
          href={RAZORPAY_PAYMENT_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-primary-600 px-5 py-3.5 text-[14px] font-bold text-white shadow-healthcare hover:bg-primary-700 transition-all"
        >
          <CreditCard className="w-4.5 h-4.5" />
          Pay now to restore access
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </a>
        <p className="text-[11px] text-surface-400 mt-2.5">
          Secure payment via Razorpay — all major cards, UPI &amp; net banking accepted
        </p>

        {/* ─── How it works ─── */}
        <div className="bg-white rounded-xl border border-surface-200 p-6 mt-6 mb-6 text-left space-y-4">
          <h2 className="text-[14px] font-bold text-surface-900">How to restore access</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[12px] font-bold text-primary-700">1</span>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-surface-900">Click &ldquo;Pay now&rdquo; above</p>
                <p className="text-[12px] text-surface-500">Choose your plan and complete payment on Razorpay.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[12px] font-bold text-primary-700">2</span>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-surface-900">Share payment confirmation</p>
                <p className="text-[12px] text-surface-500">Email or call us with your payment reference to get reactivated instantly.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-success-50 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-success-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-surface-900">Instant restoration</p>
                <p className="text-[12px] text-surface-500">Once confirmed, your access is restored immediately — no data lost.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Contact Support ─── */}
        <div className="bg-surface-50 rounded-xl border border-surface-200 p-5 mb-6">
          <p className="text-[12px] font-semibold text-surface-700 mb-3">Need help? Contact Sales</p>
          <div className="flex flex-col gap-2">
            <a href="mailto:sales@jioplix.com" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-surface-200 text-[13px] font-semibold text-surface-700 hover:border-primary-300 hover:bg-primary-50/60 transition-all">
              <Mail className="w-4 h-4 text-primary-600" />
              sales@jioplix.com
            </a>
            <a href="tel:+9118001234567" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-surface-200 text-[13px] font-semibold text-surface-700 hover:border-primary-300 hover:bg-primary-50/60 transition-all">
              <Phone className="w-4 h-4 text-primary-600" />
              +91 1800-123-4567 (Toll Free)
            </a>
          </div>
        </div>

        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-primary-600 hover:text-primary-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
