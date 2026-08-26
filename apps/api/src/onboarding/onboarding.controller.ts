import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common'
import { OnboardingService } from './onboarding.service.js'
import { TenantGuard } from '../tenancy/tenant.guard.js'
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js'
import type { TenantContext } from '../tenancy/tenant.guard.js'

@Controller('onboarding')
@UseGuards(TenantGuard)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get('status')
  async getStatus(@CurrentTenant() tenant: TenantContext) {
    return { data: await this.onboarding.getStatus(tenant.id) }
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async complete(
    @CurrentTenant() tenant: TenantContext,
    @Body() body: unknown,
  ) {
    const b = body as Record<string, unknown>
    return {
      data: await this.onboarding.complete(tenant.id, {
        clinicProfile: (b.clinicProfile ?? {}) as Record<string, string>,
        doctor: (b.doctor ?? {}) as Record<string, string>,
        receptionist: (b.receptionist ?? {}) as Record<string, string>,
        addons: Array.isArray(b.addons) ? (b.addons as string[]) : [],
      } as any),
    }
  }

  @Post('clinic-profile')
  @HttpCode(HttpStatus.OK)
  async saveClinicProfile(
    @CurrentTenant() tenant: TenantContext,
    @Body() body: unknown,
  ) {
    const b = body as Record<string, string>
    return {
      data: await this.onboarding.saveClinicProfile(tenant.id, {
        clinicName: b.clinicName ?? '',
        clinicType: b.clinicType ?? '',
        address: b.address ?? '',
        phone: b.phone ?? '',
        email: b.email ?? '',
      }),
    }
  }

  @Post('invite-user')
  @HttpCode(HttpStatus.OK)
  async inviteUser(
    @CurrentTenant() tenant: TenantContext,
    @Body() body: unknown,
  ) {
    const b = body as Record<string, string>
    return {
      data: await this.onboarding.inviteUser(tenant.id, {
        name: b.name ?? '',
        phone: b.phone ?? '',
        role: b.role ?? '',
      }),
    }
  }
}
