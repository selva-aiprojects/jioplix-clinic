import 'reflect-metadata'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'
import { ErrorFilter } from './common/error.filter.js'
import { API_PREFIX } from '@jioplix/contracts'
import { Pool } from 'pg'
import { pgConnectionOptions } from '@jioplix/db'
import { initGlobal, migrateExistingTenants } from '@jioplix/db'

function loadRootEnv(): void {
  let dir = process.cwd()
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, '.env')
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate)
      return
    }
    dir = join(dir, '..')
  }
}

async function bootstrap(): Promise<void> {
  loadRootEnv()

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required — set it in .env or the environment')
  }

  // Run global migrations (creates subscription tables if missing)
  if (process.env.DATABASE_URL) {
    try {
      const pool = new Pool(pgConnectionOptions(process.env.DATABASE_URL))
      try {
        const applied = await initGlobal(pool)
        if (applied.length) console.log(`[DB] Applied ${applied.length} global migration(s): ${applied.join(', ')}`)
        // Apply any pending tenant migrations to existing schemas
        const tenantApplied = await migrateExistingTenants(pool)
        if (tenantApplied.length) {
          console.log(`[DB] Applied ${tenantApplied.length} tenant migration(s): ${tenantApplied.join(', ')}`)
        }
      } finally {
        await pool.end().catch(() => {})
      }
    } catch (err: any) {
      console.warn(`[DB] Startup migration warning: ${err?.message || err}. Server will start anyway.`)
    }
  } else {
    console.warn('[DB] DATABASE_URL is not set — skipping startup migrations.')
  }

  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix(API_PREFIX)
  app.useGlobalFilters(new ErrorFilter())
  app.enableCors({ origin: true, credentials: true })

  // Support root-level health probes for platforms like Render (GET /healthz, /health, /readyz)
  const expressApp = app.getHttpAdapter().getInstance()
  expressApp.get(['/health', '/healthz', '/readyz'], (_req: any, res: any) => res.json({ status: 'ok' }))

  const port = Number(process.env.PORT ?? 3000)
  await app.listen(port, '0.0.0.0')
  console.log(`Jioplix API listening on http://0.0.0.0:${port}/${API_PREFIX}`)
}

void bootstrap()
