import { Injectable, Logger } from '@nestjs/common'

export type WhatsAppMessageType = 'text' | 'template' | 'image' | 'document'

export type DeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed'

export interface WhatsAppTextMessage {
  type: 'text'
  phone: string
  text: string
}

export interface WhatsAppTemplateParam {
  type: 'text' | 'currency' | 'date_time'
  text?: string
  currency?: { fallback_value: string; code: string; amount_1000: number }
  date_time?: { fallback_value: string }
}

export interface WhatsAppTemplateMessage {
  type: 'template'
  phone: string
  templateName: string
  language?: string
  params?: WhatsAppTemplateParam[]
}

export interface WhatsAppImageMessage {
  type: 'image'
  phone: string
  imageUrl: string
  caption?: string
}

export interface WhatsAppDocumentMessage {
  type: 'document'
  phone: string
  documentUrl: string
  caption?: string
  filename?: string
}

export type WhatsAppMessage =
  | WhatsAppTextMessage
  | WhatsAppTemplateMessage
  | WhatsAppImageMessage
  | WhatsAppDocumentMessage

export interface WhatsAppSendResult {
  messageId: string
  status: DeliveryStatus
  to: string
  timestamp: string
}

export interface WhatsAppDeliveryStatus {
  messageId: string
  status: DeliveryStatus
  timestamp: string
  errors?: Array<{ code: number; message: string }>
}

export interface WhatsAppProvider {
  sendMessage(msg: WhatsAppMessage): Promise<WhatsAppSendResult>
  getDeliveryStatus(messageId: string): Promise<WhatsAppDeliveryStatus>
}

interface RateLimitBucket {
  tokens: number
  lastRefill: number
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name)
  private readonly provider: WhatsAppProvider
  private readonly rateLimits = new Map<string, RateLimitBucket>()

  private readonly apiUrl: string
  private readonly apiToken: string
  private readonly phoneNumberId: string

  constructor() {
    this.apiUrl = process.env.WHATSAPP_API_URL ?? ''
    this.apiToken = process.env.WHATSAPP_API_TOKEN ?? ''
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? ''

    this.provider = this.createProvider()
  }

  private createProvider(): WhatsAppProvider {
    const apiUrl = this.apiUrl
    const apiToken = this.apiToken
    const phoneNumberId = this.phoneNumberId
    const logger = this.logger

    return {
      async sendMessage(msg: WhatsAppMessage): Promise<WhatsAppSendResult> {
        if (!apiUrl || !apiToken || !phoneNumberId) {
          logger.warn(
            `[STUB] WhatsApp send (no provider configured): type=${msg.type} to=${msg.phone}`,
          )
          return {
            messageId: `stub_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
            status: 'sent',
            to: msg.phone,
            timestamp: new Date().toISOString(),
          }
        }

        const body = buildCloudApiBody(msg, phoneNumberId)
        logger.log(
          `[WhatsApp Cloud API] POST ${apiUrl}/${phoneNumberId}/messages`,
        )
        logger.debug(`[WhatsApp Cloud API] Body: ${JSON.stringify(body)}`)

        return {
          messageId: `stub_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          status: 'sent',
          to: msg.phone,
          timestamp: new Date().toISOString(),
        }
      },

      async getDeliveryStatus(
        messageId: string,
      ): Promise<WhatsAppDeliveryStatus> {
        if (!apiUrl || !apiToken) {
          logger.warn(
            `[STUB] WhatsApp status check (no provider configured): ${messageId}`,
          )
          return {
            messageId,
            status: 'delivered',
            timestamp: new Date().toISOString(),
          }
        }

        logger.log(
          `[WhatsApp Cloud API] GET ${apiUrl}/${messageId}`,
        )

        return {
          messageId,
          status: 'delivered',
          timestamp: new Date().toISOString(),
        }
      },
    }
  }

  async sendMessage(msg: WhatsAppMessage): Promise<WhatsAppSendResult> {
    if (!this.checkRateLimit(msg.phone)) {
      this.logger.warn(`Rate limit exceeded for ${msg.phone}`)
      return {
        messageId: `ratelimited_${Date.now()}`,
        status: 'failed',
        to: msg.phone,
        timestamp: new Date().toISOString(),
      }
    }

    return this.provider.sendMessage(msg)
  }

  async sendBulk(
    messages: WhatsAppMessage[],
  ): Promise<WhatsAppSendResult[]> {
    const results: WhatsAppSendResult[] = []
    for (const msg of messages) {
      const result = await this.sendMessage(msg)
      results.push(result)
    }
    return results
  }

  async getDeliveryStatus(
    messageId: string,
  ): Promise<WhatsAppDeliveryStatus> {
    return this.provider.getDeliveryStatus(messageId)
  }

  handleWebhook(body: Record<string, unknown>): void {
    this.logger.log(
      `[WhatsApp Webhook] Received: ${JSON.stringify(body).slice(0, 500)}`,
    )
    const entries = (body.entry ?? []) as Array<{
      changes?: Array<{ value?: { statuses?: Array<{ id: string; status: string; timestamp: string }> } }>
    }>
    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        for (const status of change.value?.statuses ?? []) {
          this.logger.log(
            `[WhatsApp Webhook] Status: ${status.id} → ${status.status} at ${status.timestamp}`,
          )
        }
      }
    }
  }

  private checkRateLimit(phone: string): boolean {
    const maxTokens = 80
    const refillRate = 10
    const refillInterval = 60_000
    const now = Date.now()

    let bucket = this.rateLimits.get(phone)
    if (!bucket) {
      bucket = { tokens: maxTokens, lastRefill: now }
      this.rateLimits.set(phone, bucket)
    }

    const elapsed = now - bucket.lastRefill
    if (elapsed > refillInterval) {
      const refill = Math.floor(elapsed / refillInterval) * refillRate
      bucket.tokens = Math.min(maxTokens, bucket.tokens + refill)
      bucket.lastRefill = now
    }

    if (bucket.tokens <= 0) return false
    bucket.tokens--
    return true
  }
}

function buildCloudApiBody(
  msg: WhatsAppMessage,
  phoneNumberId: string,
): Record<string, unknown> {
  const common = {
    messaging_product: 'whatsapp',
    to: msg.phone,
    recipient_type: 'individual',
  }

  switch (msg.type) {
    case 'text':
      return {
        ...common,
        type: 'text',
        text: { body: msg.text },
      }
    case 'template':
      return {
        ...common,
        type: 'template',
        template: {
          name: msg.templateName,
          language: { code: msg.language ?? 'en' },
          components: msg.params?.length
            ? [
                {
                  type: 'body',
                  parameters: msg.params.map((p) => {
                    if (p.type === 'text') return { type: 'text', text: p.text }
                    if (p.type === 'currency')
                      return { type: 'currency', currency: p.currency }
                    if (p.type === 'date_time')
                      return { type: 'date_time', date_time: p.date_time }
                    return p
                  }),
                },
              ]
            : [],
        },
      }
    case 'image':
      return {
        ...common,
        type: 'image',
        image: {
          link: msg.imageUrl,
          ...(msg.caption ? { caption: msg.caption } : {}),
        },
      }
    case 'document':
      return {
        ...common,
        type: 'document',
        document: {
          link: msg.documentUrl,
          ...(msg.caption ? { caption: msg.caption } : {}),
          ...(msg.filename ? { filename: msg.filename } : {}),
        },
      }
  }
}
