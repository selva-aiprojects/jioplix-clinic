import { Module, Global } from '@nestjs/common'
import { MailerService } from './mailer.service.js'

@Global()
@Module({
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
