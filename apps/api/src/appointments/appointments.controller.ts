import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import {
  appointmentCreateSchema,
  appointmentStatusSchema,
  queueStatusSchema,
} from '@jioplix/contracts'
import { AppointmentsService } from './appointments.service.js'
import { TenantGuard } from '../tenancy/tenant.guard.js'
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js'
import type { TenantContext } from '../tenancy/tenant.guard.js'
import { RequirePermissions } from '../auth/auth.decorators.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function parseDate(raw: string | undefined): string {
  if (!raw || !DATE_RE.test(raw)) throw new BadRequestException('VALIDATION_FAILED')
  return raw
}

@Controller()
@UseGuards(TenantGuard)
export class AppointmentsController {
  constructor(private readonly appts: AppointmentsService) {}

  @Get('appointments')
  @RequirePermissions('appointments:read')
  async list(
    @CurrentTenant() tenant: TenantContext,
    @Query('date') date: string,
    @Query('doctorId') doctorId?: string,
    @Query('status') status?: string,
  ) {
    return { data: await this.appts.list(tenant.schemaName, { date: parseDate(date), doctorId, status }) }
  }

  @Post('appointments')
  @RequirePermissions('appointments:create')
  async create(@CurrentTenant() tenant: TenantContext, @Body() body: unknown) {
    const parsed = appointmentCreateSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.appts.create(tenant.schemaName, parsed.data) }
  }

  @Patch('appointments/:id/status')
  @RequirePermissions('appointments:update')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = appointmentStatusSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.appts.updateStatus(tenant.schemaName, id, parsed.data.status) }
  }

  @Get('queue')
  @RequirePermissions('queue:read')
  async queue(@CurrentTenant() tenant: TenantContext, @Query('date') date: string) {
    return { data: await this.appts.listQueue(tenant.schemaName, parseDate(date)) }
  }

  @Patch('queue/:id/status')
  @RequirePermissions('queue:update')
  @HttpCode(HttpStatus.OK)
  async updateQueueStatus(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = queueStatusSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.appts.updateQueueStatus(tenant.schemaName, id, parsed.data.status) }
  }
}
