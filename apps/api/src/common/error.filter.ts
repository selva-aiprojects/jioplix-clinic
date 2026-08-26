import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common'
import type { Response } from 'express'

const STATUS_CODES: Record<number, string> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
}

@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>()

    if (exception instanceof HttpException) {
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
      return
    }

    this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception))
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      statusCode: 500,
    })
  }
}
