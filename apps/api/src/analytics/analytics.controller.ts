import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AnalyticsService } from './analytics.service.js'
import { TenantGuard } from '../tenancy/tenant.guard.js'
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js'
import type { TenantContext } from '../tenancy/tenant.guard.js'
import { RequirePermissions } from '../auth/auth.decorators.js'

@Controller('analytics')
@UseGuards(TenantGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  @RequirePermissions('invoices:read')
  async summary(
    @CurrentTenant() tenant: TenantContext,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('branchId') branchId?: string,
  ) {
    return { data: await this.analytics.getSummary(tenant.schemaName, dateFrom, dateTo, branchId) }
  }

  @Get('revenue')
  @RequirePermissions('invoices:read')
  async dailyRevenue(
    @CurrentTenant() tenant: TenantContext,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('branchId') branchId?: string,
  ) {
    return { data: await this.analytics.getDailyRevenue(tenant.schemaName, dateFrom, dateTo, branchId) }
  }

  @Get('patients')
  @RequirePermissions('patients:read')
  async dailyPatients(
    @CurrentTenant() tenant: TenantContext,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return { data: await this.analytics.getDailyPatients(tenant.schemaName, dateFrom, dateTo) }
  }
}
