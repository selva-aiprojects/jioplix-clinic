import { Injectable } from '@nestjs/common'
import { asc, eq } from 'drizzle-orm'
import { DbService } from '../db/db.service.js'
import { users, userBranchRoles, roles } from '../db/schema/tenant.js'

export interface TeamMember {
  id: string
  fullName: string
  phone: string
  email: string | null
  specialty: string | null
  status: string
  roles: string[]
}

@Injectable()
export class TeamService {
  constructor(private readonly db: DbService) {}

  async list(schemaName: string): Promise<TeamMember[]> {
    return this.db.withTenant(schemaName, async (db) => {
      const rows = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          phone: users.phone,
          email: users.email,
          specialty: users.specialty,
          status: users.status,
          roleName: roles.name,
        })
        .from(users)
        .innerJoin(userBranchRoles, eq(userBranchRoles.userId, users.id))
        .innerJoin(roles, eq(roles.id, userBranchRoles.roleId))
        .orderBy(asc(users.fullName))

      const map = new Map<string, TeamMember>()
      for (const r of rows) {
        let member = map.get(r.id)
        if (!member) {
          member = {
            id: r.id,
            fullName: r.fullName,
            phone: r.phone,
            email: r.email,
            specialty: r.specialty,
            status: r.status,
            roles: [],
          }
          map.set(r.id, member)
        }
        member.roles.push(r.roleName)
      }
      return [...map.values()]
    })
  }
}
