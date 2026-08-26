import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common'
import { EngagementService } from './engagement.service.js'
import { TenantGuard } from '../tenancy/tenant.guard.js'
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js'
import type { TenantContext } from '../tenancy/tenant.guard.js'
import { RequirePermissions } from '../auth/auth.decorators.js'

@Controller('engagement')
@UseGuards(TenantGuard)
export class EngagementController {
  constructor(private readonly engagement: EngagementService) {}

  @Get('campaigns')
  @RequirePermissions('campaigns:read')
  async listCampaigns(@CurrentTenant() tenant: TenantContext) {
    return { data: await this.engagement.listCampaigns(tenant.schemaName) }
  }

  @Post('campaigns')
  @RequirePermissions('campaigns:write')
  async createCampaign(
    @CurrentTenant() tenant: TenantContext,
    @Body() body: { name: string; type: string; template?: string; audience?: string },
  ) {
    return {
      data: await this.engagement.createCampaign(tenant.schemaName, {
        name: body.name,
        type: body.type as 'whatsapp' | 'sms' | 'email',
        template: body.template,
        audience: body.audience,
      }),
    }
  }

  @Patch('campaigns/:id/status')
  @RequirePermissions('campaigns:write')
  async updateCampaignStatus(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    const updated = await this.engagement.updateCampaignStatus(
      tenant.schemaName,
      id,
      status as 'draft' | 'active' | 'completed' | 'paused',
    )
    return { data: updated }
  }

  @Get('campaigns/templates')
  @RequirePermissions('campaigns:read')
  async listTemplates(@CurrentTenant() tenant: TenantContext) {
    return { data: await this.engagement.listTemplates(tenant.schemaName) }
  }
}
