import { Injectable, NotFoundException } from '@nestjs/common'
import { and, desc, eq } from 'drizzle-orm'
import { DbService } from '../db/db.service.js'
import { notifications } from '../db/schema/tenant.js'

export interface NotificationView {
  id: string
  recipientUserId: string | null
  category: string
  title: string
  body: string
  href: string | null
  isRead: boolean
  createdAt: string
}

export interface NotificationInput {
  category: string
  title: string
  body: string
  href?: string | null
  recipientUserId?: string | null
}

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DbService) {}

  async list(
    schemaName: string,
    filters: { unread?: boolean; category?: string },
  ): Promise<NotificationView[]> {
    return this.db.withTenant(schemaName, (db) => {
      const conditions = []
      if (filters.unread) conditions.push(eq(notifications.isRead, false))
      if (filters.category) conditions.push(eq(notifications.category, filters.category))
      return db
        .select()
        .from(notifications)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(notifications.createdAt))
    })
  }

  async markRead(schemaName: string, id: string): Promise<{ id: string; isRead: boolean }> {
    return this.db.withTenant(schemaName, async (db) => {
      const [row] = await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, id))
        .returning({ id: notifications.id })
      if (!row) throw new NotFoundException('NOTIFICATION_NOT_FOUND')
      return { id: row.id, isRead: true }
    })
  }

  async markAllRead(schemaName: string): Promise<{ updated: number }> {
    return this.db.withTenant(schemaName, async (db) => {
      const result = await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.isRead, false))
      return { updated: result.rowCount ?? 0 }
    })
  }

  async create(schemaName: string, input: NotificationInput): Promise<NotificationView> {
    return this.db.withTenant(schemaName, async (db) => {
      const [row] = await db
        .insert(notifications)
        .values({
          category: input.category || 'system',
          title: input.title,
          body: input.body,
          href: input.href ?? null,
          recipientUserId: input.recipientUserId ?? null,
        })
        .returning()
      return {
        id: row.id,
        recipientUserId: row.recipientUserId ?? null,
        category: row.category,
        title: row.title,
        body: row.body,
        href: row.href ?? null,
        isRead: row.isRead,
        createdAt: row.createdAt.toISOString(),
      }
    })
  }
}
