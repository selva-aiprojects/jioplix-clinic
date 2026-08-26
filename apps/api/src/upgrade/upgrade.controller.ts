import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common'
import { UpgradeService } from './upgrade.service.js'
import { TenantGuard } from '../tenancy/tenant.guard.js'
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js'

@Controller('billing')
export class UpgradeController {
  constructor(private readonly us: UpgradeService) {}

  @Get('plans')
  async getPlans() {
    return this.us.getPlans()
  }

  @Post('upgrade')
  @UseGuards(TenantGuard)
  async upgrade(@Req() req: any, @Body() body: { planCode: string; discountCode?: string }) {
    return this.us.upgradePlan(req.tenantId, body.planCode, body.discountCode)
  }

  @Post('downgrade')
  @UseGuards(TenantGuard)
  async downgrade(@Req() req: any, @Body() body: { planCode: string }) {
    return this.us.downgradePlan(req.tenantId, body.planCode)
  }

  @Post('validate-discount')
  @UseGuards(TenantGuard)
  async validateDiscount(@Body() body: { code: string }) {
    return this.us.validateDiscount(body.code)
  }

  @Post('platform/extend-trial/:tenantId')
  @UseGuards(JwtAuthGuard)
  async extendTrial(@Param('tenantId') tenantId: string, @Body() body: { days: number }) {
    return this.us.applyTrialExtension(tenantId, body.days)
  }
}
