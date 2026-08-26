import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import {
  INVENTORY_CATEGORIES,
  inventoryItemCreateSchema,
  stockMovementCreateSchema,
} from '@jioplix/contracts'
import type { AuthContext } from '@jioplix/contracts'
import { InventoryService } from './inventory.service.js'
import { TenantGuard } from '../tenancy/tenant.guard.js'
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js'
import type { TenantContext } from '../tenancy/tenant.guard.js'
import { CurrentAuth, RequirePermissions } from '../auth/auth.decorators.js'

@Controller()
@UseGuards(TenantGuard)
export class InventoryController {
  constructor(private readonly inv: InventoryService) {}

  @Get('inventory/items')
  @RequirePermissions('inventory:read')
  async list(
    @CurrentTenant() tenant: TenantContext,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    const validCategory =
      category && (INVENTORY_CATEGORIES as readonly string[]).includes(category) ? category : undefined
    return {
      data: await this.inv.list(tenant.schemaName, { category: validCategory, search: search?.trim() || undefined }),
    }
  }

  @Get('inventory/items/:id')
  @RequirePermissions('inventory:read')
  async getById(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    const item = await this.inv.getById(tenant.schemaName, id)
    if (!item) throw new BadRequestException('ITEM_NOT_FOUND')
    return { data: item }
  }

  @Post('inventory/items')
  @RequirePermissions('inventory:create')
  async create(@CurrentTenant() tenant: TenantContext, @Body() body: unknown) {
    const parsed = inventoryItemCreateSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.inv.create(tenant.schemaName, parsed.data) }
  }

  @Patch('inventory/items/:id/stock')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('inventory:adjust')
  async moveStock(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = stockMovementCreateSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return {
      data: await this.inv.moveStock(tenant.schemaName, id, parsed.data, auth.userId),
    }
  }

  @Get('inventory/movements')
  @RequirePermissions('inventory:read')
  async movements(@CurrentTenant() tenant: TenantContext) {
    return { data: await this.inv.recentMovements(tenant.schemaName) }
  }
}
