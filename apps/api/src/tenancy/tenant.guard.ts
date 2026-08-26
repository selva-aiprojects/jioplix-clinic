import { CanActivate, ExecutionContext, Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { Request } from 'express'
import { DbService } from '../db/db.service.js'

export interface TenantContext {
  id: string
  name: string
  slug: string
  schemaName: string
  status: string
  planCode: string
  clinicType: string
}

declare module 'express' {
  interface Request {
    tenant?: TenantContext
  }
}

interface CacheEntry {
  tenant: TenantContext
  expiresAt: number
}

const CACHE_TTL_MS = 60_000

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name)
  private cache = new Map<string, CacheEntry>()

  constructor(private readonly db: DbService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>()

    if (req.auth) {
      const tenant = await this.resolve(req.auth.tenantId)
      if (!tenant || tenant.status === 'offboarded') {
        throw new NotFoundException('TENANT_NOT_FOUND')
      }
      if (tenant.status !== 'active') {
        throw new NotFoundException('TENANT_SUSPENDED')
      }
      req.tenant = tenant
      return true
    }

    const tenantKey = (req.headers['x-tenant-id'] as string) ?? ''
    if (!tenantKey) return false

    const tenant = await this.resolve(tenantKey)
    if (!tenant || tenant.status === 'offboarded') {
      throw new NotFoundException('TENANT_NOT_FOUND')
    }
    if (tenant.status !== 'active') {
      throw new NotFoundException('TENANT_SUSPENDED')
    }
    req.tenant = tenant
    return true
  }

  private async resolve(key: string): Promise<TenantContext | null> {
    const hit = this.cache.get(key)
    if (hit && hit.expiresAt > Date.now()) return hit.tenant

    const isUuid = /^[0-9a-f-]{36}$/i.test(key)
    const { rows } = await this.db.pool.query<TenantContext & { suspension_grace_days: number }>(
      `SELECT id, name, slug, schema_name AS "schemaName", status, plan_code AS "planCode", clinic_type AS "clinicType",
              suspension_grace_days
       FROM public.tenants WHERE ${isUuid ? 'id = $1' : 'slug = $1'}`,
      [key],
    )
    const tenant = rows[0] ?? null
    if (!tenant) return null

    // Auto-suspend check: if tenant is active but subscription has expired past grace period
    if (tenant.status === 'active') {
      const suspended = await this.checkSubscriptionAndSuspend(tenant.id, tenant.suspension_grace_days)
      if (suspended) {
        tenant.status = 'suspended'
        this.cache.delete(key) // invalidate cache
      }
    }

    this.cache.set(key, { tenant, expiresAt: Date.now() + CACHE_TTL_MS })
    return tenant
  }

  private async checkSubscriptionAndSuspend(tenantId: string, graceDays: number): Promise<boolean> {
    try {
      const { rows } = await this.db.pool.query<{ expired: boolean }>(
        `SELECT EXISTS(
           SELECT 1 FROM public.tenant_subscriptions ts
           WHERE ts.tenant_id = $1
             AND ts.status IN ('active', 'past_due', 'trialing')
             AND ts.current_period_end < now() - ($2 || ' days')::interval
         ) AS expired`,
        [tenantId, graceDays],
      )
      if (rows[0]?.expired) {
        await this.db.pool.query(
          `UPDATE public.tenants SET status = 'suspended', suspended_at = now(), updated_at = now() WHERE id = $1`,
          [tenantId],
        )
        this.logger.warn(`[AUTO-SUSPEND] Tenant ${tenantId} suspended: subscription expired past ${graceDays}-day grace period`)
        return true
      }
    } catch {
      // Non-critical: don't block requests if subscription check fails
    }
    return false
  }
}
