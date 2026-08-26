import { Module } from '@nestjs/common'
import { PasswordResetController } from './password-reset.controller.js'
import { PlatformTenantController } from './platform-tenant.controller.js'
import { PasswordResetService } from './password-reset.service.js'

@Module({
  controllers: [PasswordResetController, PlatformTenantController],
  providers: [PasswordResetService],
})
export class PasswordResetModule {}
