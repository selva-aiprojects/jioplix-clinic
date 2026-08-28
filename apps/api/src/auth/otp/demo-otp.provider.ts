import { Injectable, Logger } from '@nestjs/common'
import { LocalOtpStore } from './local-otp.store.js'
import type { OtpProvider, OtpRequestContext, OtpRequestResult, OtpVerifyContext, OtpVerifyResult } from './otp-provider.interface.js'

/**
 * Demo/allowlist adapter. Generates the code, stores it hashed, and returns
 * the plaintext `demoCode` so the web UI can render "Demo OTP: 123456".
 * No SMS is ever sent. Selection is allowlist + env gated (see factory), so
 * this can never verify an arbitrary real number.
 */
@Injectable()
export class DemoOtpProvider implements OtpProvider {
  readonly name = 'demo'
  private readonly logger = new Logger(DemoOtpProvider.name)

  constructor(private readonly store: LocalOtpStore) {}

  async requestOtp(ctx: OtpRequestContext): Promise<OtpRequestResult> {
    const created = await this.store.create(ctx.slug, ctx.phone)
    if (!created.delivered) {
      return { delivered: false, message: created.message, waitSeconds: created.waitSeconds }
    }
    this.logger.log(`[DEMO OTP] ${ctx.phone} @ ${ctx.slug}: ${created.otp}`)
    return { delivered: true, expiresInSeconds: created.expiresInSeconds, demoCode: created.otp }
  }

  async verifyOtp(ctx: OtpVerifyContext): Promise<OtpVerifyResult> {
    return this.store.verify(ctx.slug, ctx.phone, ctx.code)
  }
}