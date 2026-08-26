import { Controller, Post, Body, BadRequestException } from '@nestjs/common'
import { PasswordResetService } from './password-reset.service.js'

@Controller('auth')
export class PasswordResetController {
  constructor(private readonly prs: PasswordResetService) {}

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    if (!body.email) throw new BadRequestException('Email required')
    const origin = 'https://jioplix-clinic.vercel.app'
    return this.prs.requestReset(body.email, origin)
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; email: string; newPassword: string }) {
    if (!body.token || !body.email || !body.newPassword) throw new BadRequestException('All fields required')
    return this.prs.resetPassword(body.token, body.email, body.newPassword)
  }
}
