import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { and, eq, isNull } from 'drizzle-orm'
import { createHash, randomUUID } from 'node:crypto'
import type { AuthContext, LoginRequest, VerifyOtpRequest } from '@jioplix/contracts'
import { newId } from '@jioplix/contracts'
import { DbService } from '../db/db.service.js'
import { refreshTokens, roles, userBranchRoles, users } from '../db/schema/tenant.js'
import { verifyPassword } from './password.util.js'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from './jwt.util.js'

interface TenantRow {
  id: string
  name: string
  slug: string
  schema_name: string
  clinic_type: string
}

export interface SessionTokens {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    fullName: string
    phone: string
    specialty: string | null
    roles: string[]
    permissions: string[]
    clinic: { id: string; name: string; slug: string; clinicType: string }
  }
}

@Injectable()
export class AuthService {
  constructor(private readonly db: DbService) {}

  private get secret(): string {
    const secret = process.env.JWT_SECRET
    if (!secret) throw new Error('JWT_SECRET is not configured')
    return secret
  }

  private get accessTtl() {
    return process.env.JWT_ACCESS_TTL ?? '15m'
  }

  private get refreshTtlMs(): number {
    const raw = process.env.JWT_REFRESH_TTL ?? '7d'
    const match = /^(\d+)([dhm])$/.exec(raw)
    if (!match) return 7 * 24 * 60 * 60 * 1000
    const n = Number(match[1])
    const unit = match[2]
    const mult = unit === 'd' ? 86_400_000 : unit === 'h' ? 3_600_000 : 60_000
    return n * mult
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  private async resolveTenantBySlug(slug: string): Promise<TenantRow> {
    const { rows } = await this.db.pool.query<TenantRow>(
      `SELECT id, name, slug, schema_name, clinic_type FROM public.tenants WHERE slug = $1 AND status = 'active'`,
      [slug],
    )
    if (!rows[0]) throw new NotFoundException('TENANT_NOT_FOUND')
    return rows[0]
  }

  private async loadUserContext(
    schemaName: string,
    phone: string,
    password: string,
  ): Promise<{ ctx: AuthContext; fullName: string; specialty: string | null } | null> {
    return this.db.withTenant(schemaName, async (db) => {
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.phone, phone), eq(users.status, 'active')))
        .limit(1)
      if (!user) return null

      const ok = await verifyPassword(password, user.passwordHash)
      if (!ok) return null

      const roleRows = await db
        .select({ key: roles.key, permissions: roles.permissions })
        .from(userBranchRoles)
        .innerJoin(roles, eq(userBranchRoles.roleId, roles.id))
        .where(eq(userBranchRoles.userId, user.id))

      const roleKeys = [...new Set(roleRows.map((r) => r.key))]
      const permissions = [...new Set(roleRows.flatMap((r) => r.permissions))]

      return {
        ctx: {
          userId: user.id,
          tenantId: '',
          schemaName,
          slug: '',
          roles: roleKeys,
          permissions,
        },
        fullName: user.fullName,
        specialty: user.specialty,
      }
    })
  }

  async login(input: LoginRequest): Promise<SessionTokens> {
    const tenant = await this.resolveTenantBySlug(input.clinic)
    const found = await this.loadUserContext(tenant.schema_name, input.phone, input.password)
    if (!found) throw new UnauthorizedException('INVALID_CREDENTIALS')

    const ctx: AuthContext = {
      ...found.ctx,
      tenantId: tenant.id,
      slug: tenant.slug,
    }
    return this.issueSession(ctx, tenant, found.fullName, found.specialty, input.phone)
  }

  async loginByOtp(input: VerifyOtpRequest): Promise<SessionTokens> {
    const tenant = await this.resolveTenantBySlug(input.clinic)

    // Load user context without password verification (OTP already verified)
    const found = await this.loadUserContextNoPassword(tenant.schema_name, input.phone)
    if (!found) throw new UnauthorizedException('INVALID_CREDENTIALS')

    const ctx: AuthContext = {
      ...found.ctx,
      tenantId: tenant.id,
      slug: tenant.slug,
    }
    return this.issueSession(ctx, tenant, found.fullName, found.specialty, input.phone)
  }

  private async loadUserContextNoPassword(
    schemaName: string,
    phone: string,
  ): Promise<{ ctx: AuthContext; fullName: string; specialty: string | null } | null> {
    return this.db.withTenant(schemaName, async (db) => {
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.phone, phone), eq(users.status, 'active')))
        .limit(1)
      if (!user) return null

      const roleRows = await db
        .select({ key: roles.key, permissions: roles.permissions })
        .from(userBranchRoles)
        .innerJoin(roles, eq(userBranchRoles.roleId, roles.id))
        .where(eq(userBranchRoles.userId, user.id))

      const roleKeys = [...new Set(roleRows.map((r) => r.key))]
      const permissions = [...new Set(roleRows.flatMap((r) => r.permissions))]

      return {
        ctx: {
          userId: user.id,
          tenantId: '',
          schemaName,
          slug: '',
          roles: roleKeys,
          permissions,
        },
        fullName: user.fullName,
        specialty: user.specialty,
      }
    })
  }

  private async issueSession(
    ctx: AuthContext,
    tenant: TenantRow,
    fullName: string,
    specialty: string | null,
    phone: string,
  ): Promise<SessionTokens> {
    const accessToken = signAccessToken(
      {
        sub: ctx.userId,
        tid: ctx.tenantId,
        schema: ctx.schemaName,
        slug: ctx.slug,
        roles: ctx.roles,
        perms: ctx.permissions,
      },
      this.secret,
      this.accessTtl,
    )

    const jti = randomUUID()
    const refreshToken = signRefreshToken(
      { sub: ctx.userId, tid: ctx.tenantId, schema: ctx.schemaName, slug: ctx.slug, jti },
      this.secret,
      Math.floor(this.refreshTtlMs / 1000),
    )

    await this.db.withTenant(ctx.schemaName, async (db) => {
      await db.insert(refreshTokens).values({
        id: newId(),
        userId: ctx.userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + this.refreshTtlMs),
      })
    })

    return {
      accessToken,
      refreshToken,
      user: {
        id: ctx.userId,
        fullName,
        phone,
        specialty,
        roles: ctx.roles,
        permissions: ctx.permissions,
        clinic: { id: tenant.id, name: tenant.name, slug: tenant.slug, clinicType: tenant.clinic_type },
      },
    }
  }

  async refresh(refreshToken: string): Promise<SessionTokens> {
    let claims
    try {
      claims = verifyRefreshToken(refreshToken, this.secret)
    } catch {
      throw new UnauthorizedException('TOKEN_INVALID')
    }

    const tokenHash = this.hashToken(refreshToken)
    const rotated = await this.db.withTenant(claims.schema, async (db) => {
      const [row] = await db
        .select()
        .from(refreshTokens)
        .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
        .limit(1)
      if (!row || row.expiresAt.getTime() < Date.now()) return null

      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.id, row.id))

      const [user] = await db.select().from(users).where(eq(users.id, claims.sub)).limit(1)
      if (!user || user.status !== 'active') return null

      const roleRows = await db
        .select({ key: roles.key, permissions: roles.permissions })
        .from(userBranchRoles)
        .innerJoin(roles, eq(userBranchRoles.roleId, roles.id))
        .where(eq(userBranchRoles.userId, user.id))

      return { user, roleRows }
    })
    if (!rotated) throw new UnauthorizedException('TOKEN_INVALID')

    const ctx: AuthContext = {
      userId: rotated.user.id,
      tenantId: claims.tid,
      schemaName: claims.schema,
      slug: claims.slug,
      roles: [...new Set(rotated.roleRows.map((r) => r.key))],
      permissions: [...new Set(rotated.roleRows.flatMap((r) => r.permissions))],
    }

    const { rows } = await this.db.pool.query<TenantRow>(
      `SELECT id, name, slug, schema_name, clinic_type FROM public.tenants WHERE id = $1 AND status = 'active'`,
      [claims.tid],
    )
    if (!rows[0]) throw new UnauthorizedException('TOKEN_INVALID')

    return this.issueSession(ctx, rows[0], rotated.user.fullName, rotated.user.specialty, rotated.user.phone)
  }

  async logout(refreshToken: string): Promise<{ ok: boolean }> {
    try {
      const claims = verifyRefreshToken(refreshToken, this.secret)
      const tokenHash = this.hashToken(refreshToken)
      await this.db.withTenant(claims.schema, async (db) => {
        await db
          .update(refreshTokens)
          .set({ revokedAt: new Date() })
          .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
      })
    } catch {
      // best-effort revocation; already-invalid tokens are ignored
    }
    return { ok: true }
  }

  async me(auth: AuthContext): Promise<SessionTokens['user']> {
    const profile = await this.db.withTenant(auth.schemaName, async (db) => {
      const [user] = await db.select().from(users).where(eq(users.id, auth.userId)).limit(1)
      if (!user) return null
      const roleRows = await db
        .select({ key: roles.key, permissions: roles.permissions })
        .from(userBranchRoles)
        .innerJoin(roles, eq(userBranchRoles.roleId, roles.id))
        .where(eq(userBranchRoles.userId, user.id))
      return { user, roleRows }
    })
    if (!profile) throw new UnauthorizedException('UNAUTHORIZED')

    const { rows } = await this.db.pool.query<Pick<TenantRow, 'id' | 'name' | 'clinic_type'>>(
      `SELECT id, name, clinic_type FROM public.tenants WHERE id = $1`,
      [auth.tenantId],
    )
    const tenant = rows[0]

    return {
      id: profile.user.id,
      fullName: profile.user.fullName,
      phone: profile.user.phone,
      specialty: profile.user.specialty,
      roles: [...new Set(profile.roleRows.map((r) => r.key))],
      permissions: [...new Set(profile.roleRows.flatMap((r) => r.permissions))],
      clinic: {
        id: tenant?.id ?? auth.tenantId,
        name: tenant?.name ?? '',
        slug: auth.slug,
        clinicType: tenant?.clinic_type ?? 'general',
      },
    }
  }
}
