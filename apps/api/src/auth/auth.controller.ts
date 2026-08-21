import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common'
import type { AuthContext } from '@jioplix/contracts'
import { loginSchema, refreshSchema } from '@jioplix/contracts'
import { AuthService } from './auth.service.js'
import { CurrentAuth, Public } from './auth.decorators.js'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: unknown) {
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.auth.login(parsed.data) }
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
