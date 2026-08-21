import 'reflect-metadata'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'
import { ErrorFilter } from './common/error.filter.js'
import { API_PREFIX } from '@jioplix/contracts'

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

  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix(API_PREFIX)
  app.useGlobalFilters(new ErrorFilter())
  app.enableCors({ origin: true, credentials: true })

  const port = Number(process.env.PORT ?? 3000)
  await app.listen(port)
  console.log(`Jioplix API listening on http://localhost:${port}/${API_PREFIX}`)
}

void bootstrap()
