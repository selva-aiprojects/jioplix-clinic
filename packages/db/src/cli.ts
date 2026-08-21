import { join } from 'node:path'
import { Pool } from 'pg'
import { initGlobal, listTenants, migrateAllTenants, provisionTenant } from './migrator.js'
import { DEMO_CLINIC_TYPES, seedDemoData } from './demo.js'

function loadEnv(): void {
  const candidates = [
    join(import.meta.dirname, '../../../.env'),
    '.env',
  ]
  for (const path of candidates) {
    try {
      process.loadEnvFile(path)
      return
    } catch {
      // try next candidate
    }
  }
}

function usage(): never {
  console.log(`Jioplix DB CLI

Usage:
  npm run db -- <command>

Commands:
  init-global                    Apply global (public) migrations + seed plans
  provision <name> <slug> [plan] Create a tenant schema and seed it
  migrate                        Apply pending tenant migrations to ALL tenants
  seed-demo [slug]               Load demo users/patients/appointments (all active tenants or one)
  list                           List tenants

Environment:
  DATABASE_URL                   postgres://user:pass@host:5432/db`)
  process.exit(0)
}

async function main(): Promise<void> {
  const [cmd, ...args] = process.argv.slice(2)
  if (!cmd) usage()

  loadEnv()
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env first.')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 4 })

  try {
    switch (cmd) {
      case 'init-global': {
        const applied = await initGlobal(pool)
        console.log(applied.length ? `Global migrations applied: ${applied.join(', ')}` : 'Global schema up to date.')
        break
      }
      case 'provision': {
        const [name, slug, plan = 'starter'] = args
        if (!name || !slug) {
          console.error('Usage: provision <name> <slug> [plan=starter]')
          process.exit(1)
        }
        const t = await provisionTenant(pool, { name, slug, planCode: plan })
        console.log(`Tenant "${name}" provisioned.\n  id:     ${t.id}\n  schema: ${t.schemaName}`)
        break
      }
      case 'migrate': {
        const results = await migrateAllTenants(pool)
        for (const r of results) {
          console.log(`${r.schema}: ${r.applied.length ? r.applied.join(', ') : 'up to date'}`)
        }
        break
      }
      case 'seed-demo': {
        const [slug] = args
        const tenants = (await listTenants(pool)).filter(
          (t) => t.status === 'active' && (!slug || t.slug === slug),
        )
        if (!tenants.length) {
          console.log(slug ? `No active tenant with slug "${slug}".` : 'No active tenants. Provision first.')
          break
        }
        for (const t of tenants) {
          const demo = DEMO_CLINIC_TYPES[t.slug]
          const clinicType = demo?.type ?? 'general'
          await seedDemoData(pool, t.schema_name, t.plan_code, clinicType, demo?.name)
          console.log(
            `Seeded demo data into ${t.schema_name} (${t.slug}, plan: ${t.plan_code}, type: ${clinicType})`,
          )
        }
        break
      }
      case 'list': {
        const rows = await listTenants(pool)
        if (!rows.length) {
          console.log('No tenants yet. Run: npm run db -- provision "My Clinic" myclinic professional')
        }
        for (const r of rows) {
          console.log(`${r.status.padEnd(12)} ${r.slug.padEnd(20)} ${r.schema_name.padEnd(14)} ${r.plan_code}`)
        }
        break
      }
      default:
        usage()
    }
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
