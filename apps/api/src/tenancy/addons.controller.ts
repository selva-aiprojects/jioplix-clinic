import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common'
import { sql } from 'drizzle-orm'
import { DbService } from '../db/db.service.js'
import { CurrentTenant } from './current-tenant.decorator.js'
import { TenantGuard, type TenantContext } from './tenant.guard.js'
import { CurrentAuth } from '../auth/auth.decorators.js'
import type { AuthContext } from '@jioplix/contracts'

export interface AddonDto {
  moduleCode: string
  enabled: boolean
  validUntil?: string | null
  updatedAt?: string
}

@Controller('addons')
@UseGuards(TenantGuard)
export class AddonsController {
  constructor(private readonly db: DbService) {}

  @Get()
  async getAddons(@CurrentTenant() tenant: TenantContext): Promise<{ data: AddonDto[] }> {
    const addons = await this.db.withTenant(tenant.schemaName, async (db) => {
      const result = await db.execute<{
        module_code: string
        enabled: boolean
        valid_until: string | null
        updated_at: string
      }>(sql`
        SELECT module_code, enabled, valid_until, updated_at
        FROM addon_entitlements
        ORDER BY module_code ASC
      `)
      return result.rows.map((r) => ({
        moduleCode: r.module_code,
        enabled: r.enabled,
        validUntil: r.valid_until,
        updatedAt: r.updated_at,
      }))
    })

    return { data: addons }
  }

  @Patch(':module')
  async toggleAddon(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Param('module') moduleCode: string,
    @Body() body: { enabled: boolean },
  ): Promise<{ data: { moduleCode: string; enabled: boolean } }> {
    const isTenantAdmin =
      auth?.roles?.includes('tenant_admin') || auth?.permissions?.includes('*')
    if (!isTenantAdmin) {
      throw new ForbiddenException(
        'Only Tenant Administrators can configure clinic add-ons and features.',
      )
    }

    const cleanModule = moduleCode.toLowerCase().trim()
    const isEnabled = Boolean(body.enabled)

    const updated = await this.db.withTenant(tenant.schemaName, async (db) => {
      const res = await db.execute<{ module_code: string; enabled: boolean }>(sql`
        INSERT INTO addon_entitlements (module_code, enabled, updated_at)
        VALUES (${cleanModule}, ${isEnabled}, now())
        ON CONFLICT (module_code) DO UPDATE
          SET enabled = EXCLUDED.enabled, updated_at = now()
        RETURNING module_code, enabled
      `)
      return res.rows[0]
    })

    return {
      data: {
        moduleCode: updated?.module_code ?? cleanModule,
        enabled: updated?.enabled ?? isEnabled,
      },
    }
  }
}
