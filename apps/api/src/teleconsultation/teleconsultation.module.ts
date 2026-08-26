import { Module } from '@nestjs/common'
import { TeleconsultationController } from './teleconsultation.controller.js'
import { TeleconsultationService } from './teleconsultation.service.js'

@Module({
  controllers: [TeleconsultationController],
  providers: [TeleconsultationService],
  exports: [TeleconsultationService],
})
export class TeleconsultationModule {}
