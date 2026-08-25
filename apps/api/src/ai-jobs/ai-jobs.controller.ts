import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { AiJobsService } from './ai-jobs.service.js'
import type { AiJobContext } from './ai-jobs.service.js'
import { TenantGuard } from '../tenancy/tenant.guard.js'
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js'
import type { TenantContext } from '../tenancy/tenant.guard.js'
import { CurrentAuth } from '../auth/auth.decorators.js'
import type { AuthContext } from '@jioplix/contracts'
import { RequirePermissions } from '../auth/auth.decorators.js'

@Controller('ai-jobs')
@UseGuards(TenantGuard)
export class AiJobsController {
  constructor(private readonly aiJobs: AiJobsService) {}

  @Post()
  @RequirePermissions('encounters:create')
  async create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Body() body: unknown,
  ) {
    const b = body as { encounterId?: string; context?: AiJobContext }
    if (!b || typeof b !== 'object') throw new BadRequestException('VALIDATION_FAILED')
    return {
      data: await this.aiJobs.create(tenant.schemaName, auth?.userId ?? null, {
        encounterId: b.encounterId,
        context: b.context,
      }),
    }
  }

  @Get()
  @RequirePermissions('encounters:read')
  async listForEncounter(
    @CurrentTenant() tenant: TenantContext,
    @Query('encounterId') encounterId?: string,
  ) {
    if (!encounterId) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.aiJobs.listForEncounter(tenant.schemaName, encounterId) }
  }

  @Get(':id')
  @RequirePermissions('encounters:read')
  async get(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return { data: await this.aiJobs.get(tenant.schemaName, id) }
  }
}
