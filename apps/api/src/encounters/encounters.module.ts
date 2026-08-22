import { Module } from '@nestjs/common'
import { EncountersController } from './encounters.controller.js'
import { EncountersService } from './encounters.service.js'

@Module({
  controllers: [EncountersController],
  providers: [EncountersService],
  exports: [EncountersService],
})
export class EncountersModule {}
