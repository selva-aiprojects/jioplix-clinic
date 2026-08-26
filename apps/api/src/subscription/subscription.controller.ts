import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common'
import type { AuthContext } from '@jioplix/contracts'
import { SubscriptionService } from './subscription.service.js'
import { CurrentAuth } from '../auth/auth.decorators.js'
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js'
import type { TenantContext } from '../tenancy/tenant.guard.js'

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscription: SubscriptionService) {}

  @Get('current')
  async getCurrent(@CurrentTenant() tenant: TenantContext) {
    const sub = await this.subscription.getActiveSubscription(tenant.id)
    return { data: sub }
  }

  @Get('history')
  async getHistory(@CurrentTenant() tenant: TenantContext) {
    const history = await this.subscription.getSubscriptionHistory(tenant.id)
    return { data: history }
  }

  @Post('renew')
  @HttpCode(HttpStatus.OK)
  async renew(
    @CurrentTenant() tenant: TenantContext,
    @Body() body: { planCode?: string },
  ) {
    const sub = await this.subscription.renewSubscription(tenant.id, body.planCode)
    return { data: sub }
  }

  @Get('invoices')
  async getInvoices(@CurrentTenant() tenant: TenantContext) {
    const invoices = await this.subscription.getTenantInvoices(tenant.id)
    return { data: invoices }
  }
}
