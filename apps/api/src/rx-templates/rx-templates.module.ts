import { Module } from '@nestjs/common'
import { RxTemplatesController } from './rx-templates.controller.js'
import { RxTemplatesService } from './rx-templates.service.js'

@Module({
  controllers: [RxTemplatesController],
  providers: [RxTemplatesService],
  exports: [RxTemplatesService],
})
export class RxTemplatesModule {}
