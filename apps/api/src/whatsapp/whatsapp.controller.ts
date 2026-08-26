import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Logger,
} from '@nestjs/common'
import {
  WhatsAppService,
  WhatsAppMessage,
} from './whatsapp.service.js'

@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name)

  constructor(private readonly whatsapp: WhatsAppService) {}

  @Post('send')
  async sendMessage(
    @Body()
    body: {
      phone: string
      type?: 'text' | 'template' | 'image' | 'document'
      text?: string
      templateName?: string
      language?: string
      params?: Array<{
        type: 'text' | 'currency' | 'date_time'
        text?: string
        currency?: { fallback_value: string; code: string; amount_1000: number }
        date_time?: { fallback_value: string }
      }>
      imageUrl?: string
      documentUrl?: string
      filename?: string
      caption?: string
    },
  ) {
    const type = body.type ?? 'text'

    const msg: WhatsAppMessage = {
      phone: body.phone,
      type: type as WhatsAppMessage['type'],
    } as WhatsAppMessage

    switch (type) {
      case 'text':
        ;(msg as Extract<WhatsAppMessage, { type: 'text' }>).text =
          body.text ?? ''
        break
      case 'template':
        ;(msg as Extract<WhatsAppMessage, { type: 'template' }>).templateName =
          body.templateName ?? ''
        ;(msg as Extract<WhatsAppMessage, { type: 'template' }>).language =
          body.language
        ;(msg as Extract<WhatsAppMessage, { type: 'template' }>).params =
          body.params
        break
      case 'image':
        ;(msg as Extract<WhatsAppMessage, { type: 'image' }>).imageUrl =
          body.imageUrl ?? ''
        ;(msg as Extract<WhatsAppMessage, { type: 'image' }>).caption =
          body.caption
        break
      case 'document':
        ;(msg as Extract<WhatsAppMessage, { type: 'document' }>).documentUrl =
          body.documentUrl ?? ''
        ;(msg as Extract<WhatsAppMessage, { type: 'document' }>).filename =
          body.filename
        ;(msg as Extract<WhatsAppMessage, { type: 'document' }>).caption =
          body.caption
        break
    }

    this.logger.log(`Sending WhatsApp ${type} to ${body.phone}`)
    const result = await this.whatsapp.sendMessage(msg)
    return { data: result }
  }

  @Post('send-bulk')
  async sendBulk(
    @Body()
    body: {
      messages: Array<{
        phone: string
        type?: 'text' | 'template'
        text?: string
        templateName?: string
        language?: string
        params?: Array<{
          type: 'text' | 'currency' | 'date_time'
          text?: string
          currency?: { fallback_value: string; code: string; amount_1000: number }
          date_time?: { fallback_value: string }
        }>
      }>
    },
  ) {
    this.logger.log(`Sending bulk WhatsApp messages: ${body.messages.length} recipients`)
    const messages: WhatsAppMessage[] = body.messages.map((m) => {
      const type = m.type ?? 'text'
      const msg: WhatsAppMessage = {
        phone: m.phone,
        type: type as WhatsAppMessage['type'],
      } as WhatsAppMessage

      if (type === 'text') {
        ;(msg as Extract<WhatsAppMessage, { type: 'text' }>).text = m.text ?? ''
      } else if (type === 'template') {
        ;(msg as Extract<WhatsAppMessage, { type: 'template' }>).templateName =
          m.templateName ?? ''
        ;(msg as Extract<WhatsAppMessage, { type: 'template' }>).language =
          m.language
        ;(msg as Extract<WhatsAppMessage, { type: 'template' }>).params =
          m.params
      }

      return msg
    })

    const results = await this.whatsapp.sendBulk(messages)
    return { data: results }
  }

  @Get('status/:messageId')
  async getStatus(@Param('messageId') messageId: string) {
    this.logger.log(`Checking WhatsApp delivery status: ${messageId}`)
    const status = await this.whatsapp.getDeliveryStatus(messageId)
    return { data: status }
  }

  @Post('webhook')
  handleWebhook(@Body() body: Record<string, unknown>) {
    this.logger.log('WhatsApp webhook received')
    this.whatsapp.handleWebhook(body)
    return { status: 'ok' }
  }
}
