import { Module } from '@nestjs/common'
import { AiJobsController } from './ai-jobs.controller.js'
import { AiJobsService } from './ai-jobs.service.js'

@Module({
  controllers: [AiJobsController],
  providers: [AiJobsService],
  exports: [AiJobsService],
})
export class AiJobsModule {}
