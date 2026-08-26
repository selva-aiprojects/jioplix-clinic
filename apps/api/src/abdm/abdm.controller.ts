import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common'
import { AbdmService } from './abdm.service.js'

@Controller('abdm')
export class AbdmController {
  constructor(private readonly abdm: AbdmService) {}

  @Post('link-abha')
  @HttpCode(HttpStatus.OK)
  async linkAbha(
    @Body() body: { patientId: string; abhaNumber: string; abhaAddress?: string },
  ) {
    if (!body.patientId || !body.abhaNumber) {
      throw new BadRequestException('patientId and abhaNumber are required')
    }
    return { data: await this.abdm.linkAbha(body) }
  }

  @Get('health-records/:patientId')
  async getHealthRecords(@Param('patientId') patientId: string) {
    return { data: await this.abdm.fetchHealthRecords(patientId) }
  }

  @Post('consent')
  @HttpCode(HttpStatus.CREATED)
  async requestConsent(
    @Body()
    body: {
      patientId: string
      purpose: string
      hipIds?: string[]
      careContexts?: string[]
      expiry?: string
    },
  ) {
    if (!body.patientId || !body.purpose) {
      throw new BadRequestException('patientId and purpose are required')
    }
    return { data: await this.abdm.requestConsent(body) }
  }

  @Get('consent/:id')
  async getConsentStatus(@Param('id') id: string) {
    return { data: await this.abdm.getConsentStatus(id) }
  }

  @Post('push-records')
  @HttpCode(HttpStatus.OK)
  async pushRecords(
    @Body()
    body: {
      patientId: string
      records: Array<{ type: string; data: Record<string, unknown> }>
    },
  ) {
    if (!body.patientId || !body.records?.length) {
      throw new BadRequestException('patientId and at least one record are required')
    }
    return { data: await this.abdm.pushRecords(body) }
  }

  @Get('status')
  async getStatus() {
    return { data: this.abdm.getConnectionStatus() }
  }

  @Get('activity')
  async getActivityLog(@Query('limit') limit?: string) {
    const n = limit ? Math.min(Number(limit), 100) : 50
    return { data: this.abdm.getActivityLog(n) }
  }
}
