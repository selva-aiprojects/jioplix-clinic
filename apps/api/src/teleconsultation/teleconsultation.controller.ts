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
import { TenantGuard } from '../tenancy/tenant.guard.js'
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js'
import type { TenantContext } from '../tenancy/tenant.guard.js'
import { RequirePermissions } from '../auth/auth.decorators.js'
import {
  TeleconsultationService,
  type TeleconsultationStatus,
} from './teleconsultation.service.js'

@Controller('teleconsultation')
@UseGuards(TenantGuard)
export class TeleconsultationController {
  constructor(private readonly tcService: TeleconsultationService) {}

  @Post('sessions')
  @RequirePermissions('teleconsultation:create')
  @HttpCode(HttpStatus.CREATED)
  async createSession(
    @CurrentTenant() tenant: TenantContext,
    @Body() body: unknown,
  ) {
    const input = body as Record<string, unknown>
    if (!input.patientId || !input.doctorId || !input.scheduledAt) {
      throw new BadRequestException('VALIDATION_FAILED')
    }
    return {
      data: await this.tcService.createSession(tenant.schemaName, {
        patientId: input.patientId as string,
        doctorId: input.doctorId as string,
        encounterId: input.encounterId as string | undefined,
        scheduledAt: input.scheduledAt as string,
        notes: input.notes as string | undefined,
        recordingConsent: input.recordingConsent as boolean | undefined,
      }),
    }
  }

  @Get('sessions')
  @RequirePermissions('teleconsultation:read')
  async listToday(
    @CurrentTenant() tenant: TenantContext,
    @Query('stats') stats?: string,
  ) {
    if (stats === 'true') {
      return { data: await this.tcService.getStats(tenant.schemaName) }
    }
    return { data: await this.tcService.listTodaySessions(tenant.schemaName) }
  }

  @Get('sessions/:id')
  @RequirePermissions('teleconsultation:read')
  async getSession(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return { data: await this.tcService.getSession(tenant.schemaName, id) }
  }

  @Patch('sessions/:id/status')
  @RequirePermissions('teleconsultation:update')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = body as Record<string, unknown>
    if (!input.status) throw new BadRequestException('VALIDATION_FAILED')
    const valid: TeleconsultationStatus[] = [
      'scheduled', 'waiting', 'in_progress', 'completed', 'cancelled',
    ]
    if (!valid.includes(input.status as TeleconsultationStatus)) {
      throw new BadRequestException('VALIDATION_FAILED')
    }
    return {
      data: await this.tcService.updateStatus(
        tenant.schemaName,
        id,
        input.status as TeleconsultationStatus,
      ),
    }
  }
}
