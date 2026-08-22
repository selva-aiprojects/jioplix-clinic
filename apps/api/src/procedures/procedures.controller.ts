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
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  PROCEDURE_STATUSES,
  procedureOrderCreateSchema,
  procedureOrderStatusSchema,
} from '@jioplix/contracts'
import { ProceduresService } from './procedures.service.js'
import { TenantGuard } from '../tenancy/tenant.guard.js'
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js'
import type { TenantContext } from '../tenancy/tenant.guard.js'
import { RequirePermissions } from '../auth/auth.decorators.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

@Controller()
@UseGuards(TenantGuard)
export class ProceduresController {
  constructor(private readonly procs: ProceduresService) {}

  @Get('procedure-orders')
  @RequirePermissions('procedures:read')
  async list(
    @CurrentTenant() tenant: TenantContext,
    @Query('date') date?: string,
    @Query('status') status?: string,
    @Query('patientId') patientId?: string,
  ) {
    if (date && !DATE_RE.test(date)) throw new BadRequestException('VALIDATION_FAILED')
    const validStatus =
      status && (PROCEDURE_STATUSES as readonly string[]).includes(status) ? status : undefined
    return {
      data: await this.procs.list(tenant.schemaName, {
        date,
        status: validStatus,
        patientId: patientId || undefined,
      }),
    }
  }

  @Post('procedure-orders')
  @RequirePermissions('procedures:create')
  async create(@CurrentTenant() tenant: TenantContext, @Body() body: unknown) {
    const parsed = procedureOrderCreateSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.procs.create(tenant.schemaName, parsed.data) }
  }

  @Patch('procedure-orders/:id/status')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('procedures:update')
  async updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = procedureOrderStatusSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.procs.updateStatus(tenant.schemaName, id, parsed.data.status) }
  }
}
