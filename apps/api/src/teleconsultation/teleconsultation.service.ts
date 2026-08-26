import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { and, asc, eq, sql } from 'drizzle-orm'
import { newId } from '@jioplix/contracts'
import { DbService } from '../db/db.service.js'
import {
  teleconsultationSessions,
  patients,
  users,
} from '../db/schema/tenant.js'

export type TeleconsultationStatus = 'scheduled' | 'waiting' | 'in_progress' | 'completed' | 'cancelled'

const VALID_TRANSITIONS: Record<TeleconsultationStatus, TeleconsultationStatus[]> = {
  scheduled: ['waiting', 'cancelled'],
  waiting: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

export interface CreateSessionInput {
  patientId: string
  doctorId: string
  encounterId?: string
  scheduledAt: string
  notes?: string
  recordingConsent?: boolean
}

export interface TeleconsultationSessionView {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  encounterId: string | null
  status: TeleconsultationStatus
  roomUrl: string | null
  scheduledAt: Date
  startedAt: Date | null
  endedAt: Date | null
  durationMinutes: number | null
  recordingConsent: boolean
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface SessionStats {
  totalToday: number
  inProgress: number
  completed: number
  averageDuration: number | null
}

const VIDEO_PROVIDER = process.env.TELECONSULTATION_PROVIDER ?? 'mock'
const ROOM_BASE_URL: Record<string, string> = {
  mock: 'https://video.jioplix.local/room',
  twilio: 'https://twilio.com/video/rooms',
  daily: 'https://daily.co/room',
}

function generateRoomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

@Injectable()
export class TeleconsultationService {
  constructor(private readonly db: DbService) {}

  async createSession(
    schemaName: string,
    input: CreateSessionInput,
  ): Promise<TeleconsultationSessionView> {
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

      const roomId = generateRoomId()
      const baseUrl = ROOM_BASE_URL[VIDEO_PROVIDER] ?? ROOM_BASE_URL.mock
      const roomUrl = `${baseUrl}/${roomId}`

      const id = newId()
      const [row] = await db
        .insert(teleconsultationSessions)
        .values({
          id,
          patientId: input.patientId,
          doctorId: input.doctorId,
          encounterId: input.encounterId ?? null,
          status: 'scheduled',
          roomUrl,
          scheduledAt: new Date(input.scheduledAt),
          recordingConsent: input.recordingConsent ?? false,
          notes: input.notes ?? null,
        })
        .returning()

      return this.toView(row, patient.firstName, patient.lastName, doctor.fullName)
    })
  }

  async getSession(
    schemaName: string,
    sessionId: string,
  ): Promise<TeleconsultationSessionView> {
    return this.db.withTenant(schemaName, async (db) => {
      const [row] = await db
        .select()
        .from(teleconsultationSessions)
        .where(eq(teleconsultationSessions.id, sessionId))
        .limit(1)
      if (!row) throw new NotFoundException('SESSION_NOT_FOUND')

      const [patient] = await db
        .select({ firstName: patients.firstName, lastName: patients.lastName })
        .from(patients)
        .where(eq(patients.id, row.patientId))
        .limit(1)

      const [doctor] = await db
        .select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, row.doctorId))
        .limit(1)

      return this.toView(
        row,
        patient?.firstName ?? '',
        patient?.lastName ?? '',
        doctor?.fullName ?? '',
      )
    })
  }

  async updateStatus(
    schemaName: string,
    sessionId: string,
    next: TeleconsultationStatus,
  ): Promise<TeleconsultationSessionView> {
    return this.db.withTenant(schemaName, async (db) => {
      const [current] = await db
        .select()
        .from(teleconsultationSessions)
        .where(eq(teleconsultationSessions.id, sessionId))
        .limit(1)
      if (!current) throw new NotFoundException('SESSION_NOT_FOUND')

      const allowed = VALID_TRANSITIONS[current.status as TeleconsultationStatus] ?? []
      if (!allowed.includes(next)) {
        throw new ConflictException('INVALID_TRANSITION')
      }

      const updates: Record<string, unknown> = {
        status: next,
        updatedAt: new Date(),
      }

      if (next === 'in_progress') {
        updates.startedAt = new Date()
      } else if (next === 'completed' || next === 'cancelled') {
        updates.endedAt = new Date()
        if (current.startedAt) {
          const elapsed = Math.round(
            (Date.now() - new Date(current.startedAt).getTime()) / 60_000,
          )
          updates.durationMinutes = elapsed
        }
      }

      await db
        .update(teleconsultationSessions)
        .set(updates)
        .where(eq(teleconsultationSessions.id, sessionId))

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
        { ...current, ...updates } as typeof current,
        patient?.firstName ?? '',
        patient?.lastName ?? '',
        doctor?.fullName ?? '',
      )
    })
  }

  async listTodaySessions(
    schemaName: string,
  ): Promise<TeleconsultationSessionView[]> {
    return this.db.withTenant(schemaName, async (db) => {
      const rows = await db
        .select({
          id: teleconsultationSessions.id,
          encounterId: teleconsultationSessions.encounterId,
          patientId: teleconsultationSessions.patientId,
          patientFirst: patients.firstName,
          patientLast: patients.lastName,
          doctorId: teleconsultationSessions.doctorId,
          doctorName: users.fullName,
          status: teleconsultationSessions.status,
          roomUrl: teleconsultationSessions.roomUrl,
          scheduledAt: teleconsultationSessions.scheduledAt,
          startedAt: teleconsultationSessions.startedAt,
          endedAt: teleconsultationSessions.endedAt,
          durationMinutes: teleconsultationSessions.durationMinutes,
          recordingConsent: teleconsultationSessions.recordingConsent,
          notes: teleconsultationSessions.notes,
          createdAt: teleconsultationSessions.createdAt,
          updatedAt: teleconsultationSessions.updatedAt,
        })
        .from(teleconsultationSessions)
        .innerJoin(patients, eq(teleconsultationSessions.patientId, patients.id))
        .innerJoin(users, eq(teleconsultationSessions.doctorId, users.id))
        .where(sql`date(${teleconsultationSessions.scheduledAt}) = CURRENT_DATE`)
        .orderBy(asc(teleconsultationSessions.scheduledAt))

      return rows.map((r) => ({
        id: r.id,
        encounterId: r.encounterId,
        patientId: r.patientId,
        patientName: `${r.patientFirst} ${r.patientLast}`,
        doctorId: r.doctorId,
        doctorName: r.doctorName,
        status: r.status as TeleconsultationStatus,
        roomUrl: r.roomUrl,
        scheduledAt: r.scheduledAt,
        startedAt: r.startedAt,
        endedAt: r.endedAt,
        durationMinutes: r.durationMinutes,
        recordingConsent: r.recordingConsent,
        notes: r.notes,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }))
    })
  }

  async getStats(schemaName: string): Promise<SessionStats> {
    return this.db.withTenant(schemaName, async (db) => {
      const [today] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(teleconsultationSessions)
        .where(sql`date(${teleconsultationSessions.scheduledAt}) = CURRENT_DATE`)

      const [inProg] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(teleconsultationSessions)
        .where(
          and(
            sql`date(${teleconsultationSessions.scheduledAt}) = CURRENT_DATE`,
            eq(teleconsultationSessions.status, 'in_progress'),
          ),
        )

      const [completed] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(teleconsultationSessions)
        .where(
          and(
            sql`date(${teleconsultationSessions.scheduledAt}) = CURRENT_DATE`,
            eq(teleconsultationSessions.status, 'completed'),
          ),
        )

      const [avgResult] = await db
        .select({
          avg: sql<number>`coalesce(avg(${teleconsultationSessions.durationMinutes}), 0)::int`,
        })
        .from(teleconsultationSessions)
        .where(
          and(
            sql`date(${teleconsultationSessions.scheduledAt}) = CURRENT_DATE`,
            eq(teleconsultationSessions.status, 'completed'),
          ),
        )

      return {
        totalToday: today?.count ?? 0,
        inProgress: inProg?.count ?? 0,
        completed: completed?.count ?? 0,
        averageDuration: (avgResult?.avg ?? 0) > 0 ? avgResult?.avg ?? null : null,
      }
    })
  }

  private toView(
    row: Record<string, unknown>,
    patientFirst: string,
    patientLast: string,
    doctorName: string,
  ): TeleconsultationSessionView {
    return {
      id: row.id as string,
      patientId: row.patientId as string,
      patientName: `${patientFirst} ${patientLast}`.trim(),
      doctorId: row.doctorId as string,
      doctorName,
      encounterId: (row.encounterId as string | null) ?? null,
      status: row.status as TeleconsultationStatus,
      roomUrl: (row.roomUrl as string | null) ?? null,
      scheduledAt: row.scheduledAt as Date,
      startedAt: (row.startedAt as Date | null) ?? null,
      endedAt: (row.endedAt as Date | null) ?? null,
      durationMinutes: (row.durationMinutes as number | null) ?? null,
      recordingConsent: (row.recordingConsent as boolean) ?? false,
      notes: (row.notes as string | null) ?? null,
      createdAt: row.createdAt as Date,
      updatedAt: row.updatedAt as Date,
    }
  }
}
