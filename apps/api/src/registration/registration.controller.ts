import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common'
import { registerSchema } from '@jioplix/contracts'
import { RegistrationService } from './registration.service.js'
import { Public } from '../auth/auth.decorators.js'

@Controller('auth')
export class RegistrationController {
  constructor(private readonly registration: RegistrationService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: unknown) {
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join('; ')
      throw new BadRequestException(`VALIDATION_FAILED: ${msg}`)
    }
    const result = await this.registration.register(parsed.data)
    return {
      data: {
        tenantId: result.tenantId,
        slug: result.slug,
        planCode: result.planCode,
        message: 'Registration successful. You can now log in with your credentials.',
      },
    }
  }

  @Public()
  @Get('plans')
  async listPlans() {
    const plans = await this.registration.listPlans()
    return { data: plans }
  }
}
