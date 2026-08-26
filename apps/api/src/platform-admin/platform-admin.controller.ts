import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common'
import { platformLoginSchema, tenantActionSchema } from '@jioplix/contracts'
import { PlatformAdminService } from './platform-admin.service.js'
import { Public } from '../auth/auth.decorators.js'

@Controller('platform')
export class PlatformAdminController {
  constructor(private readonly platform: PlatformAdminService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: unknown) {
    const parsed = platformLoginSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    const result = await this.platform.login(parsed.data.email, parsed.data.password)
    return { data: result }
  }

  @Get('tenants')
  async listTenants() {
    const tenants = await this.platform.listTenants()
    return { data: tenants }
  }

  @Post('tenants/action')
  @HttpCode(HttpStatus.OK)
  async tenantAction(@Body() body: unknown) {
    const parsed = tenantActionSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('VALIDATION_FAILED')
    const result = await this.platform.performTenantAction(parsed.data)
    return { data: result }
  }

  @Get('dashboard')
  async dashboard() {
    const stats = await this.platform.getDashboardStats()
    return { data: stats }
  }
}
