import { Injectable, NotFoundException } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import type { AuthContext, SubscriptionInfo, PlanInfo } from '@jioplix/contracts'
import { newId } from '@jioplix/contracts'
import { DbService } from '../db/db.service.js'

interface SubscriptionRow {
  id: string
  tenant_id: string
  plan_code: string
  status: string
  current_period_start: Date
  current_period_end: Date
  trial_end: Date | null
  cancelled_at: Date | null
}

interface PlanRow {
  code: string
  name: string
  monthly_price_paise: string
  addons: string[]
}

@Injectable()
export class SubscriptionService {
  constructor(private readonly db: DbService) {}

  async getActiveSubscription(tenantId: string): Promise<SubscriptionInfo | null> {
    const { rows } = await this.db.pool.query<SubscriptionRow>(
      `SELECT id, tenant_id, plan_code, status, current_period_start, current_period_end, trial_end, cancelled_at
       FROM public.tenant_subscriptions
       WHERE tenant_id = $1 AND status IN ('trialing', 'active', 'past_due')
       ORDER BY created_at DESC LIMIT 1`,
      [tenantId],
    )
    const row = rows[0]
    if (!row) return null
    return {
      id: row.id,
      tenantId: row.tenant_id,
      planCode: row.plan_code,
      status: row.status as SubscriptionInfo['status'],
      currentPeriodStart: row.current_period_start.toISOString(),
      currentPeriodEnd: row.current_period_end.toISOString(),
      trialEnd: row.trial_end?.toISOString() ?? null,
    }
  }

  async getSubscriptionHistory(tenantId: string): Promise<SubscriptionInfo[]> {
    const { rows } = await this.db.pool.query<SubscriptionRow>(
      `SELECT id, tenant_id, plan_code, status, current_period_start, current_period_end, trial_end, cancelled_at
       FROM public.tenant_subscriptions
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [tenantId],
    )
    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      planCode: r.plan_code,
      status: r.status as SubscriptionInfo['status'],
      currentPeriodStart: r.current_period_start.toISOString(),
      currentPeriodEnd: r.current_period_end.toISOString(),
      trialEnd: r.trial_end?.toISOString() ?? null,
    }))
  }

  async renewSubscription(tenantId: string, planCode?: string): Promise<SubscriptionInfo> {
    // Get current subscription
    const current = await this.getActiveSubscription(tenantId)
    const activePlan = planCode ?? current?.planCode ?? 'professional'

    // Get plan details
    const { rows: planRows } = await this.db.pool.query<PlanRow>(
      `SELECT code, name, monthly_price_paise, addons FROM public.plans WHERE code = $1`,
      [activePlan],
    )
    if (!planRows[0]) throw new NotFoundException('PLAN_NOT_FOUND')

    // Cancel current subscription if exists
    if (current) {
      await this.db.pool.query(
        `UPDATE public.tenant_subscriptions SET status = 'cancelled', cancelled_at = now(), updated_at = now()
         WHERE id = $1`,
        [current.id],
      )
    }

    // Create new subscription period
    const now = new Date()
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
    const subscriptionId = newId()

    await this.db.pool.query(
      `INSERT INTO public.tenant_subscriptions
         (id, tenant_id, plan_code, status, current_period_start, current_period_end)
       VALUES ($1, $2, $3, 'active', $4, $5)`,
      [subscriptionId, tenantId, activePlan, now, periodEnd],
    )

    // Create invoice
    await this.db.pool.query(
      `INSERT INTO public.tenant_invoices
         (id, tenant_id, subscription_id, amount_paise, status, billing_period_start, billing_period_end, due_date)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7)`,
      [newId(), tenantId, subscriptionId, planRows[0].monthly_price_paise, now, periodEnd, periodEnd],
    )

    // Update tenant plan
    await this.db.pool.query(
      `UPDATE public.tenants SET plan_code = $1, updated_at = now() WHERE id = $2`,
      [activePlan, tenantId],
    )

    return {
      id: subscriptionId,
      tenantId,
      planCode: activePlan,
      status: 'active',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      trialEnd: null,
    }
  }

  async checkAndSuspendExpired(): Promise<string[]> {
    const { rows: expired } = await this.db.pool.query<{ tenant_id: string }>(
      `SELECT DISTINCT ts.tenant_id
       FROM public.tenant_subscriptions ts
       JOIN public.tenants t ON t.id = ts.tenant_id
       WHERE ts.status IN ('active', 'past_due', 'trialing')
         AND ts.current_period_end < now() - (t.suspension_grace_days || ' days')::interval
         AND t.status = 'active'`,
    )

    const suspended: string[] = []
    for (const row of expired) {
      await this.db.pool.query(
        `UPDATE public.tenants SET status = 'suspended', suspended_at = now(), updated_at = now() WHERE id = $1`,
        [row.tenant_id],
      )
      suspended.push(row.tenant_id)
    }
    return suspended
  }

  async markOverdue(): Promise<number> {
    const { rowCount } = await this.db.pool.query(
      `UPDATE public.tenant_invoices SET status = 'overdue'
       WHERE status = 'pending' AND due_date < CURRENT_DATE`,
    )
    return rowCount ?? 0
  }

  async getTenantInvoices(tenantId: string): Promise<Array<{
    id: string; amountPaise: string; status: string; dueDate: string; paidAt: string | null
  }>> {
    const { rows } = await this.db.pool.query(
      `SELECT id, amount_paise, status, due_date, paid_at
       FROM public.tenant_invoices
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [tenantId],
    )
    return rows
  }
}
