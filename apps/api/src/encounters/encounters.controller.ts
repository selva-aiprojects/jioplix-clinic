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
  UseGuards,
} from '@nestjs/common'
import {
  encounterCreateSchema,
  encounterStatusSchema,
  diagnosisCreateSchema,
  vitalsCreateSchema,
} from '@jioplix/contracts'
import { EncountersService } from './encounters.service.js'
import { TenantGuard } from '../tenancy/tenant.guard.js'
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js'
import type { TenantContext } from '../tenancy/tenant.guard.js'
import { RequirePermissions } from '../auth/auth.decorators.js'

@Controller('encounters')
@UseGuards(TenantGuard)
export class EncountersController {
  constructor(private readonly encounters: EncountersService) {}

  @Post()
  @RequirePermissions('encounters:create')
  async create(@CurrentTenant() tenant: TenantContext, @Body() body: unknown) {
    const parsed = encounterCreateSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.encounters.create(tenant.schemaName, parsed.data) }
  }

  @Get(':id')
  @RequirePermissions('encounters:read')
  async get(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    const row = await this.encounters.findById(tenant.schemaName, id)
    if (!row) throw new NotFoundException('ENCOUNTER_NOT_FOUND')
    return { data: row }
  }

  @Patch(':id')
  @RequirePermissions('encounters:update')
  async update(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = encounterStatusSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.encounters.update(tenant.schemaName, id, parsed.data) }
  }

  @Post(':id/vitals')
  @RequirePermissions('vitals:create')
  async addVitals(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = vitalsCreateSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.encounters.addVitals(tenant.schemaName, id, parsed.data) }
  }

  @Post(':id/diagnoses')
  @RequirePermissions('diagnoses:create')
  async addDiagnosis(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = diagnosisCreateSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    return { data: await this.encounters.addDiagnosis(tenant.schemaName, id, parsed.data) }
  }

  @Post(':id/lock')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('encounters:lock')
  async lock(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return { data: await this.encounters.lock(tenant.schemaName, id) }
  }
}
