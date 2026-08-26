import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common'
import { PasswordResetService } from './password-reset.service.js'
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js'

@Controller('platform')
@UseGuards(JwtAuthGuard)
export class PlatformTenantController {
  constructor(private readonly prs: PasswordResetService) {}

  @Get('tenants/:tenantId/users')
  async getTenantUsers(@Param('tenantId') tenantId: string) {
    return this.prs.getTenantUsers(tenantId)
  }

  @Post('tenants/:tenantId/users/reset-password')
  async resetTenantUserPassword(
    @Param('tenantId') tenantId: string,
    @Body() body: { email: string; newPassword: string },
  ) {
    return this.prs.resetTenantUserPassword(tenantId, body.email, body.newPassword)
  }
}
