import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { desc, eq } from 'drizzle-orm'
import { DbService, type TenantDb } from '../db/db.service.js'
import { newId } from '@jioplix/contracts'
import type { PrescriptionCreate, PrescriptionItemCreate } from '@jioplix/contracts'
import {
  prescriptions,
  prescriptionItems,
  encounters,
  patients,
  users,
} from '../db/schema/tenant.js'

export interface PrescriptionItemView {
  id: string
  prescriptionId: string
  drugName: string
  genericName: string | null
  strength: string | null
  form: string | null
  dosage: string
  frequency: string
  route: string | null
  durationDays: number | null
  quantity: number | null
  instructions: string | null
  sequence: number
}

export interface PrescriptionView {
  id: string
  encounterId: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  status: string
  notes: string | null
  items: PrescriptionItemView[]
  createdAt: string
  updatedAt: string
}

@Injectable()
export class PrescriptionsService {
  constructor(private readonly db: DbService) {}

  async create(schemaName: string, input: PrescriptionCreate) {
    return this.db.withTenant(schemaName, async (db) => {
      const [enc] = await db.select().from(encounters).where(eq(encounters.id, input.encounterId)).limit(1)
      if (!enc) throw new NotFoundException('ENCOUNTER_NOT_FOUND')
      if (enc.isLocked) throw new ConflictException('ENCOUNTER_SIGNED')

      const [patient] = await db
        .select({ firstName: patients.firstName, lastName: patients.lastName })
        .from(patients)
        .where(eq(patients.id, input.patientId))
        .limit(1)
      if (!patient) throw new NotFoundException('PATIENT_NOT_FOUND')

      const [doctor] = await db.select().from(users).where(eq(users.id, enc.doctorId)).limit(1)
      if (!doctor) throw new NotFoundException('DOCTOR_NOT_FOUND')

      const id = newId()
      const [row] = await db
        .insert(prescriptions)
        .values({
          id,
          encounterId: input.encounterId,
          patientId: input.patientId,
          doctorId: enc.doctorId,
          notes: input.notes ?? null,
        })
        .returning()

      return {
        id: row.id,
        encounterId: row.encounterId,
        patientId: row.patientId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        doctorId: row.doctorId,
        doctorName: doctor.fullName,
        status: row.status,
        notes: row.notes,
        items: [],
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }
    })
  }

  async findById(schemaName: string, id: string) {
    return this.db.withTenant(schemaName, async (db) => {
      const [rx] = await db.select().from(prescriptions).where(eq(prescriptions.id, id)).limit(1)
      if (!rx) return null
      return this.buildView(db, rx)
    })
  }

  async listByEncounter(schemaName: string, encounterId: string) {
    return this.db.withTenant(schemaName, async (db) => {
      const rows = await db
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.encounterId, encounterId))
        .orderBy(desc(prescriptions.createdAt))

      const views = []
      for (const rx of rows) {
        views.push(await this.buildView(db, rx))
      }
      return views
    })
  }

  private async buildView(
    db: TenantDb,
    rx: typeof prescriptions.$inferSelect,
  ) {
    const [patient] = await db
      .select({ firstName: patients.firstName, lastName: patients.lastName })
      .from(patients)
      .where(eq(patients.id, rx.patientId))
      .limit(1)
    const [doctor] = await db.select().from(users).where(eq(users.id, rx.doctorId)).limit(1)

    const items = await db
      .select()
      .from(prescriptionItems)
      .where(eq(prescriptionItems.prescriptionId, rx.id))
      .orderBy(prescriptionItems.sequence)

    const itemViews: PrescriptionItemView[] = items.map((it) => ({
      id: it.id,
      prescriptionId: it.prescriptionId,
      drugName: it.drugName,
      genericName: it.genericName,
      strength: it.strength,
      form: it.form,
      dosage: it.dosage,
      frequency: it.frequency,
      route: it.route,
      durationDays: it.durationDays,
      quantity: it.quantity,
      instructions: it.instructions,
      sequence: it.sequence,
    }))

    return {
      id: rx.id,
      encounterId: rx.encounterId,
      patientId: rx.patientId,
      patientName: `${patient?.firstName ?? ''} ${patient?.lastName ?? ''}`.trim(),
      doctorId: rx.doctorId,
      doctorName: doctor?.fullName ?? '',
      status: rx.status,
      notes: rx.notes,
      items: itemViews,
      createdAt: rx.createdAt.toISOString(),
      updatedAt: rx.updatedAt.toISOString(),
    }
  }

  async updateStatus(schemaName: string, id: string, next: string) {
    return this.db.withTenant(schemaName, async (db) => {
      const [current] = await db.select().from(prescriptions).where(eq(prescriptions.id, id)).limit(1)
      if (!current) throw new NotFoundException('PRESCRIPTION_NOT_FOUND')

      const allowed: Record<string, string[]> = {
        draft: ['issued', 'cancelled'],
        issued: ['dispensed', 'cancelled'],
        dispensed: [],
        cancelled: [],
      }
      if (!allowed[current.status]?.includes(next)) {
        throw new ConflictException('INVALID_TRANSITION')
      }

      const [row] = await db
        .update(prescriptions)
        .set({ status: next as any, updatedAt: new Date() })
        .where(eq(prescriptions.id, id))
        .returning()

      return { id: row.id, status: row.status, updatedAt: row.updatedAt.toISOString() }
    })
  }

  async addItem(schemaName: string, prescriptionId: string, input: PrescriptionItemCreate) {
    return this.db.withTenant(schemaName, async (db) => {
      const [rx] = await db.select().from(prescriptions).where(eq(prescriptions.id, prescriptionId)).limit(1)
      if (!rx) throw new NotFoundException('PRESCRIPTION_NOT_FOUND')
      if (rx.status !== 'draft') throw new BadRequestException('PRESCRIPTION_NOT_DRAFT')

      const [enc] = await db.select().from(encounters).where(eq(encounters.id, rx.encounterId)).limit(1)
      if (enc?.isLocked) throw new ConflictException('ENCOUNTER_SIGNED')

      const items = await db
        .select()
        .from(prescriptionItems)
        .where(eq(prescriptionItems.prescriptionId, prescriptionId))

      const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()
      const duplicate = items.find(
        (it) =>
          norm(it.drugName) === norm(input.drugName) &&
          norm(it.strength) === norm(input.strength) &&
          norm(it.form) === norm(input.form) &&
          norm(it.dosage) === norm(input.dosage) &&
          norm(it.frequency) === norm(input.frequency),
      )
      if (duplicate) throw new ConflictException('DUPLICATE_MEDICINE')

      const [row] = await db
        .insert(prescriptionItems)
        .values({
          id: newId(),
          prescriptionId,
          drugName: input.drugName,
          genericName: input.genericName ?? null,
          strength: input.strength ?? null,
          form: input.form ? input.form.trim().toLowerCase() : null,
          dosage: input.dosage,
          frequency: input.frequency,
          route: input.route ? input.route.trim().toLowerCase() : null,
          durationDays: input.durationDays ?? null,
          quantity: input.quantity ?? null,
          instructions: input.instructions ?? null,
          sequence: items.length,
        })
        .returning()

      return {
        id: row.id,
        prescriptionId: row.prescriptionId,
        drugName: row.drugName,
        genericName: row.genericName,
        strength: row.strength,
        form: row.form,
        dosage: row.dosage,
        frequency: row.frequency,
        route: row.route,
        durationDays: row.durationDays,
        quantity: row.quantity,
        instructions: row.instructions,
        sequence: row.sequence,
      }
    })
  }
}
