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

  @Get('healthz')
  liveness() {
    return { status: 'ok' }
  }

  @Get('readyz')
  async readiness() {
    const dbOk = await this.db.ping().catch(() => false)
    return {
      status: dbOk ? 'ok' : 'degraded',
      checks: { database: dbOk ? 'up' : 'down' },
    }
  }
}
