import { Injectable } from '@nestjs/common'
import { and, desc, eq } from 'drizzle-orm'
import { DbService, type TenantTx } from '../db/db.service.js'
import { auditLogs } from '../db/schema/tenant.js'
import { newId } from '@jioplix/contracts'

export interface AuditInput {
  actorUserId: string
  actorRole: string
  entity: string
  entityId: string
  action: string
  oldValue?: Record<string, any> | null
  newValue?: Record<string, any> | null
  reason?: string | null
  ip?: string | null
  userAgent?: string | null
}

@Injectable()
export class AuditService {
  constructor(private readonly db: DbService) {}

  async write(schemaName: string, input: AuditInput) {
    await this.db.withTenant(schemaName, async (db) => {
      await db.insert(auditLogs).values({
        id: newId(),
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        entity: input.entity,
        entityId: input.entityId,
        action: input.action,
        oldValue: input.oldValue ?? null,
        newValue: input.newValue ?? null,
        reason: input.reason ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      })
    })
  }

  async list(schemaName: string, filters: { entity?: string; entityId?: string; from?: string; to?: string }) {
    return this.db.withTenant(schemaName, async (db) => {
      const conditions: any[] = []
      if (filters.entity) conditions.push(eq(auditLogs.entity, filters.entity))
      if (filters.entityId) conditions.push(eq(auditLogs.entityId, filters.entityId))

      const rows = await db
        .select()
        .from(auditLogs)
        .where(and(...conditions))
        .orderBy(desc(auditLogs.createdAt))
        .limit(100)

      return rows.map((r) => ({
        id: r.id,
        actorUserId: r.actorUserId,
        actorRole: r.actorRole,
        entity: r.entity,
        entityId: r.entityId,
        action: r.action,
        oldValue: r.oldValue,
        newValue: r.newValue,
        reason: r.reason,
        ip: r.ip,
        userAgent: r.userAgent,
        createdAt: r.createdAt.toISOString(),
      }))
    })
  }
}
