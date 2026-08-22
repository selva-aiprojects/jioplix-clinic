import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { and, asc, eq, max, sql } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import {
  APPOINTMENT_TRANSITIONS,
  QUEUE_TRANSITIONS,
} from '@jioplix/contracts'
import type { AppointmentCreate, AppointmentStatus, QueueStatus } from '@jioplix/contracts'
import { newId } from '@jioplix/contracts'
import { DbService, type TenantTx } from '../db/db.service.js'
import { appointments, branches, patients, queueTokens, roles, userBranchRoles, users } from '../db/schema/tenant.js'

export interface DoctorView {
  id: string
  fullName: string
  specialty: string | null
}

export interface AppointmentView {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  scheduledAt: Date
  durationMin: number
  source: string
  status: AppointmentStatus
  notes: string | null
}

export interface QueueTokenView {
  id: string
  tokenNo: number
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  appointmentId: string | null
  status: QueueStatus
  issuedAt: Date
}

@Injectable()
export class AppointmentsService {
  constructor(private readonly db: DbService) {}

  async list(
    schemaName: string,
    filters: { date?: string; doctorId?: string; status?: string },
  ): Promise<AppointmentView[]> {
    return this.db.withTenant(schemaName, async (db) => {
      const conditions = [sql`date(${appointments.scheduledAt}) = ${filters.date}`]
      if (filters.doctorId) conditions.push(eq(appointments.doctorId, filters.doctorId))
      if (filters.status) {
        conditions.push(sql`${appointments.status} = ${filters.status}`)
      }

      const rows = await db
        .select({
          id: appointments.id,
          patientId: appointments.patientId,
          patientFirst: patients.firstName,
          patientLast: patients.lastName,
          doctorId: appointments.doctorId,
          doctorName: users.fullName,
          scheduledAt: appointments.scheduledAt,
          durationMin: appointments.durationMin,
          source: appointments.source,
          status: appointments.status,
          notes: appointments.notes,
        })
        .from(appointments)
        .innerJoin(patients, eq(appointments.patientId, patients.id))
        .innerJoin(users, eq(appointments.doctorId, users.id))
        .where(and(...conditions))
        .orderBy(asc(appointments.scheduledAt))

      return rows.map((r) => ({
        id: r.id,
        patientId: r.patientId,
        patientName: `${r.patientFirst} ${r.patientLast}`,
        doctorId: r.doctorId,
        doctorName: r.doctorName,
        scheduledAt: r.scheduledAt,
        durationMin: r.durationMin,
        source: r.source,
        status: r.status as AppointmentStatus,
        notes: r.notes,
      }))
    })
  }

  async listDoctors(schemaName: string): Promise<DoctorView[]> {
    return this.db.withTenant(schemaName, (db) =>
      db
        .selectDistinct({
          id: users.id,
          fullName: users.fullName,
          specialty: users.specialty,
        })
        .from(users)
        .innerJoin(userBranchRoles, eq(userBranchRoles.userId, users.id))
        .innerJoin(roles, eq(roles.id, userBranchRoles.roleId))
        .where(and(eq(users.status, 'active'), eq(roles.key, 'doctor')))
        .orderBy(asc(users.fullName)),
    )
  }

  async create(schemaName: string, input: AppointmentCreate): Promise<AppointmentView> {
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

      const [branch] = await db
        .select({ id: branches.id })
        .from(branches)
        .orderBy(asc(branches.createdAt))
        .limit(1)

      const id = newId()
      const [row] = await db
        .insert(appointments)
        .values({
          id,
          patientId: input.patientId,
          branchId: branch.id,
          doctorId: input.doctorId,
          scheduledAt: new Date(input.scheduledAt),
          durationMin: input.durationMin ?? 15,
          source: input.source ?? 'walk_in',
          notes: input.notes ?? null,
        })
        .returning()

      return {
        id: row.id,
        patientId: row.patientId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        doctorId: row.doctorId,
        doctorName: doctor.fullName,
        scheduledAt: row.scheduledAt,
        durationMin: row.durationMin,
        source: row.source,
        status: row.status as AppointmentStatus,
        notes: row.notes,
      }
    })
  }

  async updateStatus(schemaName: string, appointmentId: string, next: AppointmentStatus): Promise<AppointmentView> {
    return this.db.withTenant(schemaName, async (db) =>
      db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(appointments)
          .where(eq(appointments.id, appointmentId))
          .limit(1)
        if (!current) throw new NotFoundException('APPOINTMENT_NOT_FOUND')

        const allowed = APPOINTMENT_TRANSITIONS[current.status as AppointmentStatus] ?? []
        if (!allowed.includes(next)) {
          throw new ConflictException('INVALID_TRANSITION')
        }

        await tx
          .update(appointments)
          .set({ status: next, updatedAt: new Date() })
          .where(eq(appointments.id, appointmentId))

        let tokenNo: number | null = null
        if (next === 'checked_in') {
          tokenNo = await this.ensureQueueToken(tx, current)
        }

        const [doctor] = await tx
          .select({ fullName: users.fullName })
          .from(users)
          .where(eq(users.id, current.doctorId))
          .limit(1)
        const [patient] = await tx
          .select({ firstName: patients.firstName, lastName: patients.lastName })
          .from(patients)
          .where(eq(patients.id, current.patientId))
          .limit(1)

        return {
          id: current.id,
          patientId: current.patientId,
          patientName: `${patient?.firstName ?? ''} ${patient?.lastName ?? ''}`.trim(),
          doctorId: current.doctorId,
          doctorName: doctor?.fullName ?? '',
          scheduledAt: current.scheduledAt,
          durationMin: current.durationMin,
          source: current.source,
          status: next,
          notes: current.notes,
          ...(tokenNo !== null ? { tokenNo } : {}),
        }
      }),
    )
  }

  private async ensureQueueToken(
    tx: TenantTx,
    appt: { id: string; branchId: string; doctorId: string; patientId: string },
  ): Promise<number> {
    const existing = await tx
      .select({ id: queueTokens.id })
      .from(queueTokens)
      .where(eq(queueTokens.appointmentId, appt.id))
      .limit(1)
    if (existing[0]) throw new ConflictException('TOKEN_EXISTS')

    const [{ value }] = await tx
      .select({ value: max(queueTokens.tokenNo) })
      .from(queueTokens)
      .where(
        and(
          eq(queueTokens.branchId, appt.branchId),
          eq(queueTokens.doctorId, appt.doctorId),
          sql`${queueTokens.queueDate} = CURRENT_DATE`,
        ),
      )

    const tokenNo = (value ?? 0) + 1
    await tx.insert(queueTokens).values({
      id: randomUUID(),
      appointmentId: appt.id,
      branchId: appt.branchId,
      doctorId: appt.doctorId,
      patientId: appt.patientId,
      queueDate: new Date().toISOString().slice(0, 10),
      tokenNo,
      status: 'waiting',
    })
    return tokenNo
  }

  async listQueue(schemaName: string, date: string): Promise<{ tokens: QueueTokenView[]; waiting: number }> {
    return this.db.withTenant(schemaName, async (db) => {
      const rows = await db
        .select({
          id: queueTokens.id,
          tokenNo: queueTokens.tokenNo,
          patientId: queueTokens.patientId,
          patientFirst: patients.firstName,
          patientLast: patients.lastName,
          doctorId: queueTokens.doctorId,
          doctorName: users.fullName,
          appointmentId: queueTokens.appointmentId,
          status: queueTokens.status,
          issuedAt: queueTokens.issuedAt,
        })
        .from(queueTokens)
        .innerJoin(patients, eq(queueTokens.patientId, patients.id))
        .innerJoin(users, eq(queueTokens.doctorId, users.id))
        .where(sql`${queueTokens.queueDate} = ${date}`)
        .orderBy(asc(queueTokens.tokenNo))

      const tokens: QueueTokenView[] = rows.map((r) => ({
        id: r.id,
        tokenNo: r.tokenNo,
        patientId: r.patientId,
        patientName: `${r.patientFirst} ${r.patientLast}`,
        doctorId: r.doctorId,
        doctorName: r.doctorName,
        appointmentId: r.appointmentId,
        status: r.status as QueueStatus,
        issuedAt: r.issuedAt,
      }))

      return { tokens, waiting: tokens.filter((t) => t.status === 'waiting').length }
    })
  }

  async updateQueueStatus(schemaName: string, tokenId: string, next: QueueStatus): Promise<QueueTokenView> {
    return this.db.withTenant(schemaName, async (db) => {
      const [current] = await db
        .select()
        .from(queueTokens)
        .where(eq(queueTokens.id, tokenId))
        .limit(1)
      if (!current) throw new NotFoundException('TOKEN_NOT_FOUND')

      const allowed = QUEUE_TRANSITIONS[current.status as QueueStatus] ?? []
      if (!allowed.includes(next)) {
        throw new ConflictException('INVALID_TRANSITION')
      }

      await db.update(queueTokens).set({ status: next }).where(eq(queueTokens.id, tokenId))

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

      return {
        id: current.id,
        tokenNo: current.tokenNo,
        patientId: current.patientId,
        patientName: `${patient?.firstName ?? ''} ${patient?.lastName ?? ''}`.trim(),
        doctorId: current.doctorId,
        doctorName: doctor?.fullName ?? '',
        appointmentId: current.appointmentId,
        status: next,
        issuedAt: current.issuedAt,
      }
    })
  }
}
