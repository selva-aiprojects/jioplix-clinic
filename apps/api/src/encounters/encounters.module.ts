import { Module } from '@nestjs/common'
import { EncountersController, PatientEncountersController } from './encounters.controller.js'
import { EncountersService } from './encounters.service.js'

@Module({
  controllers: [EncountersController, PatientEncountersController],
  providers: [EncountersService],
  exports: [EncountersService],
})
export class EncountersModule {}
