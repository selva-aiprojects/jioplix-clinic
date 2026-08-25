import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { Icd10Service } from './icd10.service.js'
import { TenantGuard } from '../tenancy/tenant.guard.js'
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js'
import type { TenantContext } from '../tenancy/tenant.guard.js'
import { RequirePermissions } from '../auth/auth.decorators.js'

@Controller('icd10')
@UseGuards(TenantGuard)
export class Icd10Controller {
  constructor(private readonly icd10: Icd10Service) {}

  @Get()
  @RequirePermissions('diagnoses:read')
  async search(
    @CurrentTenant() tenant: TenantContext,
    @Query('q') q = '',
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(Number(limit) || 12, 50) : 12
    return { data: await this.icd10.search(tenant.schemaName, q, parsedLimit) }
  }
}
