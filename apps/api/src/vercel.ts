import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'
import { ExpressAdapter } from '@nestjs/platform-express'
import express from 'express'

const server = express()

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
  )

  app.setGlobalPrefix('/api/v1')
  app.enableCors({ origin: true, credentials: true })
}

void bootstrap()

export default server
