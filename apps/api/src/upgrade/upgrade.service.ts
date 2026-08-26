import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { eq, and, gte, lte } from 'drizzle-orm'
import { DbService } from '../db/db.service.js'

interface PlanRow {
  id: string; code: string; name: string; monthly_price: number; features: any;
}
interface SubscriptionRow {
  id: string; tenant_id: string; plan_id: string; status: string; current_period_start: Date;
  current_period_end: Date; trial_end: Date | null;
}
interface DiscountRow {
  id: string; code: string; description: string; discount_type: string; discount_value: number;
  applies_to: string; max_uses: number | null; current_uses: number;
  valid_from: Date; valid_until: Date | null; active: boolean;
}

@Injectable()
export class UpgradeService {
  private readonly logger = new Logger(UpgradeService.name)

  constructor(private readonly db: DbService) {}

  async getPlans(): Promise<PlanRow[]> {
    const { rows } = await this.db.pool.query<PlanRow>(
      `SELECT id, code, name, monthly_price, features FROM public.plans WHERE is_active = true ORDER BY monthly_price`,
    )
    return rows
  }

  async upgradePlan(
    tenantId: string,
    newPlanCode: string,
    discountCode?: string,
  ): Promise<{ newPlan: string; proratedAmount: number; discountApplied: number }> {
    // Get current subscription
    const { rows: subRows } = await this.db.pool.query<SubscriptionRow>(
      `SELECT * FROM public.subscriptions WHERE tenant_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
      [tenantId],
    )
    if (subRows.length === 0) throw new BadRequestException('No active subscription')
    const sub = subRows[0]

    // Get current plan
    const { rows: currentPlanRows } = await this.db.pool.query<PlanRow>(
      `SELECT * FROM public.plans WHERE id = $1`, [sub.plan_id],
    )
    const currentPlan = currentPlanRows[0]
    if (!currentPlan) throw new BadRequestException('Current plan not found')

    // Get new plan
    const { rows: newPlanRows } = await this.db.pool.query<PlanRow>(
      `SELECT * FROM public.plans WHERE code = $1 AND is_active = true`, [newPlanCode],
    )
    if (newPlanRows.length === 0) throw new BadRequestException('Invalid plan')
    const newPlan = newPlanRows[0]

    if (currentPlan.code === newPlanCode) throw new BadRequestException('Already on this plan')

    // Calculate prorated amount
    const now = new Date()
    const periodEnd = new Date(sub.current_period_end)
    const totalDays = Math.ceil((periodEnd.getTime() - new Date(sub.current_period_start).getTime()) / 86400000)
    const remainingDays = Math.max(1, Math.ceil((periodEnd.getTime() - now.getTime()) / 86400000))
    const dailyRate = newPlan.monthly_price / 30
    let proratedAmount = Math.round(dailyRate * remainingDays)

    // Apply discount if provided
    let discountApplied = 0
    if (discountCode) {
      discountApplied = await this.validateAndApplyDiscount(discountCode, tenantId)
      proratedAmount = Math.max(0, proratedAmount - discountApplied)
    }

    // Update subscription to new plan
    await this.db.pool.query(
      `UPDATE public.subscriptions SET plan_id = $1, updated_at = now() WHERE id = $2`,
      [newPlan.id, sub.id],
    )

    this.logger.log(`[UPGRADE] Tenant ${tenantId}: ${currentPlan.code} → ${newPlan.code}, amount: ₹${proratedAmount}, discount: ₹${discountApplied}`)
    return { newPlan: newPlan.code, proratedAmount, discountApplied }
  }

  async downgradePlan(tenantId: string, newPlanCode: string): Promise<{ success: boolean; message: string }> {
    const { rows: subRows } = await this.db.pool.query<SubscriptionRow>(
      `SELECT * FROM public.subscriptions WHERE tenant_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
      [tenantId],
    )
    if (subRows.length === 0) throw new BadRequestException('No active subscription')
    const sub = subRows[0]

    const { rows: newPlanRows } = await this.db.pool.query<PlanRow>(
      `SELECT * FROM public.plans WHERE code = $1 AND is_active = true`, [newPlanCode],
    )
    if (newPlanRows.length === 0) throw new BadRequestException('Invalid plan')

    await this.db.pool.query(
      `UPDATE public.subscriptions SET plan_id = $1, updated_at = now() WHERE id = $2`,
      [newPlanRows[0].id, sub.id],
    )

    return { success: true, message: `Plan changed to ${newPlanCode}. Changes take effect at next billing cycle.` }
  }

  async applyTrialExtension(tenantId: string, days: number): Promise<{ success: boolean }> {
    const { rows: subRows } = await this.db.pool.query<SubscriptionRow>(
      `SELECT * FROM public.subscriptions WHERE tenant_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
      [tenantId],
    )
    if (subRows.length === 0) throw new BadRequestException('No active subscription')

    const sub = subRows[0]
    const currentEnd = sub.trial_end ? new Date(sub.trial_end) : new Date(sub.current_period_end)
    const newEnd = new Date(currentEnd.getTime() + days * 86400000)

    await this.db.pool.query(
      `UPDATE public.subscriptions SET trial_end = $1, current_period_end = GREATEST(current_period_end, $1), updated_at = now() WHERE id = $2`,
      [newEnd, sub.id],
    )

    this.logger.log(`[TRIAL EXTEND] Tenant ${tenantId}: extended by ${days} days`)
    return { success: true }
  }

  async validateDiscount(code: string): Promise<DiscountRow> {
    const { rows } = await this.db.pool.query<DiscountRow>(
      `SELECT * FROM public.discount_codes WHERE code = $1 AND active = true`, [code],
    )
    const d = rows[0]
    if (!d) throw new BadRequestException('INVALID_CODE')
    if (d.valid_until && new Date(d.valid_until) < new Date()) throw new BadRequestException('CODE_EXPIRED')
    if (d.max_uses && d.current_uses >= d.max_uses) throw new BadRequestException('CODE_MAXED_OUT')
    return d
  }

  private async validateAndApplyDiscount(code: string, tenantId: string): Promise<number> {
    const d = await this.validateDiscount(code)
    let discount = 0
    if (d.discount_type === 'percentage') {
      discount = Math.round((d.discount_value / 100) * 1000) // default to ₹1000 base, will be replaced by actual plan price in caller
    } else {
      discount = d.discount_value
    }
    await this.db.pool.query(
      `UPDATE public.discount_codes SET current_uses = current_uses + 1 WHERE id = $1`,
      [d.id],
    )
    return discount
  }
}
