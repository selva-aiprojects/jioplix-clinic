import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { and, asc, eq, sql } from 'drizzle-orm'
import { LAB_ORDER_TRANSITIONS } from '@jioplix/contracts'
import type {
  LabOrder,
  LabOrderCreate,
  LabOrderStatus,
  LabResultEntry,
} from '@jioplix/contracts'
import { newId } from '@jioplix/contracts'
import { DbService } from '../db/db.service.js'
import { BillingService } from '../billing/billing.service.js'
import { labOrders, patients, users, encounters, invoices } from '../db/schema/tenant.js'

type LabOrderRow = typeof labOrders.$inferSelect

@Injectable()
export class LabsService {
  constructor(private readonly db: DbService, private readonly billing: BillingService) {}

  async list(schemaName: string, filters: { date?: string; status?: string; patientId?: string }): Promise<LabOrder[]> {
    return this.db.withTenant(schemaName, async (db) => {
      const conditions = []
      if (filters.date) conditions.push(sql`date(${labOrders.createdAt}) = ${filters.date}`)
      if (filters.status) conditions.push(sql`${labOrders.status} = ${filters.status}`)
      if (filters.patientId) conditions.push(eq(labOrders.patientId, filters.patientId))

      const rows = await db
        .select({
          order: labOrders,
          patientFirst: patients.firstName,
          patientLast: patients.lastName,
          doctorName: users.fullName,
        })
        .from(labOrders)
        .innerJoin(patients, eq(labOrders.patientId, patients.id))
        .innerJoin(users, eq(labOrders.doctorId, users.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(asc(labOrders.createdAt))

      return rows.map((r) => this.toView(r.order, r.patientFirst, r.patientLast, r.doctorName))
    })
  }

  async create(schemaName: string, input: LabOrderCreate): Promise<LabOrder> {
    return this.db.withTenant(schemaName, async (db) =>
      db.transaction(async (tx) => {
        const [patient] = await tx
          .select({ firstName: patients.firstName, lastName: patients.lastName })
          .from(patients)
          .where(eq(patients.id, input.patientId))
          .limit(1)
        if (!patient) throw new NotFoundException('PATIENT_NOT_FOUND')

        const [doctor] = await tx
          .select({ fullName: users.fullName })
          .from(users)
          .where(and(eq(users.id, input.doctorId), eq(users.status, 'active')))
          .limit(1)
        if (!doctor) throw new NotFoundException('DOCTOR_NOT_FOUND')

        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const [row] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(labOrders)
          .where(sql`date(${labOrders.createdAt}) = CURRENT_DATE`)
        const seq = String(Number(row?.count ?? 0) + 1).padStart(3, '0')
        const orderNo = `LB-${today}-${seq}`

        const [created] = await tx
          .insert(labOrders)
          .values({
            id: newId(),
            orderNo,
            patientId: input.patientId,
            encounterId: input.encounterId ?? null,
            doctorId: input.doctorId,
            priority: input.priority,
            investigations: input.investigations.map((i) => ({
              name: i.name,
              sampleType: i.sampleType ?? null,
            })),
            notes: input.notes ?? null,
          })
          .returning()

        return this.toView(created, patient.firstName, patient.lastName, doctor.fullName)
      }),
    )
  }

  async updateStatus(schemaName: string, orderId: string, next: LabOrderStatus): Promise<LabOrder> {
    return this.db.withTenant(schemaName, async (db) => {
      const [current] = await db.select().from(labOrders).where(eq(labOrders.id, orderId)).limit(1)
      if (!current) throw new NotFoundException('LAB_ORDER_NOT_FOUND')

      const allowed = LAB_ORDER_TRANSITIONS[current.status as LabOrderStatus] ?? []
      if (!allowed.includes(next)) throw new ConflictException('INVALID_TRANSITION')

      if ((next === 'completed' || next === 'reviewed') && !current.results?.length) {
        throw new BadRequestException('RESULTS_REQUIRED')
      }

      const [updated] = await db
        .update(labOrders)
        .set({ status: next, updatedAt: new Date() })
        .where(eq(labOrders.id, orderId))
        .returning()

      const [patient] = await db
        .select({ firstName: patients.firstName, lastName: patients.lastName })
        .from(patients)
        .where(eq(patients.id, current.patientId))
        .limit(1)
      const [doctor] = await db
        .select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, current.doctorId))
        .limit(1)

      return this.toView(
        updated,
        patient?.firstName ?? '',
        patient?.lastName ?? '',
        doctor?.fullName ?? '',
      )
    })
  }

  async saveResults(
    schemaName: string,
    orderId: string,
    results: LabResultEntry[],
    complete: boolean,
    actorUserId: string,
  ): Promise<LabOrder> {
    return this.db.withTenant(schemaName, async (db) => {
      const [current] = await db.select().from(labOrders).where(eq(labOrders.id, orderId)).limit(1)
      if (!current) throw new NotFoundException('LAB_ORDER_NOT_FOUND')

      if (current.status === 'ordered') {
        throw new BadRequestException('SAMPLE_NOT_COLLECTED')
      }
      if (current.status === 'cancelled' || current.status === 'reviewed') {
        throw new ConflictException('INVALID_STATE')
      }

      const nextStatus =
        complete && (current.status === 'processing' || current.status === 'collected')
          ? 'completed'
          : current.status

      const [updated] = await db
        .update(labOrders)
        .set({
          results,
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(eq(labOrders.id, orderId))
        .returning()

      if (nextStatus === 'completed' && current.encounterId) {
        const [enc] = await db
          .select({ patientId: encounters.patientId, appointmentId: encounters.appointmentId })
          .from(encounters)
          .where(eq(encounters.id, current.encounterId))
          .limit(1)

        const [existingDraft] = await db
          .select()
          .from(invoices)
          .where(and(eq(invoices.encounterId, current.encounterId), eq(invoices.status, 'draft')))
          .limit(1)

        if (!existingDraft && enc?.patientId) {
          await this.billing.createInvoice(
            schemaName,
            {
              encounterId: current.encounterId,
              appointmentId: enc.appointmentId ?? undefined,
              patientId: enc.patientId,
              status: 'draft',
              lines: (current.investigations ?? []).map((inv) => ({
                itemType: 'lab',
                itemName: inv.name,
                quantity: 1,
                unitPricePaise: 0,
                cgstRate: 0,
                sgstRate: 0,
                igstRate: 0,
              })),
              discountPaise: 0,
            },
            actorUserId,
          )
        }
      }

      const [patient] = await db
        .select({ firstName: patients.firstName, lastName: patients.lastName })
        .from(patients)
        .where(eq(patients.id, current.patientId))
        .limit(1)
      const [doctor] = await db
        .select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, current.doctorId))
        .limit(1)

      return this.toView(
        updated,
        patient?.firstName ?? '',
        patient?.lastName ?? '',
        doctor?.fullName ?? '',
      )
    })
  }

  private toView(r: LabOrderRow, first: string, last: string, doctorName: string): LabOrder {
    return {
      id: r.id,
      orderNo: r.orderNo,
      patientId: r.patientId,
      patientName: `${first} ${last}`,
      encounterId: r.encounterId,
      doctorId: r.doctorId,
      doctorName,
      status: r.status as LabOrderStatus,
      priority: r.priority as LabOrder['priority'],
      investigations: r.investigations ?? [],
      results: r.results ?? null,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }
  }
}
