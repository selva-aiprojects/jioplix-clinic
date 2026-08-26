import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { sql } from 'drizzle-orm'
import { createHash, randomBytes } from 'node:crypto'
import { newId } from '@jioplix/contracts'
import { DbService } from '../db/db.service.js'
import { hashPassword } from '../auth/password.util.js'
import { MailerService } from '../mailer/mailer.service.js'

interface ResetTokenRow {
  id: string
  user_email: string
  token_hash: string
  expires_at: Date
  used: boolean
}

interface UserRow {
  id: string
  email: string
  full_name: string
  password_hash: string
}

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name)

  constructor(
    private readonly db: DbService,
    private readonly mailer: MailerService,
  ) {}

  async requestReset(email: string, baseUrl: string): Promise<{ sent: boolean }> {
    const { rows: platformUsers } = await this.db.pool.query<UserRow>(
      `SELECT id, email, full_name, password_hash FROM public.platform_users WHERE email = $1`,
      [email],
    )

    if (platformUsers.length === 0) {
      this.logger.log(`[PASSWORD RESET] No user found for ${email} — silently succeeding`)
      return { sent: true }
    }

    const user = platformUsers[0]

    await this.db.pool.query(
      `UPDATE public.password_reset_tokens SET used = true WHERE user_email = $1 AND used = false`,
      [email],
    )

    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await this.db.pool.query(
      `INSERT INTO public.password_reset_tokens (id, user_email, user_type, token_hash, expires_at)
       VALUES ($1, $2, 'platform', $3, $4)`,
      [newId(), email, tokenHash, expiresAt],
    )

    const resetLink = `${baseUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`

    await this.mailer.sendPasswordResetEmail({
      to: email,
      userName: user.full_name,
      resetLink,
    })

    this.logger.log(`[PASSWORD RESET] Reset email sent to ${email}`)
    return { sent: true }
  }

  async resetPassword(token: string, email: string, newPassword: string): Promise<{ success: boolean }> {
    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters')
    }

    const tokenHash = createHash('sha256').update(token).digest('hex')

    const { rows } = await this.db.pool.query<ResetTokenRow>(
      `SELECT id, user_email, token_hash, expires_at, used
       FROM public.password_reset_tokens
       WHERE user_email = $1 AND used = false
       ORDER BY created_at DESC LIMIT 1`,
      [email],
    )

    const row = rows[0]
    if (!row) throw new BadRequestException('INVALID_TOKEN')
    if (row.token_hash !== tokenHash) throw new BadRequestException('INVALID_TOKEN')
    if (new Date(row.expires_at) < new Date()) throw new BadRequestException('TOKEN_EXPIRED')

    await this.db.pool.query(
      `UPDATE public.password_reset_tokens SET used = true WHERE id = $1`,
      [row.id],
    )

    const newHash = await hashPassword(newPassword)
    await this.db.pool.query(
      `UPDATE public.platform_users SET password_hash = $1 WHERE email = $2`,
      [newHash, email],
    )

    this.logger.log(`[PASSWORD RESET] Password reset for ${email}`)
    return { success: true }
  }

  async resetTenantUserPassword(
    tenantId: string,
    userEmail: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters')
    }

    const schemaName = await this.getTenantSchema(tenantId)
    if (!schemaName) throw new BadRequestException('TENANT_NOT_FOUND')

    const newHash = await hashPassword(newPassword)

    const result = await this.db.withTenant(schemaName, async (db) => {
      const r = await db.execute(sql`
        UPDATE users SET password_hash = ${newHash} WHERE email = ${userEmail} RETURNING id
      `)
      return r
    })

    if (result.rows.length === 0) throw new BadRequestException('USER_NOT_FOUND')

    this.logger.log(`[PASSWORD RESET] Admin reset password for ${userEmail} in tenant ${tenantId}`)
    return { success: true }
  }

  async getTenantUsers(tenantId: string): Promise<Array<{
    id: string; fullName: string; email: string; phone: string; roles: string[]; status: string;
  }>> {
    const schemaName = await this.getTenantSchema(tenantId)
    if (!schemaName) return []

    const result: Array<{ id: string; fullName: string; email: string; phone: string; roles: string[]; status: string }> = []

    await this.db.withTenant(schemaName, async (db) => {
      const usersResult = await db.execute(sql`
        SELECT id, full_name, email, phone, status FROM users WHERE is_deleted = false ORDER BY full_name
      `)
      const users = usersResult.rows as Array<{ id: string; full_name: string; email: string; phone: string; status: string }>

      for (const u of users) {
        const rolesResult = await db.execute(sql`
          SELECT r.key AS role_key
          FROM user_branch_roles ubr
          JOIN roles r ON r.id = ubr.role_id
          WHERE ubr.user_id = ${u.id}
        `)
        const roles = [...new Set((rolesResult.rows as Array<{ role_key: string }>).map(r => r.role_key))]
        result.push({
          id: u.id,
          fullName: u.full_name,
          email: u.email,
          phone: u.phone,
          roles,
          status: u.status,
        })
      }
    })

    return result
  }

  private async getTenantSchema(tenantId: string): Promise<string | null> {
    const { rows } = await this.db.pool.query<{ schema_name: string }>(
      `SELECT schema_name FROM public.tenants WHERE id = $1`,
      [tenantId],
    )
    return rows[0]?.schema_name ?? null
  }
}
