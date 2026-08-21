import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { TenantContext } from './tenant.guard'

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    return ctx.switchToHttp().getRequest().tenant
  },
)
