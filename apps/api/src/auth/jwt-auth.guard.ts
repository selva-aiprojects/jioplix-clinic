import { Injectable, UnauthorizedException } from '@nestjs/common'
import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import type { AuthContext } from '@jioplix/contracts'
import { IS_PUBLIC_KEY } from './auth.decorators.js'
import { verifyAccessToken, TokenExpiredError } from './jwt.util.js'
import { Reflector } from '@nestjs/core'

declare module 'express' {
  interface Request {
    auth?: AuthContext
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const req = context.switchToHttp().getRequest<Request>()
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('UNAUTHORIZED')
    }

    const secret = process.env.JWT_SECRET
    if (!secret) throw new UnauthorizedException('TOKEN_INVALID')

    try {
      const claims = verifyAccessToken(header.slice(7), secret)
      req.auth = {
        userId: claims.sub,
        tenantId: claims.tid,
        schemaName: claims.schema,
        slug: claims.slug,
        roles: claims.roles ?? [],
        permissions: claims.perms ?? [],
      }
      return true
    } catch (err) {
      if (err instanceof TokenExpiredError) throw new UnauthorizedException('TOKEN_EXPIRED')
      throw new UnauthorizedException('TOKEN_INVALID')
    }
  }
}
