import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Pool, PoolClient } from 'pg'

export interface ProvisionInput {
  name: string
  slug: string
  planCode: string
  clinicType?: string
}

const DEFAULT_ROLES: Array<{ key: string; name: string; permissions: string[] }> = [
  { key: 'tenant_admin', name: 'Tenant Admin', permissions: ['*'] },
  {
    key: 'clinic_admin',
    name: 'Clinic Admin',
    permissions: ['patients:*', 'appointments:*', 'invoices:*', 'payments:*', 'reports:read', 'users:*', 'inventory:read'],
  },
  {
    key: 'doctor',
    name: 'Doctor',
    permissions: ['patients:read', 'patients:create', 'appointments:read', 'appointments:update', 'queue:read', 'encounters:*', 'vitals:*', 'diagnoses:*', 'prescriptions:*', 'lab_orders:*', 'procedures:*', 'inventory:read', 'invoices:read', 'notifications:create'],
  },
  {
    key: 'receptionist',
    name: 'Receptionist',
    permissions: ['patients:*', 'appointments:*', 'queue:*', 'encounters:create', 'encounters:read', 'vitals:create', 'invoices:*', 'payments:*', 'inventory:read', 'procedures:create', 'prescriptions:read', 'lab_orders:read', 'procedures:read'],
  },
  { key: 'nurse', name: 'Nurse / Assistant', permissions: ['patients:read', 'queue:*', 'procedures:execute', 'vitals:*', 'encounters:read', 'vitals:create'] },
  { key: 'pharmacist', name: 'Pharmacist', permissions: ['pharmacy:*', 'prescriptions:read', 'prescriptions:update', 'inventory:read', 'inventory:create', 'inventory:adjust', 'invoices:read'] },
  { key: 'lab_technician', name: 'Lab Technician', permissions: ['lab:*', 'lab_orders:read', 'lab_orders:create', 'lab_orders:update', 'inventory:read'] },
  { key: 'accountant', name: 'Accountant', permissions: ['invoices:*', 'payments:*', 'reports:read'] },
]

function migrationDir(kind: 'global' | 'tenant'): string {
  return join(import.meta.dirname, '..', 'migrations', kind)
}

function listMigrations(dir: string): Array<{ version: string; file: string; sql: string }> {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => ({
      version: file.replace(/\.sql$/, ''),
      file,
      sql: readFileSync(join(dir, file), 'utf8'),
    }))
}

async function appliedVersions(client: PoolClient, qualifiedTable: string): Promise<Set<string>> {
  const { rows } = await client.query<{ version: string }>(
    `SELECT version FROM ${qualifiedTable}`,
  )
  return new Set(rows.map((r) => r.version))
}

async function applyMigrations(
  pool: Pool,
  opts: { kind: 'global' | 'tenant'; searchPath?: string },
): Promise<string[]> {
  const dir = migrationDir(opts.kind)
  const migrations = listMigrations(dir)
  const trackingTable =
    opts.kind === 'global' ? 'public.schema_migrations' : 'schema_migrations'

  const client = await pool.connect()
  const applied: string[] = []
  try {
    await client.query('BEGIN')
    await client.query(`SELECT set_config('search_path', $1, true)`, [
      opts.searchPath ?? 'public',
    ])
    await client.query(
      `CREATE TABLE IF NOT EXISTS ${trackingTable} (
         version TEXT PRIMARY KEY,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`,
    )
    const done = await appliedVersions(client, trackingTable)

    for (const m of migrations) {
      if (done.has(m.version)) continue
      await client.query(m.sql)
      await client.query(`INSERT INTO ${trackingTable} (version) VALUES ($1)`, [m.version])
      applied.push(m.version)
    }
    await client.query('COMMIT')
    return applied
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function initGlobal(pool: Pool): Promise<string[]> {
  return applyMigrations(pool, { kind: 'global' })
}

export async function provisionTenant(
  pool: Pool,
  input: ProvisionInput,
): Promise<{ id: string; schemaName: string }> {
  const id = randomUUID()
  const schemaName = `t_${id.replace(/-/g, '').slice(0, 8)}`
  const slug = input.slug.toLowerCase()

  const existing = await pool.query<{ id: string; schema_name: string; status: string }>(
    `SELECT id, schema_name, status FROM public.tenants WHERE slug = $1`,
    [slug],
  )
  if (existing.rows[0]?.status === 'active') {
    return { id: existing.rows[0].id, schemaName: existing.rows[0].schema_name }
  }

  try {
    await pool.query(
      `DELETE FROM public.tenants WHERE slug = $1 AND status IN ('provisioning', 'suspended')`,
      [slug],
    )
    await pool.query(
      `INSERT INTO public.tenants (id, name, slug, schema_name, status, plan_code, clinic_type)
       VALUES ($1, $2, $3, $4, 'provisioning', $5, $6)`,
      [id, input.name, slug, schemaName, input.planCode, input.clinicType ?? 'general'],
    )

    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`)
    await applyMigrations(pool, { kind: 'tenant', searchPath: `"${schemaName}",public` })
    await seedTenant(pool, schemaName, input.planCode)

    await pool.query(`UPDATE public.tenants SET status = 'active' WHERE id = $1`, [id])
    return { id, schemaName }
  } catch (err) {
    await pool
      .query(`UPDATE public.tenants SET status = 'suspended' WHERE id = $1`, [id])
      .catch(() => undefined)
    throw err
  }
}

async function seedTenant(pool: Pool, schemaName: string, planCode: string): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`SELECT set_config('search_path', $1, true)`, [`"${schemaName}",public`])

    for (const role of DEFAULT_ROLES) {
      await client.query(
        `INSERT INTO roles (id, key, name, permissions) VALUES ($1, $2, $3, $4::jsonb)
         ON CONFLICT (key) DO NOTHING`,
        [randomUUID(), role.key, role.name, JSON.stringify(role.permissions)],
      )
    }

    const { rows } = await client.query<{ addons: string[] }>(
      `SELECT addons FROM public.plans WHERE code = $1`,
      [planCode],
    )
    const addons = rows[0]?.addons ?? []
    const allModules = ['pharmacy', 'laboratory', 'inventory', 'procedures', 'multi_branch']
    for (const mod of allModules) {
      await client.query(
        `INSERT INTO addon_entitlements (module_code, enabled) VALUES ($1, $2)
         ON CONFLICT (module_code) DO UPDATE SET enabled = EXCLUDED.enabled`,
        [mod, addons.includes(mod)],
      )
    }

    await client.query(
      `INSERT INTO branches (id, name, code) VALUES ($1, 'Main Branch', 'MAIN')
       ON CONFLICT DO NOTHING`,
      [randomUUID()],
    )

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function migrateAllTenants(pool: Pool): Promise<Array<{ schema: string; applied: string[] }>> {
  const client = await pool.connect()
  let schemas: string[]
  try {
    const { rows } = await client.query<{ schema_name: string }>(
      `SELECT schema_name FROM public.tenants WHERE status IN ('active', 'provisioning') ORDER BY created_at`,
    )
    schemas = rows.map((r) => r.schema_name)
  } finally {
    client.release()
  }

  const results: Array<{ schema: string; applied: string[] }> = []
  for (const schema of schemas) {
    const applied = await applyMigrations(pool, { kind: 'tenant', searchPath: `"${schema}",public` })
    results.push({ schema, applied })
  }
  return results
}

export async function listTenants(pool: Pool): Promise<
  Array<{ name: string; slug: string; schema_name: string; status: string; plan_code: string }>
> {
  const { rows } = await pool.query(
    `SELECT name, slug, schema_name, status, plan_code FROM public.tenants ORDER BY created_at`,
  )
  return rows
}
