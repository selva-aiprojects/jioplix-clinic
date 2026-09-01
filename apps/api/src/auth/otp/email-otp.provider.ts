import { Injectable, Logger } from '@nestjs/common'
import { DbService } from '../../db/db.service.js'
import { MailerService } from '../../mailer/mailer.service.js'
import { LocalOtpStore } from './local-otp.store.js'
import type { OtpProvider, OtpRequestContext, OtpRequestResult, OtpVerifyContext, OtpVerifyResult } from './otp-provider.interface.js'

const GENERIC_FAIL = 'Could not send the verification code. Please try again later.'

interface UserEmailRow {
  full_name: string
  email: string
}

/**
 * Cost-free delivery adapter: sends the OTP to the user's registered email
 * (₹0, no DLT, no SMS aggregator). Phone stays the login identity, so the
 * client API contract is unchanged — only the delivery channel differs.
 *
 * Rules:
 *   - The recipient email is looked up by the submitted phone in the tenant's
 *     `users` table, never taken from the request body.
 *   - Without `RESEND_API_KEY` (dev/staging) the code is logged to the server
 *     console (`[EMAIL STUB] …`) so local workflows keep working; it is never
 *     exposed to the client.
 *   - In production a missing/empty email means the code cannot be delivered,
 *     so `requestOtp` fails closed with a generic message (no existence leak).
 */
@Injectable()
export class EmailOtpProvider implements OtpProvider {
  readonly name = 'email'
  private readonly logger = new Logger(EmailOtpProvider.name)
  private readonly devMode = !process.env.RESEND_API_KEY

  constructor(
    private readonly store: LocalOtpStore,
    private readonly db: DbService,
    private readonly mailer: MailerService,
  ) {}

  private async findEmail(ctx: OtpRequestContext): Promise<UserEmailRow | null> {
    const schema = ctx.schemaName
    if (!/^[a-z][a-z0-9_]{0,62}$/.test(schema)) {
      this.logger.warn('[OTP] Refusing email lookup on suspicious tenant schema')
      return null
    }
    const { rows } = await this.db.pool.query<UserEmailRow>(
      `SELECT full_name, email FROM ${schema}.users
       WHERE phone = $1 AND status = 'active'
         AND email IS NOT NULL AND email <> ''
       LIMIT 1`,
      [ctx.phone],
    )
    return rows[0] ?? null
  }

  async requestOtp(ctx: OtpRequestContext): Promise<OtpRequestResult> {
    const created = await this.store.create(ctx.slug, ctx.phone)
    if (!created.delivered) {
      return { delivered: false, message: created.message, waitSeconds: created.waitSeconds }
    }

    const recipient = await this.findEmail(ctx)
    if (!recipient) {
      if (!this.devMode) {
        this.logger.warn(`[OTP] No email on file for ${ctx.phone} @ ${ctx.slug} — delivery skipped (prod)`)
        return { delivered: false, message: GENERIC_FAIL, waitSeconds: 60 }
      }
      this.logger.log(`[EMAIL STUB] OTP for ${ctx.phone} @ ${ctx.slug}: ${created.otp} (no email on file)`)
      return { delivered: true, expiresInSeconds: created.expiresInSeconds }
    }

    const clinicName = ctx.clinicName ?? ctx.slug
    const sent = await this.mailer.sendEmail({
      to: recipient.email,
      subject: `Your ${clinicName} login code — Jioplix`,
      html: this.renderOtpEmail(recipient.full_name, created.otp, clinicName),
      text: `Your ${clinicName} verification code is ${created.otp}. It expires in ${created.expiresInSeconds} seconds. — Jioplix`,
    })

    if (!sent) {
      this.logger.error(`[OTP] Email delivery failed for ${ctx.phone} @ ${ctx.slug} (${recipient.email})`)
      return { delivered: false, message: GENERIC_FAIL, waitSeconds: 60 }
    }

    this.logger.log(
      this.devMode
        ? `[EMAIL STUB] OTP for ${ctx.phone} @ ${ctx.slug}: ${created.otp} (to ${recipient.email})`
        : `[OTP] Email OTP sent to ${recipient.email} for ${ctx.phone} @ ${ctx.slug}`,
    )
    return { delivered: true, expiresInSeconds: created.expiresInSeconds }
  }

  async verifyOtp(ctx: OtpVerifyContext): Promise<OtpVerifyResult> {
    return this.store.verify(ctx.slug, ctx.phone, ctx.code)
  }

  private renderOtpEmail(fullName: string, otp: string, clinicName: string): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #f7fbff; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #1265e8; font-size: 24px; margin: 0;">Jioplix Verification</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 8px;">Hi ${fullName}, your login code for ${clinicName} is ready.</p>
        </div>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; text-align: center;">
          <p style="color: #64748b; font-size: 13px; margin: 0 0 8px 0;">Your verification code</p>
          <p style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 0.3em; color: #1e293b; margin: 0;">${otp}</p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
          If you didn't request this code, you can safely ignore this email. — Jioplix, AI-Powered Clinic Operating System
        </p>
      </div>
    `
  }
}