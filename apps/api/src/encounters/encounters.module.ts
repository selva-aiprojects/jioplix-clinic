import { Module } from '@nestjs/common'
import { EncountersController, PatientEncountersController } from './encounters.controller.js'
import { EncountersService } from './encounters.service.js'
import { BillingModule } from '../billing/billing.module.js'

@Module({
  imports: [BillingModule],
  controllers: [EncountersController, PatientEncountersController],
  providers: [EncountersService],
  exports: [EncountersService],
})
export class EncountersModule {}
