import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common'
import type { AuthContext, TenantActionRequest } from '@jioplix/contracts'
import { newId } from '@jioplix/contracts'
import { DbService } from '../db/db.service.js'
import { hashPassword, verifyPassword } from '../auth/password.util.js'
import { signAccessToken } from '../auth/jwt.util.js'
import { SubscriptionService } from '../subscription/subscription.service.js'

interface PlatformUserRow {
  id: string
  email: string
  full_name: string
  role: string
  password_hash: string | null
}

interface TenantRow {
  id: string
  name: string
  slug: string
  schema_name: string
  status: string
  plan_code: string
  clinic_type: string
  created_at: Date
}

interface SubscriptionRow {
  status: string
  plan_code: string
  current_period_end: Date
}

export interface PlatformAdminContext {
  userId: string
  email: string
  fullName: string
  role: string
}

@Injectable()
export class PlatformAdminService implements OnModuleInit {
  private readonly logger = new Logger(PlatformAdminService.name)

  constructor(
    private readonly db: DbService,
    private readonly subscription: SubscriptionService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureDefaultAdmin()
    } catch (err) {
      this.logger.error('Failed to ensure default platform admin', err)
    }
  }

  private get secret(): string {
    const secret = process.env.JWT_SECRET
    if (!secret) throw new Error('JWT_SECRET is not configured')
    return secret
  }

  async ensureDefaultAdmin(): Promise<void> {
    const { rows } = await this.db.pool.query(
      `SELECT id FROM public.platform_users WHERE email = 'admin@jioplix.com'`,
    )
    if (rows.length === 0) {
      const passwordHash = await hashPassword('admin1234')
      await this.db.pool.query(
        `INSERT INTO public.platform_users (id, email, full_name, role, password_hash)
         VALUES ($1, 'admin@jioplix.com', 'Platform Admin', 'platform_admin', $2)
         ON CONFLICT (email) DO NOTHING`,
        [newId(), passwordHash],
      )
      this.logger.log('[PLATFORM] Default admin created: admin@jioplix.com / admin1234')
    }
  }

  async login(email: string, password: string): Promise<{ accessToken: string; user: PlatformAdminContext }> {
    const { rows } = await this.db.pool.query<PlatformUserRow>(
      `SELECT id, email, full_name, role, password_hash FROM public.platform_users WHERE email = $1`,
      [email],
    )
    const user = rows[0]
    if (!user) throw new UnauthorizedException('INVALID_CREDENTIALS')

    const ok = await verifyPassword(password, user.password_hash)
    if (!ok) throw new UnauthorizedException('INVALID_CREDENTIALS')

    const accessToken = signAccessToken(
      { sub: user.email, tid: '', schema: '', slug: '', roles: [user.role], perms: ['*'] },
      this.secret,
      '8h',
    )

    return {
      accessToken,
      user: {
        userId: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    }
  }

  async listTenants(): Promise<Array<{
    id: string; name: string; slug: string; status: string; planCode: string;
    clinicType: string; createdAt: string;
    subscription: { status: string; planCode: string; periodEnd: string } | null;
  }>> {
    const { rows: tenants } = await this.db.pool.query<TenantRow>(
      `SELECT id, name, slug, schema_name, status, plan_code, clinic_type, created_at
       FROM public.tenants ORDER BY created_at DESC`,
    )

    const result = []
    for (const t of tenants) {
      const sub = await this.subscription.getActiveSubscription(t.id)
      result.push({
        id: t.id,
        name: t.name,
        slug: t.slug,
        status: t.status,
        planCode: t.plan_code,
        clinicType: t.clinic_type,
        createdAt: t.created_at.toISOString(),
        subscription: sub ? {
          status: sub.status,
          planCode: sub.planCode,
          periodEnd: sub.currentPeriodEnd,
        } : null,
      })
    }
    return result
  }

  async performTenantAction(input: TenantActionRequest): Promise<{ id: string; status: string }> {
    const { rows } = await this.db.pool.query<{ id: string; status: string }>(
      `SELECT id, status FROM public.tenants WHERE id = $1`,
      [input.tenantId],
    )
    if (!rows[0]) throw new BadRequestException('TENANT_NOT_FOUND')

    switch (input.action) {
      case 'suspend':
        await this.db.pool.query(
          `UPDATE public.tenants SET status = 'suspended', suspended_at = now(), updated_at = now() WHERE id = $1`,
          [input.tenantId],
        )
        return { id: input.tenantId, status: 'suspended' }

      case 'unsuspend':
        await this.db.pool.query(
          `UPDATE public.tenants SET status = 'active', suspended_at = NULL, updated_at = now() WHERE id = $1`,
          [input.tenantId],
        )
        return { id: input.tenantId, status: 'active' }

      case 'offboard':
        await this.db.pool.query(
          `UPDATE public.tenants SET status = 'offboarded', updated_at = now() WHERE id = $1`,
          [input.tenantId],
        )
        return { id: input.tenantId, status: 'offboarded' }
    }
  }

  async getDashboardStats(): Promise<{
    totalTenants: number
    activeTenants: number
    suspendedTenants: number
    trialingTenants: number
    revenue: { totalPending: number; totalPaid: number }
  }> {
    const { rows: counts } = await this.db.pool.query<{
      status: string; count: string
    }>(`SELECT status, COUNT(*)::text AS count FROM public.tenants GROUP BY status`)

    const statusMap: Record<string, number> = {}
    for (const r of counts) statusMap[r.status] = Number(r.count)

    const { rows: revenue } = await this.db.pool.query<{
      status: string; total: string
    }>(`SELECT status, COALESCE(SUM(amount_paise), 0)::text AS total FROM public.tenant_invoices GROUP BY status`)

    let totalPending = 0
    let totalPaid = 0
    for (const r of revenue) {
      if (r.status === 'pending' || r.status === 'overdue') totalPending += Number(r.total)
      if (r.status === 'paid') totalPaid += Number(r.total)
    }

    // Check for tenants that need suspension
    await this.subscription.checkAndSuspendExpired()
    await this.subscription.markOverdue()

    return {
      totalTenants: Object.values(statusMap).reduce((a, b) => a + b, 0),
      activeTenants: statusMap['active'] ?? 0,
      suspendedTenants: statusMap['suspended'] ?? 0,
      trialingTenants: statusMap['provisioning'] ?? 0,
      revenue: { totalPending, totalPaid },
    }
  }

  // ─── Platform Settings ───

  async getSettings(): Promise<Record<string, unknown>> {
    const { rows } = await this.db.pool.query<{ key: string; value: { value: unknown } }>(
      `SELECT key, value FROM public.platform_settings`,
    )
    const settings: Record<string, unknown> = {}
    for (const r of rows) settings[r.key] = r.value?.value ?? r.value
    return settings
  }

  async updateSettings(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    for (const [key, value] of Object.entries(input)) {
      await this.db.pool.query(
        `INSERT INTO public.platform_settings (key, value, updated_at)
         VALUES ($1, $2::jsonb, now())
         ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = now()`,
        [key, JSON.stringify({ value })],
      )
    }
    return this.getSettings()
  }

  async getSetting<T = unknown>(key: string): Promise<T | null> {
    const { rows } = await this.db.pool.query<{ value: T }>(
      `SELECT value FROM public.platform_settings WHERE key = $1`,
      [key],
    )
    return rows[0]?.value ?? null
  }
}
