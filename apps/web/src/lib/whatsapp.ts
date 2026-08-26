import { api } from './api'

export type WhatsAppMessageType = 'text' | 'template' | 'image' | 'document'

export type DeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed'

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

export interface WhatsAppTemplateParam {
  type: 'text' | 'currency' | 'date_time'
  text?: string
  currency?: { fallback_value: string; code: string; amount_1000: number }
  date_time?: { fallback_value: string }
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string,
): Promise<WhatsAppSendResult> {
  return api<WhatsAppSendResult>('/whatsapp/send', {
    method: 'POST',
    body: { phone, type: 'text', text: message },
  })
}

export async function sendTemplateMessage(
  phone: string,
  templateName: string,
  params?: WhatsAppTemplateParam[],
  language?: string,
): Promise<WhatsAppSendResult> {
  return api<WhatsAppSendResult>('/whatsapp/send', {
    method: 'POST',
    body: { phone, type: 'template', templateName, language, params },
  })
}

export async function getDeliveryStatus(
  messageId: string,
): Promise<WhatsAppDeliveryStatus> {
  return api<WhatsAppDeliveryStatus>(`/whatsapp/status/${encodeURIComponent(messageId)}`)
}

export async function sendBulkWhatsApp(
  messages: Array<{
    phone: string
    text?: string
    templateName?: string
    language?: string
    params?: WhatsAppTemplateParam[]
  }>,
): Promise<WhatsAppSendResult[]> {
  return api<WhatsAppSendResult[]>('/whatsapp/send-bulk', {
    method: 'POST',
    body: {
      messages: messages.map((m) => ({
        phone: m.phone,
        type: m.templateName ? 'template' : 'text',
        text: m.text,
        templateName: m.templateName,
        language: m.language,
        params: m.params,
      })),
    },
  })
}
