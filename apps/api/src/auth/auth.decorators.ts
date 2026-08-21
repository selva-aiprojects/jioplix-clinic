import { createParamDecorator, SetMetadata } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'
import type { AuthContext } from '@jioplix/contracts'

export const IS_PUBLIC_KEY = 'isPublic'
export const Public = (): ReturnType<typeof SetMetadata> => SetMetadata(IS_PUBLIC_KEY, true)

export const PERMISSIONS_KEY = 'requiredPermissions'
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions)

export const CurrentAuth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => ctx.switchToHttp().getRequest().auth,
)
