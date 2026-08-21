import jwt from 'jsonwebtoken'

export interface AccessTokenClaims {
  sub: string
  tid: string
  schema: string
  slug: string
  roles?: string[]
  perms?: string[]
}

export interface RefreshTokenClaims {
  sub: string
  tid: string
  schema: string
  slug: string
  jti: string
}

type Ttl = string | number

export function signAccessToken(claims: AccessTokenClaims, secret: string, ttl: Ttl): string {
  return jwt.sign(claims, secret, { expiresIn: ttl as jwt.SignOptions['expiresIn'] })
}

export function signRefreshToken(claims: RefreshTokenClaims, secret: string, ttl: Ttl): string {
  return jwt.sign(claims, secret, { expiresIn: ttl as jwt.SignOptions['expiresIn'] })
}

export function verifyAccessToken(token: string, secret: string): AccessTokenClaims {
  return jwt.verify(token, secret) as AccessTokenClaims
}

export function verifyRefreshToken(token: string, secret: string): RefreshTokenClaims {
  return jwt.verify(token, secret) as RefreshTokenClaims
}

export { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken'
