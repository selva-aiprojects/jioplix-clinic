export interface CreateOrderInput {
  amountPaise: number
  currency: string
  receipt: string
  notes?: Record<string, string>
}

export interface CreateOrderResult {
  orderId: string
  amount: number
  currency: string
}

export interface VerifyPaymentInput {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

export interface VerifyPaymentResult {
  verified: boolean
  paymentId: string
  amount: number
}

export interface RefundInput {
  paymentId: string
  amountPaise?: number
  notes?: string
}

export interface RefundResult {
  refundId: string
  status: string
}

export interface PaymentGateway {
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>
  refund(input: RefundInput): Promise<RefundResult>
}
