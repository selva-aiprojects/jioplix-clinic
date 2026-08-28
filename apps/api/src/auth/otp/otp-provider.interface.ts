/**
 * OTP provider seam (Ports & Adapters).
 *
 * The auth endpoints (`/auth/send-otp`, `/auth/verify-otp`) are the port;
 * each provider is an adapter. Selection is done per-request by
 * `OtpProviderFactory`, driven by env + phone allowlist — never by account
 * state. See `docs/phone-otp-provider-design.md`.
 */

export interface OtpRequestContext {
  /** Tenant schema name (reserved for tenant-scoped storage). */
  schemaName: string
  /** Tenant slug (used to scope local OTP records). */
  slug: string
  /** E.164-ish phone number as submitted by the client. */
  phone: string
}

export interface OtpVerifyContext {
  schemaName: string
  slug: string
  phone: string
  code: string
}

export interface OtpRequestDelivered {
  delivered: true
  expiresInSeconds: number
  /** Present ONLY when the code may be shown on-screen (demo path). */
  demoCode?: string
}

export interface OtpRequestRateLimited {
  delivered: false
  message: string
  waitSeconds: number
}

export type OtpRequestResult = OtpRequestDelivered | OtpRequestRateLimited

export type OtpInvalidReason = 'OTP_INVALID' | 'OTP_MAX_ATTEMPTS' | 'OTP_EXPIRED' | 'OTP_PROVIDER_ERROR'

export interface OtpVerifyResult {
  valid: boolean
  reason?: OtpInvalidReason
}

export interface OtpProvider {
  readonly name: string
  requestOtp(ctx: OtpRequestContext): Promise<OtpRequestResult>
  verifyOtp(ctx: OtpVerifyContext): Promise<OtpVerifyResult>
}