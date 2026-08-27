import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { SchedulerService } from './scheduler.service.js'
import { PlatformAdminModule } from '../platform-admin/platform-admin.module.js'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PlatformAdminModule,
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
