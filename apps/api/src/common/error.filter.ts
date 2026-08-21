import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from '@nestjs/common'
import type { Response } from 'express'

const STATUS_CODES: Record<number, string> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
}

@Catch(HttpException)
export class ErrorFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>()
    const status = exception.getStatus()
    const raw = exception.message
    const isMachineCode = /^[A-Z][A-Z_]*$/.test(raw)

    res.status(status).json({
      error: {
        code: isMachineCode ? raw : STATUS_CODES[status] ?? 'INTERNAL_ERROR',
        ...(isMachineCode ? {} : { message: raw }),
      },
      statusCode: status,
    })
  }
}
