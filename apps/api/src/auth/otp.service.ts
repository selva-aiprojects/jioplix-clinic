import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { createHash, randomInt } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import type { SendOtpRequest, VerifyOtpRequest } from '@jioplix/contracts'
import { newId } from '@jioplix/contracts'
import { DbService } from '../db/db.service.js'
import { MailerService } from '../mailer/mailer.service.js'

interface OtpRow {
  id: string
  phone: string
  clinic_slug: string
  otp_hash: string
  expires_at: Date
  verified: boolean
  attempts: number
  created_at: Date
}

interface TenantRow {
  id: string
  name: string
  slug: string
  schema_name: string
  clinic_type: string
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name)
  private readonly OTP_LENGTH = 6
  private readonly OTP_TTL_MS = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_ATTEMPTS = 5
  private readonly RATE_LIMIT_MS = 60 * 1000 // 1 minute between OTPs

  constructor(
    private readonly db: DbService,
    private readonly mailer: MailerService,
  ) {}

  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex')
  }

  private generateOtp(): string {
    return String(randomInt(100000, 999999))
  }

  async sendOtp(input: SendOtpRequest): Promise<{ message: string; expiresIn: number }> {
    const slug = input.clinic.trim().toLowerCase()
    const phone = input.phone.trim()

    // Verify clinic exists
    const { rows: tenants } = await this.db.pool.query<TenantRow>(
      `SELECT id, name, slug, schema_name, clinic_type FROM public.tenants WHERE slug = $1 AND status = 'active'`,
      [slug],
    )
    if (!tenants[0]) {
      // Don't reveal whether clinic exists — return same message
      return { message: 'OTP sent to your phone number', expiresIn: Math.floor(this.OTP_TTL_MS / 1000) }
    }

    // Check rate limit — last OTP within 1 minute
    const { rows: recentOtps } = await this.db.pool.query<Pick<OtpRow, 'created_at'>>(
      `SELECT created_at FROM public.otp_requests WHERE phone = $1 AND clinic_slug = $2 ORDER BY created_at DESC LIMIT 1`,
      [phone, slug],
    )
    if (recentOtps[0]) {
      const elapsed = Date.now() - new Date(recentOtps[0].created_at).getTime()
      if (elapsed < this.RATE_LIMIT_MS) {
        const waitSec = Math.ceil((this.RATE_LIMIT_MS - elapsed) / 1000)
        return { message: `OTP already sent. Please wait ${waitSec}s before requesting again`, expiresIn: waitSec }
      }
    }

    // Invalidate any unverified OTPs for this phone+clinic
    await this.db.pool.query(
      `UPDATE public.otp_requests SET verified = true WHERE phone = $1 AND clinic_slug = $2 AND verified = false`,
      [phone, slug],
    )

    // Generate and store OTP
    const otp = this.generateOtp()
    const otpHash = this.hashOtp(otp)
    const expiresAt = new Date(Date.now() + this.OTP_TTL_MS)

    await this.db.pool.query(
      `INSERT INTO public.otp_requests (id, phone, clinic_slug, otp_hash, expires_at, verified, attempts) VALUES ($1, $2, $3, $4, $5, false, 0)`,
      [newId(), phone, slug, otpHash, expiresAt],
    )

    // Send OTP via SMS (stub for demo — logs to console)
    this.logger.log(`OTP for ${phone} @ ${slug}: ${otp}`)
    await this.sendSms(phone, `Your Jioplix verification code is ${otp}. It expires in 5 minutes.`)

    return { message: 'OTP sent to your phone number', expiresIn: Math.floor(this.OTP_TTL_MS / 1000) }
  }

  private async sendSms(phone: string, message: string): Promise<void> {
    await this.mailer.sendSms({ phone, message })
  }

  async verifyOtp(input: VerifyOtpRequest): Promise<{ verified: boolean; token?: string }> {
    const slug = input.clinic.trim().toLowerCase()
    const phone = input.phone.trim()
    const otp = input.otp.trim()

    // Find the latest unverified, non-expired OTP
    const { rows: otpRows } = await this.db.pool.query<OtpRow>(
      `SELECT * FROM public.otp_requests
       WHERE phone = $1 AND clinic_slug = $2 AND verified = false AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1`,
      [phone, slug],
    )

    if (!otpRows[0]) {
      throw new UnauthorizedException('OTP_EXPIRED')
    }

    const record = otpRows[0]

    // Check max attempts
    if (record.attempts >= this.MAX_ATTEMPTS) {
      // Mark as verified to prevent further attempts
      await this.db.pool.query(
        `UPDATE public.otp_requests SET verified = true WHERE id = $1`,
        [record.id],
      )
      throw new UnauthorizedException('OTP_MAX_ATTEMPTS')
    }

    // Increment attempts
    await this.db.pool.query(
      `UPDATE public.otp_requests SET attempts = attempts + 1 WHERE id = $1`,
      [record.id],
    )

    // Verify OTP hash
    const inputHash = this.hashOtp(otp)
    if (inputHash !== record.otp_hash) {
      const remaining = this.MAX_ATTEMPTS - record.attempts - 1
      if (remaining <= 0) {
        throw new UnauthorizedException('OTP_MAX_ATTEMPTS')
      }
      throw new UnauthorizedException('OTP_INVALID')
    }

    // Mark as verified
    await this.db.pool.query(
      `UPDATE public.otp_requests SET verified = true WHERE id = $1`,
      [record.id],
    )

    this.logger.log(`OTP verified for ${phone} @ ${slug}`)
    return { verified: true }
  }
}
