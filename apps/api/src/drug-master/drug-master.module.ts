import { Module } from '@nestjs/common'
import { DrugMasterController } from './drug-master.controller.js'
import { DrugMasterService } from './drug-master.service.js'

@Module({
  controllers: [DrugMasterController],
  providers: [DrugMasterService],
  exports: [DrugMasterService],
})
export class DrugMasterModule {}
