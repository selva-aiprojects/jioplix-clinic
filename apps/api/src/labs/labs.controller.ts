import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  LAB_ORDER_STATUSES,
  labOrderCreateSchema,
  labOrderStatusSchema,
  labResultsUpdateSchema,
} from '@jioplix/contracts'
import { LabsService } from './labs.service.js'
import { TenantGuard } from '../tenancy/tenant.guard.js'
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js'
import type { TenantContext } from '../tenancy/tenant.guard.js'
import { RequirePermissions } from '../auth/auth.decorators.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

@Controller()
@UseGuards(TenantGuard)
export class LabsController {
  constructor(private readonly labs: LabsService) {}

  @Get('lab-orders')
  @RequirePermissions('lab_orders:read')
  async list(
    @CurrentTenant() tenant: TenantContext,
    @Query('date') date?: string,
    @Query('status') status?: string,
    @Query('patientId') patientId?: string,
  ) {
    if (date && !DATE_RE.test(date)) throw new BadRequestException('VALIDATION_FAILED')
    const validStatus =
      status && (LAB_ORDER_STATUSES as readonly string[]).includes(status) ? status : undefined
    return {
      data: await this.labs.list(tenant.schemaName, {
        date,
        status: validStatus,
        patientId: patientId || undefined,
      }),
    }
  }

  @Post('lab-orders')
  @RequirePermissions('lab_orders:create')
  async create(@CurrentTenant() tenant: TenantContext, @Body() body: unknown) {
    const parsed = labOrderCreateSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.labs.create(tenant.schemaName, parsed.data) }
  }

  @Patch('lab-orders/:id/status')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('lab_orders:update')
  async updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = labOrderStatusSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.labs.updateStatus(tenant.schemaName, id, parsed.data.status) }
  }

  @Put('lab-orders/:id/results')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('lab_orders:update')
  async saveResults(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = labResultsUpdateSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return {
      data: await this.labs.saveResults(tenant.schemaName, id, parsed.data.results, parsed.data.complete),
    }
  }
}
