import { Injectable } from '@nestjs/common'
import { Pool } from 'pg'
import { pgConnectionOptions } from '@jioplix/db'
import { drizzle, type NodePgDatabase, type NodePgQueryResultHKT } from 'drizzle-orm/node-postgres'
import type { ExtractTablesWithRelations } from 'drizzle-orm'
import type { PgTransaction } from 'drizzle-orm/pg-core'
import * as tenantSchema from './schema/tenant.js'

export type TenantDb = NodePgDatabase<typeof tenantSchema>
export type TenantTx = PgTransaction<
  NodePgQueryResultHKT,
  typeof tenantSchema,
  ExtractTablesWithRelations<typeof tenantSchema>
>

@Injectable()
export class DbService {
  readonly pool: Pool

  constructor() {
    this.pool = new Pool({ ...pgConnectionOptions(process.env.DATABASE_URL), max: 10 })
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end()
  }

  async ping(): Promise<boolean> {
    const r = await this.pool.query('SELECT 1 AS ok')
    return r.rows[0]?.ok === 1
  }

  /**
   * Runs `fn` inside a transaction with search_path pinned to the tenant
   * schema. set_config(..., true) keeps it transaction-local so pooled
   * connections are never left pointing at another tenant's schema.
   */
  async withTenant<T>(
    schemaName: string,
    fn: (db: NodePgDatabase<typeof tenantSchema>) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(`SELECT set_config('search_path', $1, true)`, [
        `"${schemaName}",public`,
      ])
      const db = drizzle(client, { schema: tenantSchema })
      const result = await fn(db)
      await client.query('COMMIT')
      return result
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }
}
