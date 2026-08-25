import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { asc, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { DbService, type TenantTx } from '../db/db.service.js'
import { rxTemplates, rxTemplateItems } from '../db/schema/tenant.js'

export interface RxTemplateItemInput {
  drugName: string
  genericName?: string
  strength?: string
  form?: string
  dosage: string
  frequency: string
  durationDays?: number | null
  instructions?: string
  sequence?: number
}

export interface RxTemplateView {
  id: string
  name: string
  category: string
  createdBy: string | null
  createdAt: string
  items: Array<{
    id: string
    drugName: string
    genericName: string | null
    strength: string | null
    form: string | null
    dosage: string
    frequency: string
    durationDays: number | null
    instructions: string | null
    sequence: number
  }>
}

@Injectable()
export class RxTemplatesService {
  constructor(private readonly db: DbService) {}

  async list(schemaName: string): Promise<RxTemplateView[]> {
    return this.db.withTenant(schemaName, async (db) => {
      const templates = await db
        .select()
        .from(rxTemplates)
        .orderBy(asc(rxTemplates.name))
      const items = await db
        .select()
        .from(rxTemplateItems)
        .orderBy(asc(rxTemplateItems.sequence))

      const byTemplate = new Map<string, RxTemplateView['items']>()
      for (const it of items) {
        const list = byTemplate.get(it.templateId) ?? []
        list.push({
          id: it.id,
          drugName: it.drugName,
          genericName: it.genericName ?? null,
          strength: it.strength ?? null,
          form: it.form ?? null,
          dosage: it.dosage,
          frequency: it.frequency,
          durationDays: it.durationDays ?? null,
          instructions: it.instructions ?? null,
          sequence: it.sequence,
        })
        byTemplate.set(it.templateId, list)
      }

      return templates.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        createdBy: t.createdBy ?? null,
        createdAt: t.createdAt.toISOString(),
        items: byTemplate.get(t.id) ?? [],
      }))
    })
  }

  async create(
    schemaName: string,
    requestedBy: string | null,
    input: { name: string; category: string; items: RxTemplateItemInput[] },
  ): Promise<RxTemplateView> {
    if (!input.name?.trim()) throw new BadRequestException('VALIDATION_FAILED')
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new BadRequestException('VALIDATION_FAILED')
    }

    return this.withTx(schemaName, async (tx) => {
      const [template] = await tx
        .insert(rxTemplates)
        .values({
          id: randomUUID(),
          name: input.name.trim(),
          category: input.category?.trim() || 'General',
          createdBy: requestedBy,
        })
        .returning()

      const values = input.items.map((it, i) => ({
        id: randomUUID(),
        templateId: template.id,
        drugName: it.drugName.trim(),
        genericName: it.genericName?.trim() || null,
        strength: it.strength?.trim() || null,
        form: it.form?.trim() || null,
        dosage: it.dosage.trim(),
        frequency: it.frequency.trim(),
        durationDays: it.durationDays ?? null,
        instructions: it.instructions?.trim() || null,
        sequence: it.sequence ?? i,
      }))

      await tx.insert(rxTemplateItems).values(values)

      return {
        id: template.id,
        name: template.name,
        category: template.category,
        createdBy: template.createdBy ?? null,
        createdAt: template.createdAt.toISOString(),
        items: values.map((v) => ({
          id: v.id,
          drugName: v.drugName,
          genericName: v.genericName,
          strength: v.strength,
          form: v.form,
          dosage: v.dosage,
          frequency: v.frequency,
          durationDays: v.durationDays,
          instructions: v.instructions,
          sequence: v.sequence,
        })),
      }
    })
  }

  async remove(schemaName: string, id: string): Promise<{ id: string }> {
    return this.db.withTenant(schemaName, async (db) => {
      const [existing] = await db
        .select({ id: rxTemplates.id })
        .from(rxTemplates)
        .where(eq(rxTemplates.id, id))
        .limit(1)
      if (!existing) throw new NotFoundException('TEMPLATE_NOT_FOUND')
      await db.delete(rxTemplates).where(eq(rxTemplates.id, id))
      return { id }
    })
  }

  private async withTx<T>(schemaName: string, fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    return this.db.withTenant(schemaName, (db) => db.transaction(fn))
  }
}
