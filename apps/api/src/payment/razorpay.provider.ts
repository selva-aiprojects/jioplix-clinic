import { Injectable, Logger } from '@nestjs/common'
import crypto from 'node:crypto'
import type {
  PaymentGateway,
  CreateOrderInput,
  CreateOrderResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
  RefundInput,
  RefundResult,
} from './payment-gateway.interface.js'

@Injectable()
export class RazorpayProvider implements PaymentGateway {
  private readonly logger = new Logger(RazorpayProvider.name)
  private readonly keyId: string
  private readonly keySecret: string
  private readonly isConfigured: boolean

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID ?? ''
    this.keySecret = process.env.RAZORPAY_KEY_SECRET ?? ''
    this.isConfigured = !!(this.keyId && this.keySecret)
    if (this.isConfigured) {
      this.logger.log('[RAZORPAY] Configured with live keys')
    } else {
      this.logger.log('[RAZORPAY] Not configured — using stub mode for development')
    }
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    if (!this.isConfigured) {
      const orderId = `order_stub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      this.logger.log(`[RAZORPAY STUB] Created order: ${orderId} | ₹${input.amountPaise / 100}`)
      return { orderId, amount: input.amountPaise, currency: input.currency }
    }

    // Real Razorpay API call
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: input.amountPaise,
        currency: input.currency,
        receipt: input.receipt,
        notes: input.notes,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(`Razorpay order creation failed: ${JSON.stringify(err)}`)
    }
    const order = await res.json() as { id: string; amount: number; currency: string }
    return { orderId: order.id, amount: order.amount, currency: order.currency }
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    if (!this.isConfigured) {
      this.logger.log(`[RAZORPAY STUB] Verified payment: ${input.razorpayPaymentId}`)
      return { verified: true, paymentId: input.razorpayPaymentId, amount: 0 }
    }

    // Real Razorpay signature verification
    const body = `${input.razorpayOrderId}|${input.razorpayPaymentId}`
    const expectedSig = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex')

    const verified = expectedSig === input.razorpaySignature
    if (!verified) {
      this.logger.warn(`[RAZORPAY] Payment verification failed for ${input.razorpayPaymentId}`)
    }
    return { verified, paymentId: input.razorpayPaymentId, amount: 0 }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    if (!this.isConfigured) {
      const refundId = `refund_stub_${Date.now()}`
      this.logger.log(`[RAZORPAY STUB] Refund: ${refundId} for payment ${input.paymentId}`)
      return { refundId, status: 'processed' }
    }

    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')
    const body: Record<string, unknown> = {}
    if (input.amountPaise) body.amount = input.amountPaise
    if (input.notes) body.notes = { reason: input.notes }

    const res = await fetch(`https://api.razorpay.com/v1/payments/${input.paymentId}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(`Razorpay refund failed: ${JSON.stringify(err)}`)
    }
    const refund = await res.json() as { id: string; status: string }
    return { refundId: refund.id, status: refund.status }
  }
}
