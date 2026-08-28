import { Injectable, Logger } from '@nestjs/common'
import type {
  OtpInvalidReason,
  OtpProvider,
  OtpRequestContext,
  OtpRequestResult,
  OtpVerifyContext,
  OtpVerifyResult,
} from './otp-provider.interface.js'

/**
 * Normalise a phone into MSG91's expected format: international without `+`
 * (e.g. `+918825492600` / `8825492600` -> `918825492600`).
 */
function normalizeMobile(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  if (digits.length === 10) return `91${digits}`
  return digits
}

/**
 * India SMS/WhatsApp OTP adapter via MSG91 Auth (OTP) API v5.
 *
 * MSG91 generates, stores and rate-limits the code server-side; our app never
 * sees it. The code is delivered by MSG91 through the DLT-approved OTP template
 * (`template_id`). Verification is a single call to `/api/v5/otp/verify`.
 *
 * Activation (see docs/sms-dlt-provider.md):
 *   MSG91_AUTH_KEY   - MSG91 API Dashboard -> API & Automation auth key
 *   MSG91_TEMPLATE_ID- DLT-approved OTP template id from MSG91 panel's OTP section
 *
 * Optional:
 *   MSG91_OTP_LENGTH        (default 6)
 *   MSG91_OTP_EXPIRY_MINUTES (default 5)
 *   MSG91_BASE_URL          (default https://control.msg91.com — override for
 *                            a sandbox/mock so tests never spend real SMS)
 *
 * The factory only routes here when the auth key + template id are both set,
 * so absent config cleanly falls through to the Supabase/dev-fallback path.
 */
@Injectable()
export class Msg91OtpProvider implements OtpProvider {
  readonly name = 'msg91'
  private readonly logger = new Logger(Msg91OtpProvider.name)
  private readonly authKey = process.env.MSG91_AUTH_KEY ?? ''
  private readonly templateId = process.env.MSG91_TEMPLATE_ID ?? ''
  private readonly baseUrl = (process.env.MSG91_BASE_URL ?? 'https://control.msg91.com').replace(/\/$/, '')
  private readonly otpLength = Number(process.env.MSG91_OTP_LENGTH ?? 6)
  private readonly expiryMinutes = Number(process.env.MSG91_OTP_EXPIRY_MINUTES ?? 5)
  private readonly timeoutMs = 10_000

  private async post(url: URL): Promise<{ status: number; body: { type?: string; message?: string } | null }> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: this.authKey,
        },
        signal: controller.signal,
      })
      const body = (await res.json().catch(() => null)) as { type?: string; message?: string } | null
      return { status: res.status, body }
    } finally {
      clearTimeout(timer)
    }
  }

  async requestOtp(ctx: OtpRequestContext): Promise<OtpRequestResult> {
    const url = new URL(`${this.baseUrl}/api/v5/otp`)
    url.searchParams.set('template_id', this.templateId)
    url.searchParams.set('mobile', normalizeMobile(ctx.phone))
    url.searchParams.set('authkey', this.authKey)
    url.searchParams.set('otp_expiry', String(this.expiryMinutes))
    url.searchParams.set('otp_length', String(this.otpLength))

    const { status, body } = await this.post(url)
    const message = body?.message ?? `HTTP ${status}`

    if (status >= 200 && status < 300 && body?.type === 'success') {
      this.logger.log(`[OTP] MSG91 OTP requested for ${ctx.phone} (delivered by MSG91)`)
      return { delivered: true, expiresInSeconds: this.expiryMinutes * 60 }
    }

    this.logger.warn(`[OTP] MSG91 send failed for ${ctx.phone} (${status}): ${message}`)
    if (/rate.?limit|already|too many|wait|retry|again/i.test(message)) {
      return { delivered: false, message: 'OTP already sent. Please wait before requesting again', waitSeconds: 60 }
    }
    return { delivered: false, message: 'Could not send the verification code. Please try again later.', waitSeconds: 60 }
  }

  async verifyOtp(ctx: OtpVerifyContext): Promise<OtpVerifyResult> {
    const url = new URL(`${this.baseUrl}/api/v5/otp/verify`)
    url.searchParams.set('mobile', normalizeMobile(ctx.phone))
    url.searchParams.set('otp', ctx.code)
    url.searchParams.set('authkey', this.authKey)

    const { status, body } = await this.post(url)
    const message = body?.message ?? `HTTP ${status}`

    if (status >= 200 && status < 300 && body?.type === 'success') {
      this.logger.log(`[OTP] MSG91 verified ${ctx.phone} @ ${ctx.slug}`)
      return { valid: true }
    }

    this.logger.warn(`[OTP] MSG91 verify failed for ${ctx.phone}: ${message}`)
    const lowered = message.toLowerCase()
    if (/too many|rate.?limit|attempt|exceed/i.test(lowered)) return { valid: false, reason: this.reason('OTP_MAX_ATTEMPTS') }
    if (/expir/i.test(lowered)) return { valid: false, reason: this.reason('OTP_EXPIRED') }
    if (/invalid|wrong|incorrect|not verified|fail/i.test(lowered)) return { valid: false, reason: this.reason('OTP_INVALID') }
    return { valid: false, reason: this.reason('OTP_PROVIDER_ERROR') }
  }

  private reason(reason: OtpInvalidReason): OtpInvalidReason {
    return reason
  }
}