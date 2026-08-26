import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common'
import { PaymentService } from './payment.service.js'
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js'
import type { TenantContext } from '../tenancy/tenant.guard.js'

@Controller('payments')
export class PaymentController {
  constructor(private readonly payment: PaymentService) {}

  @Post('create-order')
  @HttpCode(HttpStatus.OK)
  async createOrder(
    @CurrentTenant() tenant: TenantContext,
    @Body() body: { amountPaise: number; planCode: string },
  ) {
    const order = await this.payment.createOrder({
      tenantId: tenant.id,
      amountPaise: body.amountPaise,
      planCode: body.planCode,
    })
    return { data: order }
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(
    @CurrentTenant() tenant: TenantContext,
    @Body() body: {
      razorpayOrderId: string
      razorpayPaymentId: string
      razorpaySignature: string
    },
  ) {
    const result = await this.payment.verifyPayment({
      tenantId: tenant.id,
      ...body,
    })
    return { data: result }
  }
}
