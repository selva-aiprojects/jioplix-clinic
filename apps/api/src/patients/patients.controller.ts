import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { PatientsService } from './patients.service.js'
import { TenantGuard } from '../tenancy/tenant.guard.js'
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js'
import type { TenantContext } from '../tenancy/tenant.guard.js'
import { RequirePermissions } from '../auth/auth.decorators.js'
import { patientCreateSchema } from '@jioplix/contracts'
import { BadRequestException, NotFoundException } from '@nestjs/common'

@Controller('patients')
@UseGuards(TenantGuard)
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  @RequirePermissions('patients:read')
  async list(@CurrentTenant() tenant: TenantContext) {
    return { data: await this.patients.list(tenant.schemaName) }
  }

  @Get(':id')
  @RequirePermissions('patients:read')
  async get(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    const [row] = await this.patients.findById(tenant.schemaName, id)
    if (!row) throw new NotFoundException('PATIENT_NOT_FOUND')
    return { data: row }
  }

  @Post()
  @RequirePermissions('patients:create')
  async create(@CurrentTenant() tenant: TenantContext, @Body() body: unknown) {
    const parsed = patientCreateSchema.safeParse(body)
    if (!parsed.success) {
      throw new BadRequestException('VALIDATION_FAILED')
    }
    return { data: await this.patients.create(tenant.schemaName, parsed.data) }
  }
}
