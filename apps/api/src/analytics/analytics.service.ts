import { Injectable } from '@nestjs/common'
import { and, desc, eq, sql, gte, lte } from 'drizzle-orm'
import { DbService } from '../db/db.service.js'
import {
  invoices,
  patients,
  encounters,
  appointments,
  queueTokens,
  prescriptionItems,
  prescriptions,
} from '../db/schema/tenant.js'

export interface AnalyticsSummary {
  period: { from: string; to: string }
  revenue: { billedPaise: number; collectedPaise: number; pendingPaise: number }
  patients: { total: number; new: number; returning: number }
  appointments: { total: number; completed: number; cancelled: number; noShow: number }
  consultations: { total: number; avgPerDay: number }
  topDrugs: Array<{ drugName: string; count: number }>
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly db: DbService) {}

  async getSummary(
    schemaName: string,
    dateFrom?: string,
    dateTo?: string,
    branchId?: string,
  ): Promise<AnalyticsSummary> {
    const from = dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const to = dateTo || new Date().toISOString().slice(0, 10)
    const fromTs = new Date(from + 'T00:00:00Z')
    const toTs = new Date(to + 'T23:59:59Z')

    return this.db.withTenant(schemaName, async (db) => {
      const branchFilter = branchId ? eq(invoices.branchId, branchId) : undefined

      const [revRow] = await db
        .select({
          billed: sql<number>`coalesce(sum(${invoices.totalPaise}), 0)`,
          collected: sql<number>`coalesce(sum(${invoices.paidPaise}), 0)`,
          pending: sql<number>`coalesce(sum(${invoices.balancePaise}), 0)`,
        })
        .from(invoices)
        .where(and(
          gte(invoices.createdAt, fromTs),
          lte(invoices.createdAt, toTs),
          branchFilter,
        ))

      const patientBranchFilter = branchId ? undefined : undefined
      const [patRow] = await db
        .select({ total: sql<number>`count(*)` })
        .from(patients)
        .where(and(
          gte(patients.createdAt, fromTs),
          lte(patients.createdAt, toTs),
        ))

      const apptBranchFilter = branchId ? eq(appointments.branchId, branchId) : undefined
      const apptRows = await db
        .select({
          status: appointments.status,
          count: sql<number>`count(*)`,
        })
        .from(appointments)
        .where(and(
          gte(appointments.scheduledAt, fromTs),
          lte(appointments.scheduledAt, toTs),
          apptBranchFilter,
        ))
        .groupBy(appointments.status)

      const apptMap: Record<string, number> = {}
      for (const r of apptRows) apptMap[r.status] = r.count
      const totalAppts = Object.values(apptMap).reduce((s, n) => s + n, 0)

      const encBranchFilter = branchId ? eq(encounters.branchId, branchId) : undefined
      const [encRow] = await db
        .select({ total: sql<number>`count(*)` })
        .from(encounters)
        .where(and(
          gte(encounters.createdAt, fromTs),
          lte(encounters.createdAt, toTs),
          encBranchFilter,
        ))

      const daysDiff = Math.max(1, Math.ceil((toTs.getTime() - fromTs.getTime()) / 86400000) + 1)

      const drugRows = await db
        .select({
          drugName: prescriptionItems.drugName,
          count: sql<number>`count(*)`,
        })
        .from(prescriptionItems)
        .innerJoin(prescriptions, eq(prescriptionItems.prescriptionId, prescriptions.id))
        .where(and(
          gte(prescriptions.createdAt, fromTs),
          lte(prescriptions.createdAt, toTs),
        ))
        .groupBy(prescriptionItems.drugName)
        .orderBy(desc(sql<number>`count(*)`))
        .limit(10)

      return {
        period: { from, to },
        revenue: {
          billedPaise: revRow?.billed ?? 0,
          collectedPaise: revRow?.collected ?? 0,
          pendingPaise: revRow?.pending ?? 0,
        },
        patients: {
          total: patRow?.total ?? 0,
          new: patRow?.total ?? 0,
          returning: 0,
        },
        appointments: {
          total: totalAppts,
          completed: apptMap['completed'] ?? 0,
          cancelled: apptMap['cancelled'] ?? 0,
          noShow: apptMap['no_show'] ?? 0,
        },
        consultations: {
          total: encRow?.total ?? 0,
          avgPerDay: Math.round((encRow?.total ?? 0) / daysDiff * 10) / 10,
        },
        topDrugs: drugRows.map(r => ({ drugName: r.drugName, count: r.count })),
      }
    })
  }

  async getDailyRevenue(
    schemaName: string,
    dateFrom?: string,
    dateTo?: string,
    branchId?: string,
  ): Promise<Array<{ date: string; billed: number; collected: number }>> {
    const from = dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const to = dateTo || new Date().toISOString().slice(0, 10)
    const fromTs = new Date(from + 'T00:00:00Z')
    const toTs = new Date(to + 'T23:59:59Z')

    return this.db.withTenant(schemaName, async (db) => {
      const branchFilter = branchId ? eq(invoices.branchId, branchId) : undefined
      const rows = await db
        .select({
          date: sql<string>`to_char(${invoices.createdAt}, 'YYYY-MM-DD')`,
          billed: sql<number>`coalesce(sum(${invoices.totalPaise}), 0)`,
          collected: sql<number>`coalesce(sum(${invoices.paidPaise}), 0)`,
        })
        .from(invoices)
        .where(and(
          gte(invoices.createdAt, fromTs),
          lte(invoices.createdAt, toTs),
          branchFilter,
        ))
        .groupBy(sql`to_char(${invoices.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${invoices.createdAt}, 'YYYY-MM-DD')`)

      return rows.map(r => ({ date: r.date, billed: r.billed, collected: r.collected }))
    })
  }

  async getDailyPatients(
    schemaName: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<Array<{ date: string; count: number }>> {
    const from = dateFrom || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
    const to = dateTo || new Date().toISOString().slice(0, 10)
    const fromTs = new Date(from + 'T00:00:00Z')
    const toTs = new Date(to + 'T23:59:59Z')

    return this.db.withTenant(schemaName, async (db) => {
      const rows = await db
        .select({
          date: sql<string>`to_char(${appointments.scheduledAt}, 'YYYY-MM-DD')`,
          count: sql<number>`count(distinct ${appointments.patientId})`,
        })
        .from(appointments)
        .where(and(
          gte(appointments.scheduledAt, fromTs),
          lte(appointments.scheduledAt, toTs),
        ))
        .groupBy(sql`to_char(${appointments.scheduledAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${appointments.scheduledAt}, 'YYYY-MM-DD')`)

      return rows.map(r => ({ date: r.date, count: r.count }))
    })
  }
}
