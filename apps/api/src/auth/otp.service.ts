import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import type { SendOtpRequest, SendOtpResponse, VerifyOtpRequest } from '@jioplix/contracts'
import { DbService } from '../db/db.service.js'
import { OtpProviderFactory } from './otp/otp-provider.factory.js'

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

  constructor(
    private readonly db: DbService,
    private readonly providers: OtpProviderFactory,
  ) {}

  async sendOtp(input: SendOtpRequest): Promise<SendOtpResponse> {
    const slug = input.clinic.trim().toLowerCase()
    const phone = input.phone.trim()

    // Resolve the clinic (schema reserved for future tenant-scoped storage).
    const { rows: tenants } = await this.db.pool.query<TenantRow>(
      `SELECT id, name, slug, schema_name, clinic_type FROM public.tenants WHERE slug = $1 AND status = 'active'`,
      [slug],
    )
    if (!tenants[0]) {
      // Don't reveal whether the clinic exists — return the same message.
      return { message: 'OTP sent to your phone number', expiresIn: 300 }
    }
    const schemaName = tenants[0].schema_name

    const provider = this.providers.resolve({ slug, phone })
    const result = await provider.requestOtp({ schemaName, slug, phone })

    if (!result.delivered) {
      return { message: result.message, expiresIn: result.waitSeconds }
    }
    if (result.demoCode) {
      this.logger.log(`[DEMO OTP] returned on screen for ${phone} @ ${slug}`)
      return {
        message: 'Demo OTP shown on screen',
        expiresIn: result.expiresInSeconds,
        demoCode: result.demoCode,
      }
    }
    return { message: 'OTP sent to your phone number', expiresIn: result.expiresInSeconds }
  }

  async verifyOtp(input: VerifyOtpRequest): Promise<{ verified: boolean }> {
    const slug = input.clinic.trim().toLowerCase()
    const phone = input.phone.trim()
    const code = input.otp.trim()

    const provider = this.providers.resolve({ slug, phone })
    const result = await provider.verifyOtp({ schemaName: '', slug, phone, code })

    if (!result.valid) {
      if (result.reason === 'OTP_EXPIRED') throw new UnauthorizedException('OTP_EXPIRED')
      if (result.reason === 'OTP_MAX_ATTEMPTS') throw new UnauthorizedException('OTP_MAX_ATTEMPTS')
      if (result.reason === 'OTP_PROVIDER_ERROR') throw new UnauthorizedException('OTP_PROVIDER_ERROR')
      throw new UnauthorizedException('OTP_INVALID')
    }
    return { verified: true }
  }
}