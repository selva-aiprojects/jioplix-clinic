import { Controller, Get } from '@nestjs/common'
import { DbService } from '../db/db.service.js'
import { Public } from '../auth/auth.decorators.js'

@Controller()
@Public()
export class HealthController {
  constructor(private readonly db: DbService) {}

  @Get()
  root() {
    return { service: 'jioplix-api', status: 'ok', docs: '/api/v1' }
  }

  @Get(['health', 'healthz'])
  liveness() {
    return { status: 'ok' }
  }

  @Get('readyz')
  async readiness() {
    let dbError: string | null = null
    const dbOk = await this.db.ping().catch((err: any) => {
      dbError = err?.message || String(err)
      return false
    })
    return {
      status: dbOk ? 'ok' : 'degraded',
      checks: { database: dbOk ? 'up' : 'down' },
      ...(dbError ? { error: dbError } : {}),
    }
  }
}
