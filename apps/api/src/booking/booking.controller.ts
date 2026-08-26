import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { BookingService } from './booking.service.js'
import { TenantGuard } from '../tenancy/tenant.guard.js'
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js'
import type { TenantContext } from '../tenancy/tenant.guard.js'
import { RequirePermissions, Public } from '../auth/auth.decorators.js'

@Controller('booking')
@UseGuards(TenantGuard)
export class BookingController {
  constructor(private readonly booking: BookingService) {}

  @Get('link')
  @RequirePermissions('booking:read')
  async getLink(@CurrentTenant() tenant: TenantContext) {
    return { data: await this.booking.getBookingLink(tenant.schemaName) }
  }

  @Post('config')
  @RequirePermissions('booking:update')
  async saveConfig(@CurrentTenant() tenant: TenantContext, @Body() body: unknown) {
    const config = body as Record<string, unknown>
    return { data: await this.booking.saveConfig(tenant.schemaName, config) }
  }

  @Get('config')
  @RequirePermissions('booking:read')
  async getConfig(@CurrentTenant() tenant: TenantContext) {
    return { data: await this.booking.getConfig(tenant.schemaName) }
  }

  @Public()
  @Get('slots')
  async getSlots(@Query('date') date: string, @Query('clinic') clinicSlug: string) {
    if (!date || !clinicSlug) throw new BadRequestException('date and clinic query params required')
    return { data: await this.booking.getAvailableSlots('public', date) }
  }

  @Public()
  @Post('reserve')
  async reserve(@Body() body: unknown) {
    const input = body as Record<string, unknown>
    if (!input.clinicSlug || !input.patientName || !input.phone || !input.date || !input.timeSlot) {
      throw new BadRequestException('Missing required fields')
    }
    return {
      data: await this.booking.reserveSlot('public', input as Parameters<BookingService['reserveSlot']>[1]),
    }
  }
}
