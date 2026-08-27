import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { sql } from 'drizzle-orm'
import { DbService } from '../db/db.service.js'
import { MailerService } from '../mailer/mailer.service.js'
import { PlatformAdminService } from '../platform-admin/platform-admin.service.js'

interface SubscriptionRow {
  id: string; tenant_id: string; plan_id: string; status: string;
  trial_end: Date | null; current_period_end: Date; created_at: Date;
}
interface TenantRow {
  id: string; name: string; slug: string; schema_name: string; status: string;
}
interface PlanRow {
  id: string; code: string; name: string; monthly_price: number;
}
interface InvoiceRow {
  id: string; tenant_id: string; subscription_id: string; amount_paise: string;
  status: string; billing_period_start: Date; billing_period_end: Date; due_date: Date;
}
interface EmailLogRow {
  id: string; tenant_id: string; email_type: string; sent_at: Date;
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name)

  constructor(
    private readonly db: DbService,
    private readonly mailer: MailerService,
    private readonly platformAdmin: PlatformAdminService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async runDailyChecks() {
    this.logger.log('[SCHEDULER] Running daily checks...')
    await this.sendTrialReminders()
    await this.sendPaymentFollowups()
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_NOON)
  async runMonthlyChecks() {
    this.logger.log('[SCHEDULER] Running monthly checks...')
    await this.sendMonthlyReceivableReport()
  }

  async sendTrialReminders() {
    const now = new Date()
    const { rows: subscriptions } = await this.db.pool.query<SubscriptionRow>(
      `SELECT s.* FROM public.subscriptions s
       WHERE s.status = 'active'
       AND s.trial_end IS NOT NULL
       AND s.trial_end > $1
       AND s.trial_end <= $1::date + INTERVAL '14 days'`,
      [now],
    )

    let sent = 0
    for (const sub of subscriptions) {
      const trialEnd = new Date(sub.trial_end!)
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000)

      // Only send on day 12 (gentle) and day 2 (urgent)
      if (daysRemaining > 12 || daysRemaining < 1) continue

      // Check if already sent today for this tenant
      const alreadySent = await this.db.pool.query<EmailLogRow>(
        `SELECT id FROM public.email_logs
         WHERE tenant_id = $1 AND email_type = 'trial_reminder'
         AND sent_at >= CURRENT_DATE`,
        [sub.tenant_id],
      )
      if (alreadySent.rows.length > 0) continue

      // Get tenant details
      const { rows: tenants } = await this.db.pool.query<TenantRow>(
        `SELECT id, name, slug, schema_name FROM public.tenants WHERE id = $1`,
        [sub.tenant_id],
      )
      const tenant = tenants[0]
      if (!tenant) continue

      // Find tenant admin email
      let adminEmail = ''
      let adminName = ''
      try {
        await this.db.withTenant(tenant.schema_name, async (db) => {
          const result = await db.execute(sql`
            SELECT email, full_name FROM users WHERE is_admin = true LIMIT 1
          `)
          const admin = result.rows[0] as { email: string; full_name: string } | undefined
          if (admin) {
            adminEmail = admin.email
            adminName = admin.full_name
          }
        })
      } catch { continue }

      if (!adminEmail) continue

      await this.mailer.sendTrialReminderEmail({
        to: adminEmail,
        clinicName: tenant.name,
        daysRemaining,
        loginUrl: 'https://jioplix-clinic.vercel.app/login',
      })

      // Log it
      await this.db.pool.query(
        `INSERT INTO public.email_logs (id, tenant_id, email_type, recipient, sent_at)
         VALUES ($1, $2, 'trial_reminder', $3, now())`,
        [crypto.randomUUID(), sub.tenant_id, adminEmail],
      )

      sent++
      this.logger.log(`[SCHEDULER] Trial reminder sent to ${adminEmail} for ${tenant.name} (${daysRemaining} days left)`)
    }
    this.logger.log(`[SCHEDULER] Trial reminders: ${sent} sent`)
  }

  async sendPaymentFollowups() {
    const now = new Date()
    // Find subscriptions where trial ended but no payment (status = active but overdue)
    const { rows: overdueSubs } = await this.db.pool.query<SubscriptionRow>(
      `SELECT s.* FROM public.subscriptions s
       WHERE s.status = 'active'
       AND s.trial_end IS NOT NULL
       AND s.trial_end < $1
       AND s.current_period_end < $1`,
      [now],
    )

    // Get platform admin email
    const { rows: admins } = await this.db.pool.query<{ email: string }>(
      `SELECT email FROM public.platform_users WHERE role = 'super_admin' LIMIT 1`,
    )
    const adminEmail = admins[0]?.email
    if (!adminEmail) return

    let sent = 0
    for (const sub of overdueSubs) {
      // Check if already sent today
      const alreadySent = await this.db.pool.query<EmailLogRow>(
        `SELECT id FROM public.email_logs
         WHERE tenant_id = $1 AND email_type = 'payment_followup'
         AND sent_at >= CURRENT_DATE`,
        [sub.tenant_id],
      )
      if (alreadySent.rows.length > 0) continue

      // Get tenant + plan details
      const { rows: tenants } = await this.db.pool.query<TenantRow>(
        `SELECT id, name, slug FROM public.tenants WHERE id = $1`, [sub.tenant_id],
      )
      const { rows: plans } = await this.db.pool.query<PlanRow>(
        `SELECT id, code, name, monthly_price FROM public.plans WHERE id = $1`, [sub.plan_id],
      )
      const tenant = tenants[0]
      const plan = plans[0]
      if (!tenant || !plan) continue

      const daysOverdue = Math.ceil((now.getTime() - new Date(sub.trial_end!).getTime()) / 86400000)

      await this.mailer.sendPaymentFollowupEmail({
        to: adminEmail,
        clinicName: tenant.name,
        slug: tenant.slug,
        planName: plan.name,
        amountPaise: plan.monthly_price,
        daysOverdue,
      })

      await this.db.pool.query(
        `INSERT INTO public.email_logs (id, tenant_id, email_type, recipient, sent_at)
         VALUES ($1, $2, 'payment_followup', $3, now())`,
        [crypto.randomUUID(), sub.tenant_id, adminEmail],
      )

      sent++
    }
    this.logger.log(`[SCHEDULER] Payment followups: ${sent} sent`)
  }

  async sendMonthlyReceivableReport() {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthLabel = monthStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

    // Get platform admin email
    const { rows: admins } = await this.db.pool.query<{ email: string }>(
      `SELECT email FROM public.platform_users WHERE role = 'super_admin' LIMIT 1`,
    )
    const adminEmail = admins[0]?.email
    if (!adminEmail) return

    // Get paid invoices this month
    const { rows: paid } = await this.db.pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(amount_paise), 0)::text AS total
       FROM public.tenant_invoices WHERE status = 'paid'
       AND updated_at >= $1`, [monthStart],
    )

    // Get pending invoices
    const { rows: pendingInvoices } = await this.db.pool.query<InvoiceRow & { tenant_name: string; slug: string }>(
      `SELECT i.*, t.name AS tenant_name, t.slug
       FROM public.tenant_invoices i
       JOIN public.tenants t ON t.id = i.tenant_id
       WHERE i.status = 'pending'`,
    )

    const pendingTenants = pendingInvoices.map(inv => ({
      clinicName: inv.tenant_name,
      slug: inv.slug,
      amountPaise: parseInt(inv.amount_paise),
      daysOverdue: Math.ceil((now.getTime() - new Date(inv.due_date).getTime()) / 86400000),
    }))

    const totalPaid = parseInt(paid[0]?.total ?? '0')
    const totalPending = pendingTenants.reduce((sum, t) => sum + t.amountPaise, 0)

    await this.mailer.sendMonthlyReceivableReport({
      to: adminEmail,
      month: monthLabel,
      totalPending,
      totalPaid,
      pendingTenants,
    })

    this.logger.log(`[SCHEDULER] Monthly receivable report sent for ${monthLabel}: ₹${totalPaid} collected, ₹${totalPending} pending`)
  }
}
