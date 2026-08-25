import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { NotificationsService } from './notifications.service.js'
import { TenantGuard } from '../tenancy/tenant.guard.js'
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js'
import type { TenantContext } from '../tenancy/tenant.guard.js'
import { RequirePermissions } from '../auth/auth.decorators.js'

@Controller('notifications')
@UseGuards(TenantGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @RequirePermissions('notifications:read')
  async list(
    @CurrentTenant() tenant: TenantContext,
    @Query('unread') unread?: string,
    @Query('category') category?: string,
  ) {
    return {
      data: await this.notifications.list(tenant.schemaName, {
        unread: unread === 'true',
        category,
      }),
    }
  }

  @Patch(':id/read')
  @RequirePermissions('notifications:read')
  async markRead(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return { data: await this.notifications.markRead(tenant.schemaName, id) }
  }

  @Post('mark-all-read')
  @RequirePermissions('notifications:read')
  async markAllRead(@CurrentTenant() tenant: TenantContext) {
    return { data: await this.notifications.markAllRead(tenant.schemaName) }
  }

  @Post()
  @RequirePermissions('notifications:create')
  async create(@CurrentTenant() tenant: TenantContext, @Body() body: unknown) {
    const b = body as Record<string, unknown>
    if (!b || typeof b.title !== 'string' || typeof b.body !== 'string') {
      throw new BadRequestException('VALIDATION_FAILED')
    }
    return {
      data: await this.notifications.create(tenant.schemaName, {
        category: typeof b.category === 'string' ? b.category : 'system',
        title: b.title,
        body: b.body,
        href: typeof b.href === 'string' ? b.href : null,
        recipientUserId: typeof b.recipientUserId === 'string' ? b.recipientUserId : null,
      }),
    }
  }
}
