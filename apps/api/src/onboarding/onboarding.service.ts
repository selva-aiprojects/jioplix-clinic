import { Injectable } from '@nestjs/common'
import { sql } from 'drizzle-orm'
import { newId } from '@jioplix/contracts'
import { DbService } from '../db/db.service.js'

export interface ClinicProfileInput {
  clinicName: string
  clinicType: string
  address: string
  phone: string
  email: string
}

export interface DoctorInput {
  name: string
  specialty: string
  phone: string
  email: string
}

export interface ReceptionistInput {
  name: string
  phone: string
}

export interface OnboardingCompleteInput {
  clinicProfile: ClinicProfileInput
  doctor: DoctorInput
  receptionist: ReceptionistInput
  addons: string[]
}

interface OnboardingRow {
  tenant_id: string
  completed: boolean
  clinic_profile: Record<string, unknown>
}

@Injectable()
export class OnboardingService {
  constructor(private readonly db: DbService) {}

  async getStatus(tenantId: string): Promise<{ completed: boolean }> {
    const { rows } = await this.db.pool.query<OnboardingRow>(
      `SELECT tenant_id, completed, clinic_profile
       FROM public.tenant_onboarding WHERE tenant_id = $1`,
      [tenantId],
    )
    return { completed: rows[0]?.completed ?? false }
  }

  async complete(tenantId: string, input: OnboardingCompleteInput): Promise<{ completed: boolean }> {
    await this.db.pool.query(
      `INSERT INTO public.tenant_onboarding (tenant_id, completed, clinic_profile, updated_at)
       VALUES ($1, true, $2, now())
       ON CONFLICT (tenant_id) DO UPDATE SET completed = true, clinic_profile = $2, updated_at = now()`,
      [tenantId, JSON.stringify(input.clinicProfile)],
    )

    // Create doctor user if provided
    if (input.doctor.name && input.doctor.phone) {
      const tenant = await this.getTenantSchema(tenantId)
      if (tenant) {
        const doctorId = newId()
        await this.db.withTenant(tenant, async (db) => {
          await db.execute(sql`
            INSERT INTO users (id, full_name, phone, email, specialty, status)
            VALUES (${doctorId}, ${input.doctor.name}, ${input.doctor.phone}, ${input.doctor.email || null}, ${input.doctor.specialty || null}, 'active')
            ON CONFLICT (phone) DO UPDATE SET
              full_name = EXCLUDED.full_name,
              email = EXCLUDED.email,
              specialty = EXCLUDED.specialty
          `)
          await db.execute(sql`
            INSERT INTO user_branch_roles (user_id, branch_id, role_id)
            SELECT ${doctorId}, b.id, r.id
            FROM branches b, roles r
            WHERE r.key = 'doctor'
            ON CONFLICT DO NOTHING
          `)
        })
      }
    }

    // Create receptionist user if provided
    if (input.receptionist.name && input.receptionist.phone) {
      const tenant = await this.getTenantSchema(tenantId)
      if (tenant) {
        const receptionistId = newId()
        await this.db.withTenant(tenant, async (db) => {
          await db.execute(sql`
            INSERT INTO users (id, full_name, phone, status)
            VALUES (${receptionistId}, ${input.receptionist.name}, ${input.receptionist.phone}, 'active')
            ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name
          `)
          await db.execute(sql`
            INSERT INTO user_branch_roles (user_id, branch_id, role_id)
            SELECT ${receptionistId}, b.id, r.id
            FROM branches b, roles r
            WHERE r.key = 'receptionist'
            ON CONFLICT DO NOTHING
          `)
        })
      }
    }

    // Update addon entitlements
    if (input.addons.length > 0) {
      const tenant = await this.getTenantSchema(tenantId)
      if (tenant) {
        await this.db.withTenant(tenant, async (db) => {
          const allModules = ['pharmacy', 'laboratory', 'inventory', 'procedures', 'multi_branch']
          for (const mod of allModules) {
            await db.execute(sql`
              UPDATE addon_entitlements SET enabled = ${input.addons.includes(mod)}
              WHERE module_code = ${mod}
            `)
          }
        })
      }
    }

    return { completed: true }
  }

  async saveClinicProfile(
    tenantId: string,
    profile: ClinicProfileInput,
  ): Promise<{ saved: boolean }> {
    await this.db.pool.query(
      `INSERT INTO public.tenant_onboarding (tenant_id, clinic_profile, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (tenant_id) DO UPDATE SET clinic_profile = $2, updated_at = now()`,
      [tenantId, JSON.stringify(profile)],
    )
    return { saved: true }
  }

  async inviteUser(
    tenantId: string,
    user: { name: string; phone: string; role: string },
  ): Promise<{ invited: boolean }> {
    const tenant = await this.getTenantSchema(tenantId)
    if (!tenant) return { invited: false }

    const userId = newId()
    await this.db.withTenant(tenant, async (db) => {
      await db.execute(sql`
        INSERT INTO users (id, full_name, phone, status)
        VALUES (${userId}, ${user.name}, ${user.phone}, 'active')
        ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name
      `)
      await db.execute(sql`
        INSERT INTO user_branch_roles (user_id, branch_id, role_id)
        SELECT ${userId}, b.id, r.id
        FROM branches b, roles r
        WHERE r.key = ${user.role}
        ON CONFLICT DO NOTHING
      `)
    })

    return { invited: true }
  }

  private async getTenantSchema(tenantId: string): Promise<string | null> {
    const { rows } = await this.db.pool.query<{ schema_name: string }>(
      `SELECT schema_name FROM public.tenants WHERE id = $1`,
      [tenantId],
    )
    return rows[0]?.schema_name ?? null
  }
}
