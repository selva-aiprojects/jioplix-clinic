import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { DbService, type TenantTx } from '../db/db.service.js'
import { newId } from '@jioplix/contracts'
import type {
  EncounterCreate,
  EncounterUpdate,
  VitalsCreate,
  DiagnosisCreate,
} from '@jioplix/contracts'
import {
  encounters,
  vitals,
  encounterDiagnoses,
  patients,
  users,
  appointments,
} from '../db/schema/tenant.js'

export interface EncounterView {
  id: string
  patientId: string
  patientName: string
  appointmentId: string | null
  doctorId: string
  doctorName: string
  encounterDate: string
  chiefComplaint: string | null
  historyPresentIllness: string | null
  examinationFindings: string | null
  clinicalNotes: string | null
  followUpDate: string | null
  followUpNotes: string | null
  isLocked: boolean
  lockedAt: string | null
  lockedBy: string | null
  vitals: VitalsView | null
  diagnoses: DiagnosisView[]
  createdAt: string
  updatedAt: string
}

export interface VitalsView {
  id: string
  encounterId: string
  bpSystolic: number | null
  bpDiastolic: number | null
  pulse: number | null
  temperatureC: number | null
  spo2: number | null
  weightKg: number | null
  heightCm: number | null
  bmi: number | null
  recordedAt: string
  recordedBy: string
}

export interface DiagnosisView {
  id: string
  encounterId: string
  icd10Code: string
  icd10Name: string
  type: string
  createdAt: string
}

@Injectable()
export class EncountersService {
  constructor(private readonly db: DbService) {}

  async create(schemaName: string, createdBy: string, input: EncounterCreate) {
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
        .where(eq(users.id, input.doctorId))
        .limit(1)
      if (!doctor) throw new NotFoundException('DOCTOR_NOT_FOUND')

      const id = newId()
      const [row] = await db
        .insert(encounters)
        .values({
          id,
          patientId: input.patientId,
          appointmentId: input.appointmentId ?? null,
          doctorId: input.doctorId,
          branchId: sql`(SELECT id FROM branches ORDER BY created_at ASC LIMIT 1)`,
          chiefComplaint: input.chiefComplaint ?? null,
          historyPresentIllness: input.historyPresentIllness ?? null,
          examinationFindings: input.examinationFindings ?? null,
          clinicalNotes: input.clinicalNotes ?? null,
          followUpDate: input.followUpDate ?? null,
          followUpNotes: input.followUpNotes ?? null,
          createdBy,
          updatedBy: createdBy,
        })
        .returning()

      return {
        id: row.id,
        patientId: row.patientId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        appointmentId: row.appointmentId,
        doctorId: row.doctorId,
        doctorName: doctor.fullName,
        encounterDate: row.encounterDate,
        chiefComplaint: row.chiefComplaint,
        historyPresentIllness: row.historyPresentIllness,
        examinationFindings: row.examinationFindings,
        clinicalNotes: row.clinicalNotes,
        followUpDate: row.followUpDate ?? null,
        followUpNotes: row.followUpNotes,
        isLocked: row.isLocked,
        lockedAt: row.lockedAt?.toISOString() ?? null,
        lockedBy: row.lockedBy ?? null,
        vitals: null,
        diagnoses: [],
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }
    })
  }

  async findById(schemaName: string, id: string) {
    return this.db.withTenant(schemaName, async (db) => {
      const [enc] = await db
        .select()
        .from(encounters)
        .where(eq(encounters.id, id))
        .limit(1)
      if (!enc) return null

      const [patient] = await db
        .select({ firstName: patients.firstName, lastName: patients.lastName })
        .from(patients)
        .where(eq(patients.id, enc.patientId))
        .limit(1)
      const [doctor] = await db
        .select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, enc.doctorId))
        .limit(1)

      const vitalsRows = await db
        .select()
        .from(vitals)
        .where(eq(vitals.encounterId, id))
        .orderBy(desc(vitals.recordedAt))
      const vitalsView: VitalsView | null = vitalsRows[0]
        ? {
            id: vitalsRows[0].id,
            encounterId: vitalsRows[0].encounterId,
            bpSystolic: vitalsRows[0].bpSystolic ?? null,
            bpDiastolic: vitalsRows[0].bpDiastolic ?? null,
            pulse: vitalsRows[0].pulse ?? null,
            temperatureC: vitalsRows[0].temperatureC ?? null,
            spo2: vitalsRows[0].spo2 ?? null,
            weightKg: vitalsRows[0].weightKg ?? null,
            heightCm: vitalsRows[0].heightCm ?? null,
            bmi: vitalsRows[0].bmi ?? null,
            recordedAt: vitalsRows[0].recordedAt.toISOString(),
            recordedBy: vitalsRows[0].recordedBy,
          }
        : null

      const diagRows = await db
        .select()
        .from(encounterDiagnoses)
        .where(eq(encounterDiagnoses.encounterId, id))
        .orderBy(encounterDiagnoses.createdAt)
      const diagnosesView: DiagnosisView[] = diagRows.map((d) => ({
        id: d.id,
        encounterId: d.encounterId,
        icd10Code: d.icd10Code,
        icd10Name: d.icd10Name,
        type: d.type,
        createdAt: d.createdAt.toISOString(),
      }))

      return {
        id: enc.id,
        patientId: enc.patientId,
        patientName: `${patient?.firstName ?? ''} ${patient?.lastName ?? ''}`.trim(),
        appointmentId: enc.appointmentId,
        doctorId: enc.doctorId,
        doctorName: doctor?.fullName ?? '',
        encounterDate: enc.encounterDate,
        chiefComplaint: enc.chiefComplaint,
        historyPresentIllness: enc.historyPresentIllness,
        examinationFindings: enc.examinationFindings,
        clinicalNotes: enc.clinicalNotes,
        followUpDate: enc.followUpDate ?? null,
        followUpNotes: enc.followUpNotes,
        isLocked: enc.isLocked,
        lockedAt: enc.lockedAt?.toISOString() ?? null,
        lockedBy: enc.lockedBy ?? null,
        vitals: vitalsView,
        diagnoses: diagnosesView,
        createdAt: enc.createdAt.toISOString(),
        updatedAt: enc.updatedAt.toISOString(),
      }
    })
  }

  async update(schemaName: string, id: string, updatedBy: string, input: EncounterUpdate) {
    return this.db.withTenant(schemaName, async (db) => {
      const [current] = await db.select().from(encounters).where(eq(encounters.id, id)).limit(1)
      if (!current) throw new NotFoundException('ENCOUNTER_NOT_FOUND')
      if (current.isLocked) throw new ConflictException('ENCOUNTER_SIGNED')

      const [row] = await db
        .update(encounters)
        .set({
          ...(input.chiefComplaint !== undefined && { chiefComplaint: input.chiefComplaint }),
          ...(input.historyPresentIllness !== undefined && { historyPresentIllness: input.historyPresentIllness }),
          ...(input.examinationFindings !== undefined && { examinationFindings: input.examinationFindings }),
          ...(input.clinicalNotes !== undefined && { clinicalNotes: input.clinicalNotes }),
          ...(input.followUpDate !== undefined && { followUpDate: input.followUpDate ?? null }),
          ...(input.followUpNotes !== undefined && { followUpNotes: input.followUpNotes }),
          updatedBy,
          updatedAt: new Date(),
        })
        .where(eq(encounters.id, id))
        .returning()

      return { id: row.id, updatedAt: row.updatedAt.toISOString() }
    })
  }

  async addVitals(schemaName: string, encounterId: string, recordedBy: string, input: VitalsCreate) {
    return this.db.withTenant(schemaName, async (db) => {
      const [enc] = await db.select().from(encounters).where(eq(encounters.id, encounterId)).limit(1)
      if (!enc) throw new NotFoundException('ENCOUNTER_NOT_FOUND')
      if (enc.isLocked) throw new ConflictException('ENCOUNTER_SIGNED')

      const bmi =
        input.weightKg && input.heightCm
          ? Number((input.weightKg / ((input.heightCm / 100) ** 2)).toFixed(1))
          : null

      const [row] = await db
        .insert(vitals)
        .values({
          id: newId(),
          encounterId,
          bpSystolic: input.bpSystolic ?? null,
          bpDiastolic: input.bpDiastolic ?? null,
          pulse: input.pulse ?? null,
          temperatureC: input.temperatureC ? Number(input.temperatureC.toFixed(1)) : null,
          spo2: input.spo2 ?? null,
          weightKg: input.weightKg ? Number(input.weightKg.toFixed(1)) : null,
          heightCm: input.heightCm ? Number(input.heightCm.toFixed(1)) : null,
          bmi: bmi ? Number(bmi.toFixed(1)) : null,
          recordedBy,
        })
        .returning()

      return {
        id: row.id,
        encounterId: row.encounterId,
        bpSystolic: row.bpSystolic,
        bpDiastolic: row.bpDiastolic,
        pulse: row.pulse,
        temperatureC: row.temperatureC,
        spo2: row.spo2,
        weightKg: row.weightKg,
        heightCm: row.heightCm,
        bmi: row.bmi,
        recordedAt: row.recordedAt.toISOString(),
        recordedBy: row.recordedBy,
      }
    })
  }

  async addDiagnosis(schemaName: string, encounterId: string, input: DiagnosisCreate) {
    return this.db.withTenant(schemaName, async (db) => {
      const [enc] = await db.select().from(encounters).where(eq(encounters.id, encounterId)).limit(1)
      if (!enc) throw new NotFoundException('ENCOUNTER_NOT_FOUND')
      if (enc.isLocked) throw new ConflictException('ENCOUNTER_SIGNED')

      const [row] = await db
        .insert(encounterDiagnoses)
        .values({
          id: newId(),
          encounterId,
          icd10Code: input.icd10Code,
          icd10Name: input.icd10Name,
          type: input.type ?? 'primary',
        })
        .returning()

      return {
        id: row.id,
        encounterId: row.encounterId,
        icd10Code: row.icd10Code,
        icd10Name: row.icd10Name,
        type: row.type,
        createdAt: row.createdAt.toISOString(),
      }
    })
  }

  async lock(schemaName: string, id: string, lockedBy: string) {
    return this.db.withTenant(schemaName, async (db) => {
      const [current] = await db.select().from(encounters).where(eq(encounters.id, id)).limit(1)
      if (!current) throw new NotFoundException('ENCOUNTER_NOT_FOUND')
      if (current.isLocked) throw new ConflictException('ENCOUNTER_SIGNED')

      const [row] = await db
        .update(encounters)
        .set({ isLocked: true, lockedAt: new Date(), lockedBy, updatedAt: new Date() })
        .where(eq(encounters.id, id))
        .returning()

      return { id: row.id, isLocked: row.isLocked, lockedAt: row.lockedAt?.toISOString() ?? null }
    })
  }

  async listByPatient(schemaName: string, patientId: string) {
    return this.db.withTenant(schemaName, async (db) => {
      const rows = await db
        .select({
          id: encounters.id,
          doctorName: users.fullName,
          encounterDate: encounters.encounterDate,
          chiefComplaint: encounters.chiefComplaint,
          examinationFindings: encounters.examinationFindings,
          isLocked: encounters.isLocked,
          createdAt: encounters.createdAt,
        })
        .from(encounters)
        .leftJoin(users, eq(users.id, encounters.doctorId))
        .where(eq(encounters.patientId, patientId))
        .orderBy(desc(encounters.createdAt))
        .limit(50)

      if (rows.length === 0) return []

      const ids = rows.map((r) => r.id)
      const diagRows = await db
        .select()
        .from(encounterDiagnoses)
        .where(inArray(encounterDiagnoses.encounterId, ids))

      const diagByEncounter = new Map<string, { icd10Code: string; icd10Name: string; type: string }[]>()
      for (const d of diagRows) {
        const list = diagByEncounter.get(d.encounterId) ?? []
        list.push({ icd10Code: d.icd10Code, icd10Name: d.icd10Name, type: d.type })
        diagByEncounter.set(d.encounterId, list)
      }

      return rows.map((r) => ({
        id: r.id,
        doctorName: r.doctorName ?? '',
        encounterDate: r.encounterDate,
        chiefComplaint: r.chiefComplaint,
        examinationFindings: r.examinationFindings,
        isLocked: r.isLocked,
        diagnoses: diagByEncounter.get(r.id) ?? [],
        createdAt: r.createdAt.toISOString(),
      }))
    })
  }

  async listByDate(schemaName: string, date: string) {
    return this.db.withTenant(schemaName, async (db) => {
      const rows = await db
        .select({
          id: encounters.id,
          patientId: encounters.patientId,
          patientName: sql`${patients.firstName} || ' ' || ${patients.lastName}`.as<string>('patient_name'),
          doctorId: encounters.doctorId,
          doctorName: users.fullName,
          encounterDate: encounters.encounterDate,
          chiefComplaint: encounters.chiefComplaint,
          isLocked: encounters.isLocked,
          createdAt: encounters.createdAt,
        })
        .from(encounters)
        .innerJoin(patients, eq(encounters.patientId, patients.id))
        .innerJoin(users, eq(encounters.doctorId, users.id))
        .where(eq(encounters.encounterDate, date))
        .orderBy(desc(encounters.createdAt))
        .limit(100)

      if (rows.length === 0) return []

      const ids = rows.map((r) => r.id)
      const vitalsRows = await db
        .select({ id: vitals.encounterId })
        .from(vitals)
        .where(inArray(vitals.encounterId, ids))
      const hasVitals = new Set(vitalsRows.map((v) => v.id))
      const diagRows = await db
        .select({ encounterId: encounterDiagnoses.encounterId, type: encounterDiagnoses.type })
        .from(encounterDiagnoses)
        .where(inArray(encounterDiagnoses.encounterId, ids))
      const primaryCount = new Map<string, number>()
      for (const d of diagRows) {
        if (d.type !== 'primary') continue
        primaryCount.set(d.encounterId, (primaryCount.get(d.encounterId) ?? 0) + 1)
      }

      return rows.map((r) => ({
        id: r.id,
        patientId: r.patientId,
        patientName: r.patientName,
        doctorId: r.doctorId,
        doctorName: r.doctorName ?? '',
        encounterDate: r.encounterDate,
        chiefComplaint: r.chiefComplaint,
        isLocked: r.isLocked,
        hasVitals: hasVitals.has(r.id),
        primaryDiagnoses: primaryCount.get(r.id) ?? 0,
        createdAt: r.createdAt.toISOString(),
      }))
    })
  }
}
