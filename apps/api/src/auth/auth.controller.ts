import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Post, UnauthorizedException } from '@nestjs/common'
import type { AuthContext } from '@jioplix/contracts'
import { loginSchema, refreshSchema, sendOtpSchema, verifyOtpSchema } from '@jioplix/contracts'
import { AuthService } from './auth.service.js'
import { OtpService } from './otp.service.js'
import { CurrentAuth, Public } from './auth.decorators.js'
import { verifySsoLaunchToken } from '@cybelinx/sdk'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly otp: OtpService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: unknown) {
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.auth.login(parsed.data) }
  }

  @Public()
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() body: unknown) {
    const parsed = sendOtpSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.otp.sendOtp(parsed.data) }
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: unknown) {
    const parsed = verifyOtpSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')

    // First verify the OTP
    const result = await this.otp.verifyOtp(parsed.data)
    if (!result.verified) throw new BadRequestException('OTP_INVALID')

    // Then issue a session via OTP-based login
    const session = await this.auth.loginByOtp(parsed.data)
    return { data: session }
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: unknown) {
    const parsed = refreshSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.auth.refresh(parsed.data.refreshToken) }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body: unknown) {
    const parsed = refreshSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.auth.logout(parsed.data.refreshToken) }
  }

  @Get('me')
  async me(@CurrentAuth() auth: AuthContext) {
    return { data: await this.auth.me(auth) }
  }

  /**
   * Cybelinx Platform SSO — accepts a signed launch token issued by the
   * Cybelinx central platform and returns a local Jioplix session.
   * The CYBELINX_SSO_SECRET env var must match the secret configured on
   * the Cybelinx platform side.
   */
  @Public()
  @Post('sso/exchange')
  @HttpCode(HttpStatus.OK)
  async ssoExchange(@Body() body: unknown) {
    const { token } = body as { token?: string }
    if (!token) throw new BadRequestException('SSO_TOKEN_REQUIRED')
    const secret = process.env.CYBELINX_SSO_SECRET
    if (!secret) throw new BadRequestException('SSO_NOT_CONFIGURED')
    let payload
    try {
      payload = verifySsoLaunchToken(token, secret)
    } catch {
      throw new UnauthorizedException('SSO_TOKEN_INVALID')
    }
    // Map the Cybelinx sub (user identifier) to a local session
    const session = await this.auth.loginBySsoPayload(payload)
    return { data: session }
  }
}
