import { Injectable } from '@nestjs/common'
import { desc, ilike, or, sql } from 'drizzle-orm'
import { DbService } from '../db/db.service.js'
import { icd10Codes } from '../db/schema/tenant.js'

export interface Icd10View {
  id: string
  code: string
  name: string
  isCommon: boolean
}

@Injectable()
export class Icd10Service {
  constructor(private readonly db: DbService) {}

  async search(schemaName: string, q: string, limit = 12): Promise<Icd10View[]> {
    return this.db.withTenant(schemaName, (db) => {
      const query = db.select().from(icd10Codes)
      const trimmed = q.trim()
      if (!trimmed) {
        return query.where(sql`${icd10Codes.isCommon} = true`).orderBy(desc(icd10Codes.isCommon)).limit(limit)
      }
      return query
        .where(
          or(
            ilike(icd10Codes.code, `${trimmed}%`),
            ilike(icd10Codes.name, `%${trimmed}%`),
          ),
        )
        .orderBy(desc(icd10Codes.isCommon), icd10Codes.code)
        .limit(limit)
    })
  }
}
