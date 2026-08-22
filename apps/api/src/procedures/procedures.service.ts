import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { and, asc, eq, sql } from 'drizzle-orm'
import { PROCEDURE_TRANSITIONS } from '@jioplix/contracts'
import type { ProcedureOrder, ProcedureOrderCreate, ProcedureStatus } from '@jioplix/contracts'
import { newId } from '@jioplix/contracts'
import { DbService } from '../db/db.service.js'
import { patients, procedureOrders, users } from '../db/schema/tenant.js'

type ProcedureRow = typeof procedureOrders.$inferSelect

@Injectable()
export class ProceduresService {
  constructor(private readonly db: DbService) {}

  async list(schemaName: string, filters: { date?: string; status?: string; patientId?: string }): Promise<ProcedureOrder[]> {
    return this.db.withTenant(schemaName, async (db) => {
      const conditions = []
      if (filters.date) conditions.push(sql`date(${procedureOrders.createdAt}) = ${filters.date}`)
      if (filters.status) conditions.push(sql`${procedureOrders.status} = ${filters.status}`)
      if (filters.patientId) conditions.push(eq(procedureOrders.patientId, filters.patientId))

      const rows = await db
        .select({
          order: procedureOrders,
          patientFirst: patients.firstName,
          patientLast: patients.lastName,
          doctorName: users.fullName,
        })
        .from(procedureOrders)
        .innerJoin(patients, eq(procedureOrders.patientId, patients.id))
        .innerJoin(users, eq(procedureOrders.doctorId, users.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(asc(procedureOrders.createdAt))

      return rows.map((r) => this.toView(r.order, r.patientFirst, r.patientLast, r.doctorName))
    })
  }

  async create(schemaName: string, input: ProcedureOrderCreate): Promise<ProcedureOrder> {
    return this.db.withTenant(schemaName, async (db) => {
      const [patient] = await db
        .select({ firstName: patients.firstName, lastName: patients.lastName })
        .from(patients)
        .where(eq(patients.id, input.patientId))
        .limit(1)
      if (!patient) throw new NotFoundException('PATIENT_NOT_FOUND')

      const [doctor] = await db
        .select({ fullName: users.fullName })
        .from(users)
        .where(and(eq(users.id, input.doctorId), eq(users.status, 'active')))
        .limit(1)
      if (!doctor) throw new NotFoundException('DOCTOR_NOT_FOUND')

      const [row] = await db
        .insert(procedureOrders)
        .values({
          id: newId(),
          patientId: input.patientId,
          doctorId: input.doctorId,
          name: input.name,
          pricePaise: input.pricePaise,
          room: input.room ?? null,
          notes: input.notes ?? null,
        })
        .returning()

      return this.toView(row, patient.firstName, patient.lastName, doctor.fullName)
    })
  }

  async updateStatus(schemaName: string, orderId: string, next: ProcedureStatus): Promise<ProcedureOrder> {
    return this.db.withTenant(schemaName, async (db) => {
      const [current] = await db
        .select()
        .from(procedureOrders)
        .where(eq(procedureOrders.id, orderId))
        .limit(1)
      if (!current) throw new NotFoundException('PROCEDURE_ORDER_NOT_FOUND')

      const allowed = PROCEDURE_TRANSITIONS[current.status as ProcedureStatus] ?? []
      if (!allowed.includes(next)) throw new ConflictException('INVALID_TRANSITION')

      const [updated] = await db
        .update(procedureOrders)
        .set({ status: next, updatedAt: new Date() })
        .where(eq(procedureOrders.id, orderId))
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

  private toView(r: ProcedureRow, first: string, last: string, doctorName: string): ProcedureOrder {
    return {
      id: r.id,
      patientId: r.patientId,
      patientName: `${first} ${last}`,
      doctorId: r.doctorId,
      doctorName,
      name: r.name,
      pricePaise: Number(r.pricePaise),
      room: r.room,
      status: r.status as ProcedureStatus,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }
  }
}
