import { Injectable, NotFoundException } from '@nestjs/common'
import { newId } from '@jioplix/contracts'
import { DbService } from '../db/db.service.js'
import { RazorpayProvider } from './razorpay.provider.js'

export interface CreatePaymentInput {
  tenantId: string
  amountPaise: number
  planCode: string
}

export interface VerifyPaymentInput {
  tenantId: string
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

@Injectable()
export class PaymentService {
  private readonly gateway: RazorpayProvider

  constructor(private readonly db: DbService) {
    this.gateway = new RazorpayProvider()
  }

  async createOrder(input: CreatePaymentInput) {
    const { rows: planRows } = await this.db.pool.query<{ name: string }>(
      `SELECT name FROM public.plans WHERE code = $1`,
      [input.planCode],
    )
    const planName = planRows[0]?.name ?? input.planCode

    const result = await this.gateway.createOrder({
      amountPaise: input.amountPaise,
      currency: 'INR',
      receipt: `sub_${input.tenantId.slice(0, 8)}_${Date.now()}`,
      notes: { tenantId: input.tenantId, plan: planName },
    })

    // Store the pending payment
    await this.db.pool.query(
      `INSERT INTO public.tenant_invoices
         (id, tenant_id, subscription_id, amount_paise, status, billing_period_start, billing_period_end, due_date, payment_reference)
       SELECT id, tenant_id, id, $3, 'pending', current_period_start, current_period_end, CURRENT_DATE, $4
       FROM public.tenant_subscriptions
       WHERE tenant_id = $1 AND status IN ('trialing', 'active', 'past_due')
       ORDER BY created_at DESC LIMIT 1
       ON CONFLICT DO NOTHING`,
      [input.tenantId, input.planCode, input.amountPaise.toString(), result.orderId],
    )

    return result
  }

  async verifyPayment(input: VerifyPaymentInput) {
    const result = await this.gateway.verifyPayment({
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
    })

    if (result.verified) {
      // Update invoice status
      await this.db.pool.query(
        `UPDATE public.tenant_invoices
         SET status = 'paid', paid_at = now(), payment_reference = $2
         WHERE payment_reference = $1 AND tenant_id = $3`,
        [input.razorpayOrderId, input.razorpayPaymentId, input.tenantId],
      )

      // Extend subscription period
      await this.db.pool.query(
        `UPDATE public.tenant_subscriptions
         SET status = 'active',
             current_period_start = now(),
             current_period_end = now() + interval '30 days',
             updated_at = now()
         WHERE tenant_id = $1 AND status IN ('trialing', 'active', 'past_due')
         ORDER BY created_at DESC LIMIT 1`,
        [input.tenantId],
      )

      // Reactivate if suspended
      await this.db.pool.query(
        `UPDATE public.tenants
         SET status = 'active', suspended_at = NULL, updated_at = now()
         WHERE id = $1 AND status = 'suspended'`,
        [input.tenantId],
      )
    }

    return result
  }

  async refund(input: { paymentId: string; amountPaise?: number; notes?: string }) {
    return this.gateway.refund(input)
  }
}
