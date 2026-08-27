import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { AuthContext } from '@jioplix/contracts'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    return ctx.switchToHttp().getRequest().auth
  },
)