import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { PharmacyService } from './pharmacy.service.js'
import { TenantGuard } from '../tenancy/tenant.guard.js'
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js'
import type { TenantContext } from '../tenancy/tenant.guard.js'
import { CurrentAuth, RequirePermissions } from '../auth/auth.decorators.js'
import type { AuthContext } from '@jioplix/contracts'

@Controller()
@UseGuards(TenantGuard)
export class PharmacyController {
  constructor(private readonly pharmacy: PharmacyService) {}

  @Get('pharmacy/dispense-queue')
  @RequirePermissions('prescriptions:read')
  async queue(@CurrentTenant() tenant: TenantContext) {
    return { data: await this.pharmacy.dispenseQueue(tenant.schemaName) }
  }

  @Post('pharmacy/prescriptions/:id/dispense')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('prescriptions:update')
  async dispense(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Param('id') id: string,
  ) {
    return { data: await this.pharmacy.dispense(tenant.schemaName, id, auth.userId) }
  }
}
