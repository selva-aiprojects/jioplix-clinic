import { Injectable } from '@nestjs/common'
import { asc, desc, eq } from 'drizzle-orm'
import { DbService } from '../db/db.service.js'
import { patients, encounters, vitals } from '../db/schema/tenant.js'
import { newId } from '@jioplix/contracts'
import type { PatientCreate } from '@jioplix/contracts'

export interface VitalsSnapshot {
  date: string
  bpSystolic: number | null
  bpDiastolic: number | null
  pulse: number | null
  weightKg: number | null
}

@Injectable()
export class PatientsService {
  constructor(private readonly db: DbService) {}

  async list(schemaName: string, limit = 50) {
    return this.db.withTenant(schemaName, (db) =>
      db.select().from(patients).orderBy(desc(patients.createdAt)).limit(limit),
    )
  }

  async create(schemaName: string, data: PatientCreate) {
    return this.db.withTenant(schemaName, async (db) => {
      for (let attempt = 0; ; attempt++) {
        const id = newId()
        const mrn = `JXP-${id.replace(/-/g, '').slice(-12).toUpperCase()}`
        try {
          const [row] = await db
            .insert(patients)
            .values({
              id,
              mrn,
              firstName: data.firstName,
              lastName: data.lastName,
              dateOfBirth: data.dateOfBirth ?? null,
              gender: data.gender ?? null,
              phone: data.phone,
              email: data.email ?? null,
              bloodGroup: data.bloodGroup ?? null,
              abhaNumber: data.abhaNumber ?? null,
            })
            .returning()
          return row
        } catch (err) {
          if ((err as { code?: string }).code === '23505' && attempt < 2) continue
          throw err
        }
      }
    })
  }

  async findById(schemaName: string, id: string) {
    return this.db.withTenant(schemaName, (db) =>
      db.select().from(patients).where(eq(patients.id, id)).limit(1),
    )
  }

  async vitalsHistory(schemaName: string, patientId: string): Promise<VitalsSnapshot[]> {
    return this.db.withTenant(schemaName, (db) =>
      db
        .select({
          date: encounters.encounterDate,
          bpSystolic: vitals.bpSystolic,
          bpDiastolic: vitals.bpDiastolic,
          pulse: vitals.pulse,
          weightKg: vitals.weightKg,
        })
        .from(vitals)
        .innerJoin(encounters, eq(vitals.encounterId, encounters.id))
        .where(eq(encounters.patientId, patientId))
        .orderBy(asc(encounters.encounterDate)),
    )
  }
}
