import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { and, asc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import type { DispenseQueueItem } from '@jioplix/contracts'
import { newId } from '@jioplix/contracts'
import { DbService, type TenantTx } from '../db/db.service.js'
import { BillingService } from '../billing/billing.service.js'
import {
  inventoryItems,
  patients,
  prescriptionItems,
  prescriptions,
  stockMovements,
  users,
  encounters,
  invoices,
} from '../db/schema/tenant.js'

@Injectable()
export class PharmacyService {
  constructor(private readonly db: DbService, private readonly billing: BillingService) {}

  async dispenseQueue(schemaName: string): Promise<DispenseQueueItem[]> {
    return this.db.withTenant(schemaName, async (db) => {
      const rows = await db
        .select({
          rx: prescriptions,
          patientFirst: patients.firstName,
          patientLast: patients.lastName,
          dateOfBirth: patients.dateOfBirth,
          gender: patients.gender,
          doctorName: users.fullName,
        })
        .from(prescriptions)
        .innerJoin(patients, eq(prescriptions.patientId, patients.id))
        .innerJoin(users, eq(prescriptions.doctorId, users.id))
        .where(
          or(
            eq(prescriptions.status, 'issued'),
            sql`(${prescriptions.status} = 'dispensed' AND date(${prescriptions.updatedAt}) = CURRENT_DATE)`,
          ),
        )
        .orderBy(asc(prescriptions.createdAt))

      if (!rows.length) return []

      const itemRows = await db
        .select()
        .from(prescriptionItems)
        .where(
          inArray(
            prescriptionItems.prescriptionId,
            rows.map((r) => r.rx.id),
          ),
        )
        .orderBy(asc(prescriptionItems.sequence))

      const medicineNames = [
        ...new Set(itemRows.map((it) => it.drugName.toLowerCase())),
      ]
      const stockRows = medicineNames.length
        ? await db.select().from(inventoryItems).where(eq(inventoryItems.category, 'medicines'))
        : []
      const stockByName = new Map<string, number>()
      for (const s of stockRows) {
        const key = s.name.toLowerCase()
        stockByName.set(key, (stockByName.get(key) ?? 0) + s.quantity)
      }

      const ageFor = (dob: string | null): number | null => {
        if (!dob) return null
        const dobDate = new Date(dob)
        return Math.floor((Date.now() - dobDate.getTime()) / (365.25 * 24 * 3600 * 1000))
      }

      return rows.map((r) => ({
        prescriptionId: r.rx.id,
        patientId: r.rx.patientId,
        patientName: `${r.patientFirst} ${r.patientLast}`,
        patientAge: ageFor(r.dateOfBirth),
        patientGender: r.gender,
        doctorName: r.doctorName,
        status: r.rx.status,
        notes: r.rx.notes,
        createdAt: r.rx.createdAt.toISOString(),
        items: itemRows
          .filter((it) => it.prescriptionId === r.rx.id)
          .map((it) => {
            const availableQty = stockByName.get(it.drugName.toLowerCase())
            return {
              drugName: it.drugName,
              strength: it.strength,
              form: it.form,
              dosage: it.dosage,
              frequency: it.frequency,
              quantity: it.quantity,
              stockAvailable:
                availableQty === undefined ? true : availableQty > 0 && (it.quantity === null || availableQty >= it.quantity),
            }
          }),
      }))
    })
  }

  async dispense(schemaName: string, prescriptionId: string, actorUserId: string): Promise<DispenseQueueItem> {
    return this.db.withTenant(schemaName, async (db) =>
      db.transaction(async (tx) => {
        const [rx] = await tx
          .select()
          .from(prescriptions)
          .where(eq(prescriptions.id, prescriptionId))
          .limit(1)
        if (!rx) throw new NotFoundException('PRESCRIPTION_NOT_FOUND')
        if (rx.status !== 'issued') throw new ConflictException('PRESCRIPTION_NOT_ISSUED')

        const items = await tx
          .select()
          .from(prescriptionItems)
          .where(eq(prescriptionItems.prescriptionId, rx.id))
          .orderBy(asc(prescriptionItems.sequence))

        for (const it of items) {
          if (it.quantity == null || it.quantity <= 0) continue

          const matches = await tx
            .select()
            .from(inventoryItems)
            .where(ilike(inventoryItems.name, it.drugName))
            .limit(5)

          let remaining = it.quantity
          for (const inv of matches) {
            if (remaining <= 0) break
            if (inv.category !== 'medicines' || inv.quantity <= 0) continue

            const take = Math.min(inv.quantity, remaining)
            await tx
              .update(inventoryItems)
              .set({ quantity: inv.quantity - take, updatedAt: new Date() })
              .where(eq(inventoryItems.id, inv.id))
            await this.insertDispenseMovement(tx, {
              itemId: inv.id,
              delta: -take,
              createdBy: actorUserId,
              notes: `Rx ${rx.id.slice(0, 8)}`,
            })
            remaining -= take
          }
        }

        await tx
          .update(prescriptions)
          .set({ status: 'dispensed', updatedAt: new Date() })
          .where(eq(prescriptions.id, rx.id))

        const [enc] = await tx
          .select({ appointmentId: encounters.appointmentId })
          .from(encounters)
          .where(eq(encounters.id, rx.encounterId))
          .limit(1)

        const [existingDraft] = await tx
          .select()
          .from(invoices)
          .where(and(eq(invoices.encounterId, rx.encounterId), eq(invoices.status, 'draft')))
          .limit(1)

        if (!existingDraft) {
          await this.billing.createInvoice(
            schemaName,
            {
              encounterId: rx.encounterId,
              appointmentId: enc?.appointmentId ?? undefined,
              patientId: rx.patientId,
              status: 'draft',
              lines: items.map((it) => ({
                itemType: 'pharmacy',
                itemName: it.drugName,
                quantity: it.quantity ?? 1,
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

        const [patient] = await tx
          .select({ firstName: patients.firstName, lastName: patients.lastName, dateOfBirth: patients.dateOfBirth, gender: patients.gender })
          .from(patients)
          .where(eq(patients.id, rx.patientId))
          .limit(1)
        const [doctor] = await tx.select({ fullName: users.fullName }).from(users).where(eq(users.id, rx.doctorId)).limit(1)

        const ageFor = (dob: string | null): number | null => {
          if (!dob) return null
          const dobDate = new Date(dob)
          return Math.floor((Date.now() - dobDate.getTime()) / (365.25 * 24 * 3600 * 1000))
        }

        return {
          prescriptionId: rx.id,
          patientId: rx.patientId,
          patientName: patient ? `${patient.firstName} ${patient.lastName}` : '',
          patientAge: patient ? ageFor(patient.dateOfBirth) : null,
          patientGender: patient?.gender ?? null,
          doctorName: doctor?.fullName ?? '',
          status: 'dispensed',
          notes: rx.notes,
          createdAt: rx.createdAt.toISOString(),
          items: items.map((it) => ({
            drugName: it.drugName,
            strength: it.strength,
            form: it.form,
            dosage: it.dosage,
            frequency: it.frequency,
            quantity: it.quantity,
            stockAvailable: true,
          })),
        }
      }),
    )
  }

  private insertDispenseMovement(
    tx: TenantTx,
    values: { itemId: string; delta: number; createdBy: string; notes: string },
  ) {
    return tx.insert(stockMovements).values({
      id: newId(),
      itemId: values.itemId,
      delta: values.delta,
      reason: 'dispense',
      notes: values.notes,
      createdBy: values.createdBy,
    })
  }
}
