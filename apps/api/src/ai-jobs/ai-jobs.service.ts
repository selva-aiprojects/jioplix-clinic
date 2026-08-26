import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { desc, eq } from 'drizzle-orm'
import { DbService } from '../db/db.service.js'
import { aiJobs } from '../db/schema/tenant.js'

export interface AiJobContext {
  chiefComplaint?: string
  history?: string
  extractedText?: string
  patientAge?: number
  patientGender?: string
  previousDiagnoses?: string
  currentMedications?: string
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
  patientSummary?: string
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
  { kw: ['fever', 'cold', 'cough', 'flu'], item: { drugName: 'Paracetamol', genericName: 'Paracetamol', strength: '650 mg', form: 'tablet', dosage: '650 mg', frequency: 'TDS', durationDays: 3, instructions: 'After food' } },
  { kw: ['allergy', 'sneez', 'itch'], item: { drugName: 'Levocet', genericName: 'Levocetirizine', strength: '5 mg', form: 'tablet', dosage: '5 mg', frequency: 'OD', durationDays: 5, instructions: 'Night' } },
  { kw: ['diabet', 'sugar'], item: { drugName: 'Metformin', genericName: 'Metformin', strength: '500 mg', form: 'tablet', dosage: '500 mg', frequency: 'BD', durationDays: 30, instructions: 'After meals' } },
  { kw: ['hypertens', 'bp', 'pressure'], item: { drugName: 'Amlodipine', genericName: 'Amlodipine', strength: '5 mg', form: 'tablet', dosage: '5 mg', frequency: 'OD', durationDays: 30, instructions: 'Morning' } },
  { kw: ['gastritis', 'acidity', 'reflux', 'heartburn'], item: { drugName: 'Pan-D', genericName: 'Pantoprazole + Domperidone', strength: '40 mg', form: 'capsule', dosage: '40 mg', frequency: 'OD', durationDays: 7, instructions: 'Empty stomach' } },
  { kw: ['pain', 'aches', 'sprain'], item: { drugName: 'Diclofenac', genericName: 'Diclofenac', strength: '50 mg', form: 'tablet', dosage: '50 mg', frequency: 'BD', durationDays: 3, instructions: 'After food' } },
  { kw: ['infection', 'throat', 'tonsil'], item: { drugName: 'Azithral', genericName: 'Azithromycin', strength: '500 mg', form: 'tablet', dosage: '500 mg', frequency: 'OD', durationDays: 3, instructions: 'Empty stomach' } },
  { kw: ['asthma', 'breath', 'wheeze'], item: { drugName: 'Asthalin', genericName: 'Salbutamol', strength: '2 mg', form: 'tablet', dosage: '2 mg', frequency: 'TDS', durationDays: 5, instructions: 'As needed for breathlessness' } },
  { kw: ['skin', 'rash', 'eczema', 'dermatitis'], item: { drugName: 'Betnovate', genericName: 'Betamethasone', strength: '0.1%', form: 'cream', dosage: 'Apply thin layer', frequency: 'BD', durationDays: 7, instructions: 'Apply to affected area only' } },
  { kw: ['migraine', 'headache', 'migraine'], item: { drugName: 'Suminat', genericName: 'Sumatriptan', strength: '50 mg', form: 'tablet', dosage: '50 mg', frequency: 'PRN', durationDays: 1, instructions: 'At onset of migraine, max 2 doses/day' } },
  { kw: ['diarrhea', 'loose stool', 'gastro'], item: { drugName: 'Eldoper', genericName: 'Loperamide', strength: '2 mg', form: 'capsule', dosage: '2 mg', frequency: 'BD', durationDays: 3, instructions: 'After loose stool, max 8 mg/day' } },
  { kw: ['nausea', 'vomit'], item: { drugName: 'Emeset', genericName: 'Ondansetron', strength: '4 mg', form: 'tablet', dosage: '4 mg', frequency: 'TDS', durationDays: 3, instructions: 'Before meals' } },
]

@Injectable()
export class AiJobsService {
  private readonly logger = new Logger(AiJobsService.name)

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
    input: { encounterId?: string; context?: AiJobContext; jobType?: string },
  ): Promise<AiJobView> {
    const view = await this.db.withTenant(schemaName, async (db) => {
      const [row] = await db
        .insert(aiJobs)
        .values({
          encounterId: input.encounterId ?? null,
          requestedBy,
          status: 'pending',
          context: { ...input.context, jobType: input.jobType ?? 'consultation' } as object,
        })
        .returning()
      return this.rowToView(row)
    })

    this.scheduleCompletion(schemaName, view.id, input.context ?? {}, input.jobType ?? 'consultation')
    return view
  }

  private scheduleCompletion(schemaName: string, id: string, ctx: AiJobContext, jobType: string) {
    setTimeout(() => {
      void this.complete(schemaName, id, ctx, jobType).catch(() => undefined)
    }, 100)
  }

  private async complete(schemaName: string, id: string, ctx: AiJobContext, jobType: string): Promise<void> {
    try {
      await this.db.withTenant(schemaName, async (db) => {
        await db
          .update(aiJobs)
          .set({ status: 'processing', updatedAt: new Date() })
          .where(eq(aiJobs.id, id))
      })

      let result: AiJobResult
      const apiKey = process.env.OPENAI_API_KEY

      if (apiKey) {
        try {
          result = await this.generateWithLLM(ctx, jobType, apiKey)
        } catch (err) {
          this.logger.warn(`LLM call failed, falling back to keyword engine: ${(err as Error).message}`)
          result = this.generateDraft(ctx)
        }
      } else {
        result = this.generateDraft(ctx)
      }

      await this.db.withTenant(schemaName, async (db) => {
        await db
          .update(aiJobs)
          .set({ status: 'completed', result: result as object, updatedAt: new Date() })
          .where(eq(aiJobs.id, id))
      })
    } catch {
      await this.db.withTenant(schemaName, async (db) => {
        await db
          .update(aiJobs)
          .set({ status: 'failed', updatedAt: new Date() })
          .where(eq(aiJobs.id, id))
      })
    }
  }

  private async generateWithLLM(ctx: AiJobContext, jobType: string, apiKey: string): Promise<AiJobResult> {
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey })
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

    const patientInfo = [
      ctx.patientAge ? `Age: ${ctx.patientAge}` : '',
      ctx.patientGender ? `Gender: ${ctx.patientGender}` : '',
      ctx.previousDiagnoses ? `Previous diagnoses: ${ctx.previousDiagnoses}` : '',
      ctx.currentMedications ? `Current medications: ${ctx.currentMedications}` : '',
    ].filter(Boolean).join(', ')

    let systemPrompt: string
    let userPrompt: string

    if (jobType === 'patient_summary') {
      systemPrompt = `You are an AI medical assistant for Jioplix Clinic OS. Generate a patient-friendly health summary.
Return ONLY valid JSON with this exact structure:
{
  "summary": "A clear, patient-friendly paragraph summarizing the visit, diagnosis, and treatment plan"
}
Use simple language. Avoid medical jargon. Be empathetic and clear.`

      userPrompt = `Generate a patient-friendly visit summary.
${patientInfo ? `Patient: ${patientInfo}` : ''}
Chief Complaint: ${ctx.chiefComplaint || 'Not specified'}
History: ${ctx.history || 'Not provided'}
${ctx.extractedText ? `Additional context: ${ctx.extractedText}` : ''}`
    } else if (jobType === 'operational_insights') {
      systemPrompt = `You are an AI operational assistant for Jioplix Clinic OS.
Return ONLY valid JSON with this exact structure:
{
  "insights": ["insight1", "insight2", "insight3"]
}
Generate 3 actionable operational insights based on the clinic data provided.`

      userPrompt = `Generate operational insights for the clinic.
${ctx.extractedText || 'Clinic data not provided'}`
    } else {
      systemPrompt = `You are an AI clinical assistant for Jioplix Clinic OS (Indian healthcare context).
Return ONLY valid JSON with this exact structure:
{
  "soap": {
    "chiefComplaint": "...",
    "historyPresentIllness": "...",
    "examinationFindings": "...",
    "clinicalNotes": "..."
  },
  "suggestions": [
    {
      "drugName": "Brand name (e.g. Dolo, Augmentin)",
      "genericName": "Generic name",
      "strength": "e.g. 650 mg",
      "form": "tablet|capsule|syrup|injection|cream|drops",
      "dosage": "e.g. 650 mg",
      "frequency": "e.g. TDS, BD, OD",
      "durationDays": 3,
      "instructions": "e.g. After food"
    }
  ],
  "patientSummary": "A patient-friendly one-line summary of the visit"
}
Prescribe only common Indian brands (Dolo, Augmentin, Pan-D, Glycomet, Amlodipine, etc).
Be clinically appropriate. Always remind the doctor to review.
Keep suggestions to 2-4 medications maximum.
Use standard Indian dosage forms and frequencies.`

      userPrompt = `Clinical context:
${patientInfo ? `Patient: ${patientInfo}` : ''}

Chief Complaint: ${ctx.chiefComplaint || 'Not provided'}
History: ${ctx.history || 'Not provided'}
${ctx.extractedText ? `Additional context from uploaded records:\n${ctx.extractedText}` : ''}

Generate SOAP notes and medication suggestions for this consultation.`
    }

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('Empty LLM response')

    const parsed = JSON.parse(content) as Record<string, unknown>

    if (jobType === 'patient_summary') {
      return {
        soap: {
          chiefComplaint: ctx.chiefComplaint || '',
          historyPresentIllness: ctx.history || '',
          examinationFindings: '',
          clinicalNotes: '',
        },
        suggestions: [],
        patientSummary: (parsed.summary as string) || 'Visit summary generated.',
      }
    }

    if (jobType === 'operational_insights') {
      return {
        soap: {
          chiefComplaint: '',
          historyPresentIllness: '',
          examinationFindings: '',
          clinicalNotes: (parsed.insights as string[])?.join('\n') || '',
        },
        suggestions: [],
      }
    }

    const soap = (parsed.soap as Record<string, string>) || {}
    const rawSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : []

    return {
      soap: {
        chiefComplaint: soap.chiefComplaint || ctx.chiefComplaint || '',
        historyPresentIllness: soap.historyPresentIllness || ctx.history || '',
        examinationFindings: soap.examinationFindings || 'General examination unremarkable.',
        clinicalNotes: soap.clinicalNotes || 'Assessment to be finalised by clinician.',
      },
      suggestions: rawSuggestions.map((s: Record<string, unknown>) => ({
        drugName: String(s.drugName || ''),
        genericName: s.genericName ? String(s.genericName) : undefined,
        strength: s.strength ? String(s.strength) : undefined,
        form: s.form ? String(s.form) : undefined,
        dosage: String(s.dosage || ''),
        frequency: String(s.frequency || ''),
        durationDays: typeof s.durationDays === 'number' ? s.durationDays : undefined,
        instructions: s.instructions ? String(s.instructions) : undefined,
      })).filter((s: AiJobDraftItem) => s.drugName && s.dosage),
      patientSummary: parsed.patientSummary ? String(parsed.patientSummary) : undefined,
    }
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
