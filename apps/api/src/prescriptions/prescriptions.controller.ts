import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  prescriptionCreateSchema,
  prescriptionStatusSchema,
  prescriptionItemCreateSchema,
} from '@jioplix/contracts'
import { PrescriptionsService } from './prescriptions.service.js'
import { TenantGuard } from '../tenancy/tenant.guard.js'
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js'
import type { TenantContext } from '../tenancy/tenant.guard.js'
import { RequirePermissions } from '../auth/auth.decorators.js'

@Controller('prescriptions')
@UseGuards(TenantGuard)
export class PrescriptionsController {
  constructor(private readonly prescriptions: PrescriptionsService) {}

  @Post()
  @RequirePermissions('prescriptions:create')
  async create(@CurrentTenant() tenant: TenantContext, @Body() body: unknown) {
    const parsed = prescriptionCreateSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.prescriptions.create(tenant.schemaName, parsed.data) }
  }

  @Get()
  @RequirePermissions('prescriptions:read')
  async list(
    @CurrentTenant() tenant: TenantContext,
    @Query('encounterId') encounterId?: string,
  ) {
    if (!encounterId) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.prescriptions.listByEncounter(tenant.schemaName, encounterId) }
  }

  @Get(':id')
  @RequirePermissions('prescriptions:read')
  async get(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    const row = await this.prescriptions.findById(tenant.schemaName, id)
    if (!row) throw new NotFoundException('PRESCRIPTION_NOT_FOUND')
    return { data: row }
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('prescriptions:update')
  async updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = prescriptionStatusSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.prescriptions.updateStatus(tenant.schemaName, id, parsed.data.status) }
  }

  @Post(':id/items')
  @RequirePermissions('prescriptions:update')
  async addItem(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = prescriptionItemCreateSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.prescriptions.addItem(tenant.schemaName, id, parsed.data) }
  }
}
