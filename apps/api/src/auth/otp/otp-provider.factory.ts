import { Injectable } from '@nestjs/common'
import { DemoOtpProvider } from './demo-otp.provider.js'
import { Msg91OtpProvider } from './msg91-otp.provider.js'
import { SupabaseOtpProvider } from './supabase-otp.provider.js'
import type { OtpProvider } from './otp-provider.interface.js'

/** Demo OTP is only reachable on these tenant slugs. */
const DEMO_CLINICS = new Set(['nova'])
/** Default allowlist = seeded demo users on the primary demo tenant. */
const DEFAULT_DEMO_ALLOWLIST = [
  '+919800000101',
  '+919800000102',
  '+919800000201',
  '+919800000202',
  '+919800000203',
]

function demoAllowlist(): string[] {
  return process.env.DEMO_OTP_ALLOWLIST?.split(',').map((p) => p.trim()).filter(Boolean) ?? DEFAULT_DEMO_ALLOWLIST
}

/**
 * SECURITY-CRITICAL selection rule (see docs/phone-otp-provider-design.md §4):
 *
 *   provider =
 *     (DEMO_OTP_ENABLED === 'true' && slug is a demo clinic && DEMO_OTP_ALLOWLIST.contains(phone))
 *       ? DemoOtpProvider
 *       : (MSG91_AUTH_KEY && MSG91_TEMPLATE_ID)
 *           ? Msg91OtpProvider
 *           : SupabaseOtpProvider
 *
 * Any phone NOT on the allowlist ALWAYS goes to a real provider, regardless of
 * account state — so the static on-screen code can never verify an arbitrary
 * real number. MSG91, when configured, wins over Supabase as the delivery
 * engine; neither is ever bypassed for validation.
 */
@Injectable()
export class OtpProviderFactory {
  constructor(
    private readonly demo: DemoOtpProvider,
    private readonly msg91: Msg91OtpProvider,
    private readonly supabase: SupabaseOtpProvider,
  ) {}

  resolve(ctx: { slug: string; phone: string }): OtpProvider {
    const isDemo =
      process.env.DEMO_OTP_ENABLED === 'true' &&
      DEMO_CLINICS.has(ctx.slug) &&
      demoAllowlist().includes(ctx.phone)
    if (isDemo) return this.demo
    if (process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID) return this.msg91
    return this.supabase
  }
}