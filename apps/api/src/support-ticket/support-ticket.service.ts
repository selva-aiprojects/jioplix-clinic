import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { sql } from 'drizzle-orm'
import { newId } from '@jioplix/contracts'
import { DbService } from '../db/db.service.js'
import { MailerService } from '../mailer/mailer.service.js'

interface TicketRow {
  id: string; tenant_id: string; subject: string; category: string;
  priority: string; status: string; created_at: Date; updated_at: Date;
}
interface TicketResponseRow {
  id: string; ticket_id: string; responder_type: string; responder_name: string;
  message: string; created_at: Date;
}
interface TenantRow {
  id: string; schema_name: string; name: string;
}
interface UserRow {
  id: string; email: string; full_name: string;
}

@Injectable()
export class SupportTicketService {
  private readonly logger = new Logger(SupportTicketService.name)

  constructor(
    private readonly db: DbService,
    private readonly mailer: MailerService,
  ) {}

  async createTicket(
    tenantId: string,
    userId: string,
    subject: string,
    category: string,
    priority: string,
    message: string,
  ): Promise<{ id: string }> {
    const ticketId = newId()
    await this.db.pool.query(
      `INSERT INTO public.support_tickets (id, tenant_id, created_by_user_id, subject, category, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'open')`,
      [ticketId, tenantId, userId, subject, category, priority],
    )
    await this.db.pool.query(
      `INSERT INTO public.support_ticket_responses (id, ticket_id, responder_type, responder_name, message)
       VALUES ($1, $2, 'tenant', 'User', $3)`,
      [newId(), ticketId, message],
    )
    this.logger.log(`[TICKET] Created ticket ${ticketId} for tenant ${tenantId}`)
    return { id: ticketId }
  }

  async listTenantTickets(tenantId: string): Promise<TicketRow[]> {
    const { rows } = await this.db.pool.query<TicketRow>(
      `SELECT id, tenant_id, subject, category, priority, status, created_at, updated_at
       FROM public.support_tickets WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId],
    )
    return rows
  }

  async listAllTickets(statusFilter?: string): Promise<Array<TicketRow & { tenantName: string }>> {
    let query: string
    let params: string[] = []
    if (statusFilter && statusFilter !== 'all') {
      query = `SELECT t.id, t.tenant_id, t.subject, t.category, t.priority, t.status, t.created_at, t.updated_at,
                      tn.name AS "tenantName"
               FROM public.support_tickets t
               JOIN public.tenants tn ON tn.id = t.tenant_id
               WHERE t.status = $1 ORDER BY t.created_at DESC`
      params = [statusFilter]
    } else {
      query = `SELECT t.id, t.tenant_id, t.subject, t.category, t.priority, t.status, t.created_at, t.updated_at,
                      tn.name AS "tenantName"
               FROM public.support_tickets t
               JOIN public.tenants tn ON tn.id = t.tenant_id
               ORDER BY t.created_at DESC`
    }
    const { rows } = await this.db.pool.query<TicketRow & { tenantName: string }>(query, params)
    return rows
  }

  async getTicket(ticketId: string): Promise<{
    ticket: TicketRow & { tenantName: string }; responses: TicketResponseRow[];
  }> {
    const { rows: ticketRows } = await this.db.pool.query<TicketRow & { tenantName: string }>(
      `SELECT t.id, t.tenant_id, t.subject, t.category, t.priority, t.status, t.created_at, t.updated_at,
              tn.name AS "tenantName"
       FROM public.support_tickets t
       JOIN public.tenants tn ON tn.id = t.tenant_id
       WHERE t.id = $1`,
      [ticketId],
    )
    if (ticketRows.length === 0) throw new BadRequestException('Ticket not found')

    const { rows: responses } = await this.db.pool.query<TicketResponseRow>(
      `SELECT * FROM public.support_ticket_responses WHERE ticket_id = $1 ORDER BY created_at ASC`,
      [ticketId],
    )
    return { ticket: ticketRows[0], responses }
  }

  async addResponse(
    ticketId: string,
    responderType: string,
    responderName: string,
    message: string,
  ): Promise<TicketResponseRow> {
    const respId = newId()
    const { rows } = await this.db.pool.query<TicketResponseRow>(
      `INSERT INTO public.support_ticket_responses (id, ticket_id, responder_type, responder_name, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [respId, ticketId, responderType, responderName, message],
    )
    await this.db.pool.query(
      `UPDATE public.support_tickets SET updated_at = now() WHERE id = $1`,
      [ticketId],
    )

    // Notify tenant if platform responded
    if (responderType === 'platform') {
      const { rows: ticketRows } = await this.db.pool.query<{ tenant_id: string; subject: string }>(
        `SELECT tenant_id, subject FROM public.support_tickets WHERE id = $1`, [ticketId],
      )
      if (ticketRows[0]) {
        const { rows: tenantRows } = await this.db.pool.query<TenantRow>(
          `SELECT id, name, schema_name FROM public.tenants WHERE id = $1`, [ticketRows[0].tenant_id],
        )
        const tenant = tenantRows[0]
        if (tenant) {
          await this.db.withTenant(tenant.schema_name, async (db) => {
            const adminsResult = await db.execute(sql`
              SELECT id, email, full_name FROM users WHERE is_admin = true LIMIT 1
            `)
            const admins = adminsResult.rows as unknown as UserRow[]
            if (admins[0]) {
              await this.mailer.sendTicketResponseEmail({
                to: admins[0].email,
                userName: admins[0].full_name,
                ticketSubject: ticketRows[0].subject,
                responderName,
                message,
                ticketUrl: `https://jioplix-clinic.vercel.app/support`,
              })
            }
          })
        }
      }
    }

    return rows[0]
  }

  async updateStatus(ticketId: string, status: string): Promise<{ success: boolean }> {
    await this.db.pool.query(
      `UPDATE public.support_tickets SET status = $1, updated_at = now() WHERE id = $2`,
      [status, ticketId],
    )
    return { success: true }
  }

  async getStats(): Promise<{ open: number; inProgress: number; resolved: number; closed: number }> {
    const { rows } = await this.db.pool.query<{ status: string; count: string }>(
      `SELECT status, count(*)::text AS count FROM public.support_tickets GROUP BY status`,
    )
    const map = Object.fromEntries(rows.map(r => [r.status, parseInt(r.count)]))
    return {
      open: map.open ?? 0,
      inProgress: map['in-progress'] ?? 0,
      resolved: map.resolved ?? 0,
      closed: map.closed ?? 0,
    }
  }
}
