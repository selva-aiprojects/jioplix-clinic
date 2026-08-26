import { Injectable } from '@nestjs/common'
import { desc, ilike, or, sql } from 'drizzle-orm'
import { DbService } from '../db/db.service.js'
import { drugMaster } from '../db/schema/tenant.js'

export interface DrugMasterView {
  id: string
  brand: string
  generic: string
  strength: string | null
  form: string | null
  commonDosages: string[]
  commonFrequencies: string[]
  commonDurations: number[]
  category: string | null
}

@Injectable()
export class DrugMasterService {
  constructor(private readonly db: DbService) {}

  async search(schemaName: string, q: string, limit = 12): Promise<DrugMasterView[]> {
    return this.db.withTenant(schemaName, (db) => {
      const trimmed = q.trim()
      const base = db.select().from(drugMaster)
      const query = trimmed
        ? base.where(
            or(
              ilike(drugMaster.brand, `%${trimmed}%`),
              ilike(drugMaster.generic, `%${trimmed}%`),
              ilike(drugMaster.category, `%${trimmed}%`),
            ),
          )
        : base
      return trimmed
        ? query.limit(limit)
        : query.orderBy(desc(drugMaster.createdAt)).limit(limit)
    })
  }
}
