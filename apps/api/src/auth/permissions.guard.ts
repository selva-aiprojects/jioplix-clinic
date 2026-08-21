import { ForbiddenException, Injectable } from '@nestjs/common'
import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import { hasAllPermissions } from '@jioplix/contracts'
import { PERMISSIONS_KEY } from './auth.decorators.js'
import { Reflector } from '@nestjs/core'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required?.length) return true

    const req = context.switchToHttp().getRequest<Request>()
    const granted = req.auth?.permissions ?? []
    if (!hasAllPermissions(granted, required)) {
      throw new ForbiddenException('PERMISSION_DENIED')
    }
    return true
  }
}
