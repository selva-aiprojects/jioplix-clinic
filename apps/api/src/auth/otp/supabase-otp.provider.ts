import { Injectable, Logger } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { MailerService } from '../../mailer/mailer.service.js'
import { LocalOtpStore } from './local-otp.store.js'
import type { OtpProvider, OtpRequestContext, OtpRequestResult, OtpVerifyContext, OtpVerifyResult } from './otp-provider.interface.js'

/** Supabase phone OTP default lifetime is 1 hour (expiry for OTP: 3600s). */
const SUPABASE_OTP_EXPIRY_SECONDS = 3600

/**
 * Real (production) OTP adapter.
 *
 * When `SUPABASE_URL` + a Supabase key are configured, OTP issuance and
 * verification are delegated entirely to Supabase Auth (which generates the
 * code, rate-limits, and delivers via the attached India SMS/WhatsApp
 * provider). Our app never sees the code — it only records `supabase` as the
 * delivery channel and issues our own session JWT after a successful verify.
 *
 * When Supabase is NOT configured, the provider falls back to a self-contained
 * local path: DB-stored hashed OTP from `LocalOtpStore` with the code logged
 * to the server console (dev/staging only, never exposed to the client). This
 * keeps non-allowlisted numbers functional before product sign-off without
 * opening the demo `demoCode` backdoor.
 */
@Injectable()
export class SupabaseOtpProvider implements OtpProvider {
  readonly name = 'supabase'
  private readonly logger = new Logger(SupabaseOtpProvider.name)
  private supabase: SupabaseClient | null = null

  constructor(
    private readonly store: LocalOtpStore,
    private readonly mailer: MailerService,
  ) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY
    if (url && key) {
      this.supabase = createClient(url, key)
      this.logger.log('[OTP] Supabase Auth configured — OTP issued/verified by Supabase')
    } else {
      this.logger.warn(
        '[OTP] SUPABASE_URL / key not set — OTP falls back to DB store + SMS console stub (dev mode)',
      )
    }
  }

  async requestOtp(ctx: OtpRequestContext): Promise<OtpRequestResult> {
    if (this.supabase) {
      const { error } = await this.supabase.auth.signInWithOtp({ phone: ctx.phone })
      if (error) {
        this.logger.error(`[OTP] Supabase signInWithOtp failed for ${ctx.phone}`, error)
        if (/rate.?limit/i.test(error.message) || /too many/i.test(error.message)) {
          return {
            delivered: false,
            message: 'OTP already sent. Please wait before requesting again',
            waitSeconds: 60,
          }
        }
        return {
          delivered: false,
          message: 'Could not send the verification code. Please try again later.',
          waitSeconds: 60,
        }
      }
      this.logger.log(`[OTP] SMS OTP requested for ${ctx.phone} (Supabase delivery)`)
      return { delivered: true, expiresInSeconds: SUPABASE_OTP_EXPIRY_SECONDS }
    }

    // ── Dev fallback: self-contained OTP, console-logged SMS ──────────────
    const created = await this.store.create(ctx.slug, ctx.phone)
    if (!created.delivered) {
      return { delivered: false, message: created.message, waitSeconds: created.waitSeconds }
    }
    this.logger.log(`[SMS STUB] OTP for ${ctx.phone} @ ${ctx.slug}: ${created.otp} (Supabase not configured)`)
    await this.mailer.sendSms({
      phone: ctx.phone,
      message: `Your Jioplix verification code is ${created.otp}. It expires in 5 minutes.`,
    })
    return { delivered: true, expiresInSeconds: created.expiresInSeconds }
  }

  async verifyOtp(ctx: OtpVerifyContext): Promise<OtpVerifyResult> {
    if (this.supabase) {
      const { error } = await this.supabase.auth.verifyOtp({
        phone: ctx.phone,
        token: ctx.code,
        type: 'sms',
      })
      if (error) {
        this.logger.warn(`[OTP] Supabase verifyOtp failed for ${ctx.phone}: ${error.message}`)
        const msg = error.message.toLowerCase()
        if (/too many/i.test(msg) || /rate.?limit/i.test(msg)) {
          return { valid: false, reason: 'OTP_MAX_ATTEMPTS' }
        }
        if (/expire/i.test(msg)) return { valid: false, reason: 'OTP_EXPIRED' }
        if (/invalid/i.test(msg)) return { valid: false, reason: 'OTP_INVALID' }
        return { valid: false, reason: 'OTP_PROVIDER_ERROR' }
      }
      this.logger.log(`[OTP] Supabase verified ${ctx.phone} @ ${ctx.slug}`)
      return { valid: true }
    }

    return this.store.verify(ctx.slug, ctx.phone, ctx.code)
  }
}