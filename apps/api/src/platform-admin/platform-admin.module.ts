import { Module } from '@nestjs/common'
import { PlatformAdminController } from './platform-admin.controller.js'
import { PlatformAdminService } from './platform-admin.service.js'
import { SubscriptionModule } from '../subscription/subscription.module.js'

@Module({
  imports: [SubscriptionModule],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService],
  exports: [PlatformAdminService],
})
export class PlatformAdminModule {}
