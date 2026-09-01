import { Controller, Get, UseGuards } from '@nestjs/common'
import { TeamService } from './team.service.js'
import { TenantGuard } from '../tenancy/tenant.guard.js'
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js'
import type { TenantContext } from '../tenancy/tenant.guard.js'
import { RequirePermissions } from '../auth/auth.decorators.js'

@Controller()
@UseGuards(TenantGuard)
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get('team')
  @RequirePermissions('users:read')
  async list(@CurrentTenant() tenant: TenantContext) {
    return { data: await this.team.list(tenant.schemaName) }
  }
}
