import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common'
import type { AuthContext } from '@jioplix/contracts'
import { loginSchema, refreshSchema, sendOtpSchema, verifyOtpSchema } from '@jioplix/contracts'
import { AuthService } from './auth.service.js'
import { OtpService } from './otp.service.js'
import { CurrentAuth, Public } from './auth.decorators.js'

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
}
