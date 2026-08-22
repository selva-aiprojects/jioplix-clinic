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
  invoiceCreateSchema,
  paymentCreateSchema,
} from '@jioplix/contracts'
import { BillingService } from './billing.service.js'
import { TenantGuard } from '../tenancy/tenant.guard.js'
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js'
import type { TenantContext } from '../tenancy/tenant.guard.js'
import { RequirePermissions } from '../auth/auth.decorators.js'

@Controller('invoices')
@UseGuards(TenantGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post()
  @RequirePermissions('invoices:create')
  async create(@CurrentTenant() tenant: TenantContext, @Body() body: unknown) {
    const parsed = invoiceCreateSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.billing.createInvoice(tenant.schemaName, parsed.data) }
  }

  @Get(':id')
  @RequirePermissions('invoices:read')
  async get(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    const row = await this.billing.findInvoiceById(tenant.schemaName, id)
    if (!row) throw new NotFoundException('INVOICE_NOT_FOUND')
    return { data: row }
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('invoices:update')
  async update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = invoiceCreateSchema.partial().safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.billing.updateInvoice(tenant.schemaName, id, parsed.data) }
  }

  @Post(':id/payments')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('payments:create')
  async addPayment(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = paymentCreateSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.billing.addPayment(tenant.schemaName, id, parsed.data) }
  }

  @Get()
  @RequirePermissions('invoices:read')
  async list(
    @CurrentTenant() tenant: TenantContext,
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
  ) {
    return { data: await this.billing.listInvoices(tenant.schemaName, { patientId, status }) }
  }

  @Get('patient/:patientId/outstanding')
  @RequirePermissions('invoices:read')
  async outstanding(@CurrentTenant() tenant: TenantContext, @Param('patientId') patientId: string) {
    return { data: await this.billing.getOutstanding(tenant.schemaName, patientId) }
  }
}
