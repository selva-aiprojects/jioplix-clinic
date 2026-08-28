import { Injectable, Logger } from '@nestjs/common'
import { createHash, randomInt } from 'node:crypto'
import { newId } from '@jioplix/contracts'
import { DbService } from '../../db/db.service.js'
import type { OtpInvalidReason, OtpVerifyResult } from './otp-provider.interface.js'

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

export interface LocalOtpCreated {
  delivered: true
  expiresInSeconds: number
  otp: string
}

export interface LocalOtpRateLimited {
  delivered: false
  message: string
  waitSeconds: number
}

/**
 * In-database OTP store. The code is stored hashed (sha256), is single-use,
 * expires after a TTL, and survives a max-attempt bound. Shared by the demo
 * provider and the non-Supabase fallback path.
 */
@Injectable()
export class LocalOtpStore {
  private readonly logger = new Logger(LocalOtpStore.name)
  private readonly OTP_LENGTH = 6
  private readonly OTP_TTL_MS =
    Number(process.env.DEMO_OTP_TTL_SECONDS ?? 300) * 1000
  private readonly MAX_ATTEMPTS = 5
  private readonly RATE_LIMIT_MS = 60 * 1000

  constructor(private readonly db: DbService) {}

  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex')
  }

  private generateOtp(): string {
    return String(randomInt(100000, 999999))
  }

  /**
   * Creates (and stores) a fresh OTP for `phone` on tenant `slug`.
   * Enforces a 1-minute send rate limit and invalidates any prior
   * unverified code for the same phone+slug.
   */
  async create(slug: string, phone: string): Promise<LocalOtpCreated | LocalOtpRateLimited> {
    const { rows: recentOtps } = await this.db.pool.query<Pick<OtpRow, 'created_at'>>(
      `SELECT created_at FROM public.otp_requests WHERE phone = $1 AND clinic_slug = $2 ORDER BY created_at DESC LIMIT 1`,
      [phone, slug],
    )
    if (recentOtps[0]) {
      const elapsed = Date.now() - new Date(recentOtps[0].created_at).getTime()
      if (elapsed < this.RATE_LIMIT_MS) {
        const waitSec = Math.ceil((this.RATE_LIMIT_MS - elapsed) / 1000)
        return {
          delivered: false,
          message: `OTP already sent. Please wait ${waitSec}s before requesting again`,
          waitSeconds: waitSec,
        }
      }
    }

    await this.db.pool.query(
      `UPDATE public.otp_requests SET verified = true WHERE phone = $1 AND clinic_slug = $2 AND verified = false`,
      [phone, slug],
    )

    const otp = this.generateOtp()
    const otpHash = this.hashOtp(otp)
    const expiresAt = new Date(Date.now() + this.OTP_TTL_MS)

    await this.db.pool.query(
      `INSERT INTO public.otp_requests (id, phone, clinic_slug, otp_hash, expires_at, verified, attempts) VALUES ($1, $2, $3, $4, $5, false, 0)`,
      [newId(), phone, slug, otpHash, expiresAt],
    )

    return { delivered: true, expiresInSeconds: Math.floor(this.OTP_TTL_MS / 1000), otp }
  }

  async verify(slug: string, phone: string, code: string): Promise<OtpVerifyResult> {
    const { rows: otpRows } = await this.db.pool.query<OtpRow>(
      `SELECT * FROM public.otp_requests
       WHERE phone = $1 AND clinic_slug = $2 AND verified = false AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1`,
      [phone, slug],
    )

    if (!otpRows[0]) return { valid: false, reason: 'OTP_EXPIRED' as OtpInvalidReason }

    const record = otpRows[0]

    if (record.attempts >= this.MAX_ATTEMPTS) {
      await this.db.pool.query(`UPDATE public.otp_requests SET verified = true WHERE id = $1`, [record.id])
      return { valid: false, reason: 'OTP_MAX_ATTEMPTS' as OtpInvalidReason }
    }

    await this.db.pool.query(`UPDATE public.otp_requests SET attempts = attempts + 1 WHERE id = $1`, [record.id])

    if (this.hashOtp(code) !== record.otp_hash) {
      const remaining = this.MAX_ATTEMPTS - record.attempts - 1
      if (remaining <= 0) {
        return { valid: false, reason: 'OTP_MAX_ATTEMPTS' as OtpInvalidReason }
      }
      return { valid: false, reason: 'OTP_INVALID' as OtpInvalidReason }
    }

    await this.db.pool.query(`UPDATE public.otp_requests SET verified = true WHERE id = $1`, [record.id])
    this.logger.log(`OTP verified for ${phone} @ ${slug}`)
    return { valid: true }
  }
}