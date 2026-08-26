import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common'
import type { RegisterRequest } from '@jioplix/contracts'
import { newId } from '@jioplix/contracts'
import { sql } from 'drizzle-orm'
import { provisionTenant } from '@jioplix/db'
import { hashPassword } from '../auth/password.util.js'
import { DbService } from '../db/db.service.js'
import { MailerService } from '../mailer/mailer.service.js'

interface TenantRow {
  id: string
  slug: string
  schema_name: string
  status: string
}

interface UserRow {
  id: string
  phone: string
  email: string | null
}

export interface RegistrationResult {
  tenantId: string
  slug: string
  adminUserId: string
  phone: string
  email: string
  tempPassword: string
  planCode: string
}

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name)

  constructor(
    private readonly db: DbService,
    private readonly mailer: MailerService,
  ) {}

  async register(input: RegisterRequest): Promise<RegistrationResult> {
    const slug = input.slug.toLowerCase().trim()

    // 1. Check slug uniqueness
    const existing = await this.db.pool.query<TenantRow>(
      `SELECT id, slug, schema_name, status FROM public.tenants WHERE slug = $1`,
      [slug],
    )
    if (existing.rows[0]?.status === 'active') {
      throw new ConflictException('SLUG_TAKEN')
    }

    // 2. Check email uniqueness (global)
    const emailCheck = await this.db.pool.query(
      `SELECT id FROM public.platform_users WHERE email = $1`,
      [input.email],
    )
    if (emailCheck.rows[0]) {
      throw new ConflictException('EMAIL_TAKEN')
    }

    // 3. Provision the tenant (creates schema, roles, addons, branch)
    const { id: tenantId, schemaName } = await provisionTenant(this.db.pool, {
      name: input.clinicName,
      slug,
      planCode: input.planCode,
      clinicType: input.clinicType,
    })

    // 4. Create the admin user in the tenant schema
    const tempPassword = input.password
    const passwordHash = await hashPassword(tempPassword)
    const adminUserId = newId()

    await this.db.withTenant(schemaName, async (db) => {
      // Insert admin user
      await db.execute(sql`
        INSERT INTO users (id, full_name, phone, email, password_hash, status)
        VALUES (${adminUserId}, ${input.adminName}, ${input.phone}, ${input.email}, ${passwordHash}, 'active')
        ON CONFLICT (phone) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash
      `)

      // Assign tenant_admin role to the admin user
      await db.execute(sql`
        INSERT INTO user_branch_roles (user_id, branch_id, role_id)
        SELECT ${adminUserId}, b.id, r.id
        FROM branches b, roles r
        WHERE r.key = 'tenant_admin'
        ON CONFLICT DO NOTHING
      `)
    })

    // 5. Create initial subscription (14-day trial)
    const subscriptionId = newId()
    const now = new Date()
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    await this.db.pool.query(
      `INSERT INTO public.tenant_subscriptions
         (id, tenant_id, plan_code, status, current_period_start, current_period_end, trial_end)
       VALUES ($1, $2, $3, 'trialing', $4, $5, $6)`,
      [subscriptionId, tenantId, input.planCode, now, trialEnd, trialEnd],
    )

    // 6. Create the initial invoice for the trial period
    const { rows: planRows } = await this.db.pool.query<{ monthly_price_paise: string }>(
      `SELECT monthly_price_paise FROM public.plans WHERE code = $1`,
      [input.planCode],
    )
    const amountPaise = BigInt(planRows[0]?.monthly_price_paise ?? '0')

    await this.db.pool.query(
      `INSERT INTO public.tenant_invoices
         (id, tenant_id, subscription_id, amount_paise, status, billing_period_start, billing_period_end, due_date)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7)`,
      [newId(), tenantId, subscriptionId, amountPaise.toString(), now, trialEnd, trialEnd],
    )

    // 7. Send welcome notification
    this.logger.log(
      `[REGISTRATION] New tenant: ${input.clinicName} (${slug}) | Admin: ${input.adminName} | Plan: ${input.planCode}`,
    )
    await this.mailer.sendWelcomeEmail({
      to: input.email,
      clinicName: input.clinicName,
      slug,
      adminName: input.adminName,
      email: input.email,
      password: tempPassword,
      planCode: input.planCode,
    })

    return {
      tenantId,
      slug,
      adminUserId,
      phone: input.phone,
      email: input.email,
      tempPassword,
      planCode: input.planCode,
    }
  }

  async listPlans(): Promise<Array<{ code: string; name: string; monthlyPricePaise: number; addons: string[] }>> {
    const { rows } = await this.db.pool.query<{
      code: string
      name: string
      monthly_price_paise: string
      addons: string[]
    }>(`SELECT code, name, monthly_price_paise, addons FROM public.plans ORDER BY monthly_price_paise`)
    return rows.map((r) => ({
      code: r.code,
      name: r.name,
      monthlyPricePaise: Number(r.monthly_price_paise),
      addons: r.addons,
    }))
  }
}
