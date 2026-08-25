import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { desc, eq } from 'drizzle-orm'
import { DbService } from '../db/db.service.js'
import { aiJobs } from '../db/schema/tenant.js'

export interface AiJobContext {
  chiefComplaint?: string
  history?: string
  extractedText?: string
}

export interface AiJobDraftItem {
  drugName: string
  genericName?: string
  strength?: string
  form?: string
  dosage: string
  frequency: string
  durationDays?: number
  instructions?: string
}

export interface AiJobResult {
  soap: {
    chiefComplaint: string
    historyPresentIllness: string
    examinationFindings: string
    clinicalNotes: string
  }
  suggestions: AiJobDraftItem[]
}

export interface AiJobView {
  id: string
  encounterId: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  context: AiJobContext | null
  result: AiJobResult | null
  createdAt: string
  updatedAt: string
}

const KEYWORD_MAP: Array<{ kw: string[]; item: AiJobDraftItem }> = [
  { kw: ['fever', 'cold', 'cough', 'flu'], item: { drugName: 'Paracetamol', genericName: 'Paracetamol', strength: '650 mg', form: 'Tablet', dosage: '650 mg', frequency: 'TDS', durationDays: 3, instructions: 'After food' } },
  { kw: ['allergy', 'sneez', 'itch'], item: { drugName: 'Levocet', genericName: 'Levocetirizine', strength: '5 mg', form: 'Tablet', dosage: '5 mg', frequency: 'OD', durationDays: 5, instructions: 'Night' } },
  { kw: ['diabet', 'sugar'], item: { drugName: 'Metformin', genericName: 'Metformin', strength: '500 mg', form: 'Tablet', dosage: '500 mg', frequency: 'BD', durationDays: 30, instructions: 'After meals' } },
  { kw: ['hypertens', 'bp', 'pressure'], item: { drugName: 'Amlodipine', genericName: 'Amlodipine', strength: '5 mg', form: 'Tablet', dosage: '5 mg', frequency: 'OD', durationDays: 30, instructions: 'Morning' } },
  { kw: ['gastritis', 'acidity', 'reflux', 'heartburn'], item: { drugName: 'Pan-D', genericName: 'Pantoprazole + Domperidone', strength: '40 mg', form: 'Capsule', dosage: '40 mg', frequency: 'OD', durationDays: 7, instructions: 'Empty stomach' } },
  { kw: ['pain', 'aches', 'sprain'], item: { drugName: 'Diclofenac', genericName: 'Diclofenac', strength: '50 mg', form: 'Tablet', dosage: '50 mg', frequency: 'BD', durationDays: 3, instructions: 'After food' } },
  { kw: ['infection', 'throat', 'tonsil'], item: { drugName: 'Azithral', genericName: 'Azithromycin', strength: '500 mg', form: 'Tablet', dosage: '500 mg', frequency: 'OD', durationDays: 3, instructions: 'Empty stomach' } },
]

@Injectable()
export class AiJobsService {
  constructor(private readonly db: DbService) {}

  private rowToView(row: typeof aiJobs.$inferSelect): AiJobView {
    return {
      id: row.id,
      encounterId: row.encounterId ?? null,
      status: row.status as AiJobView['status'],
      context: (row.context as AiJobContext) ?? null,
      result: (row.result as AiJobResult) ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  async create(
    schemaName: string,
    requestedBy: string | null,
    input: { encounterId?: string; context?: AiJobContext },
  ): Promise<AiJobView> {
    const view = await this.db.withTenant(schemaName, async (db) => {
      const [row] = await db
        .insert(aiJobs)
        .values({
          encounterId: input.encounterId ?? null,
          requestedBy,
          status: 'pending',
          context: (input.context ?? {}) as object,
        })
        .returning()
      return this.rowToView(row)
    })

    this.scheduleCompletion(schemaName, view.id, input.context ?? {})
    return view
  }

  private scheduleCompletion(schemaName: string, id: string, ctx: AiJobContext) {
    setTimeout(() => {
      void this.complete(schemaName, id, ctx).catch(() => undefined)
    }, 1500)
  }

  private async complete(schemaName: string, id: string, ctx: AiJobContext): Promise<void> {
    await this.db.withTenant(schemaName, async (db) => {
      const result = this.generateDraft(ctx)
      await db
        .update(aiJobs)
        .set({ status: 'completed', result: result as object, updatedAt: new Date() })
        .where(eq(aiJobs.id, id))
    })
  }

  private generateDraft(ctx: AiJobContext): AiJobResult {
    const text = `${ctx.chiefComplaint ?? ''} ${ctx.history ?? ''} ${ctx.extractedText ?? ''}`.toLowerCase()
    const chief = ctx.chiefComplaint?.trim()
      || (ctx.extractedText?.trim() ? ctx.extractedText.trim().slice(0, 120) : 'Presenting complaint (auto-drafted, review needed)')
    const history = ctx.history?.trim()
      ? `History from documented notes:\n${ctx.history.trim().slice(0, 400)}`
      : (ctx.extractedText?.trim()
        ? `History from uploaded record:\n${ctx.extractedText.trim().slice(0, 400)}`
        : 'Onset and progression to be confirmed with patient.')
    return {
      soap: {
        chiefComplaint: chief,
        historyPresentIllness: history,
        examinationFindings: 'General examination unremarkable. Systemic exam pending.',
        clinicalNotes: 'Assessment and plan to be finalised by the clinician.',
      },
      suggestions: KEYWORD_MAP.filter((k) => k.kw.some((w) => text.includes(w))).map((k) => k.item),
    }
  }

  async get(schemaName: string, id: string): Promise<AiJobView> {
    const row = await this.db.withTenant(schemaName, (db) =>
      db.select().from(aiJobs).where(eq(aiJobs.id, id)).limit(1),
    )
    if (!row[0]) throw new NotFoundException('AI_JOB_NOT_FOUND')
    return this.rowToView(row[0])
  }

  async listForEncounter(schemaName: string, encounterId: string): Promise<AiJobView[]> {
    return this.db.withTenant(schemaName, (db) =>
      db
        .select()
        .from(aiJobs)
        .where(eq(aiJobs.encounterId, encounterId))
        .orderBy(desc(aiJobs.createdAt)),
    ).then((rows) => rows.map((r) => this.rowToView(r)))
  }
}
