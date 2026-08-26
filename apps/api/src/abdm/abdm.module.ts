import { Module } from '@nestjs/common'
import { AbdmController } from './abdm.controller.js'
import { AbdmService } from './abdm.service.js'

@Module({
  controllers: [AbdmController],
  providers: [AbdmService],
  exports: [AbdmService],
})
export class AbdmModule {}
