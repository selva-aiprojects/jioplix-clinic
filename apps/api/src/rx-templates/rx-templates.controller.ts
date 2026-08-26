import { BadRequestException, Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { RxTemplatesService } from './rx-templates.service.js'
import { TenantGuard } from '../tenancy/tenant.guard.js'
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js'
import type { TenantContext } from '../tenancy/tenant.guard.js'
import { CurrentAuth } from '../auth/auth.decorators.js'
import type { AuthContext } from '@jioplix/contracts'
import { RequirePermissions } from '../auth/auth.decorators.js'

@Controller('rx-templates')
@UseGuards(TenantGuard)
export class RxTemplatesController {
  constructor(private readonly templates: RxTemplatesService) {}

  @Get()
  @RequirePermissions('prescriptions:read')
  async list(@CurrentTenant() tenant: TenantContext) {
    return { data: await this.templates.list(tenant.schemaName) }
  }

  @Post()
  @RequirePermissions('prescriptions:create')
  async create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Body() body: unknown,
  ) {
    const b = body as { name?: string; category?: string; items?: unknown }
    if (!b || typeof b.name !== 'string' || !Array.isArray(b.items)) {
      throw new BadRequestException('VALIDATION_FAILED')
    }
    const items = (b.items as unknown[]).map((raw) => {
      const it = raw as Record<string, unknown>
      return {
        drugName: String(it.drugName ?? ''),
        genericName: it.genericName ? String(it.genericName) : undefined,
        strength: it.strength ? String(it.strength) : undefined,
        form: it.form ? String(it.form) : undefined,
        dosage: String(it.dosage ?? ''),
        frequency: String(it.frequency ?? ''),
        durationDays: it.durationDays == null ? undefined : Number(it.durationDays),
        instructions: it.instructions ? String(it.instructions) : undefined,
        sequence: it.sequence == null ? undefined : Number(it.sequence),
      }
    })
    return {
      data: await this.templates.create(tenant.schemaName, auth?.userId ?? null, {
        name: b.name,
        category: b.category ?? 'General',
        items,
      }),
    }
  }

  @Delete(':id')
  @RequirePermissions('prescriptions:create')
  async remove(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return { data: await this.templates.remove(tenant.schemaName, id) }
  }
}
