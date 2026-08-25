import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { DrugMasterService } from './drug-master.service.js'
import { TenantGuard } from '../tenancy/tenant.guard.js'
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js'
import type { TenantContext } from '../tenancy/tenant.guard.js'
import { RequirePermissions } from '../auth/auth.decorators.js'

@Controller('drugs')
@UseGuards(TenantGuard)
export class DrugMasterController {
  constructor(private readonly drugs: DrugMasterService) {}

  @Get()
  @RequirePermissions('prescriptions:read')
  async search(
    @CurrentTenant() tenant: TenantContext,
    @Query('q') q = '',
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(Number(limit) || 12, 50) : 12
    return { data: await this.drugs.search(tenant.schemaName, q, parsedLimit) }
  }
}
