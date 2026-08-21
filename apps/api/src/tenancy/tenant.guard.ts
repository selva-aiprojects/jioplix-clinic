import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common'
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
    const { rows } = await this.db.pool.query<TenantContext>(
      `SELECT id, name, slug, schema_name AS "schemaName", status, plan_code AS "planCode", clinic_type AS "clinicType"
       FROM public.tenants WHERE ${isUuid ? 'id = $1' : 'slug = $1'}`,
      [key],
    )
    const tenant = rows[0] ?? null
    if (tenant) {
      this.cache.set(key, { tenant, expiresAt: Date.now() + CACHE_TTL_MS })
    }
    return tenant
  }
}
