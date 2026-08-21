import { randomBytes, randomUUID, scrypt as scryptCb } from 'node:crypto'
import { promisify } from 'node:util'
import type { Pool } from 'pg'

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

export const DEMO_PASSWORD = 'demo1234'

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

interface DemoUser {
  fullName: string
  phone: string
  roleKey: string
  specialty?: string
}

const DOCTORS: DemoUser[] = [
  { fullName: 'Dr. Priya Sharma', phone: '+919800000101', roleKey: 'doctor', specialty: 'General Medicine' },
  { fullName: 'Dr. Anand Verma', phone: '+919800000102', roleKey: 'doctor', specialty: 'Cardiology' },
  { fullName: 'Dr. Kavitha Menon', phone: '+919800000103', roleKey: 'doctor', specialty: 'Pediatrics' },
  { fullName: 'Dr. Rahul Joshi', phone: '+919800000104', roleKey: 'doctor', specialty: 'Orthopedics' },
]

const STAFF: DemoUser[] = [
  { fullName: 'Ramesh Gupta', phone: '+919800000201', roleKey: 'receptionist' },
  { fullName: 'Sunita Rao', phone: '+919800000202', roleKey: 'pharmacist' },
  { fullName: 'Vijay Kumar', phone: '+919800000203', roleKey: 'lab_technician' },
  { fullName: 'Lakshmi Iyer', phone: '+919800000204', roleKey: 'accountant' },
]

function staffForPlan(plan: string): DemoUser[] {
  switch (plan) {
    case 'starter':
      return [STAFF[0]]
    case 'professional':
      return [STAFF[0], STAFF[1], STAFF[2]]
    case 'clinic':
      return STAFF.slice(0, 4)
    default:
      return STAFF
  }
}

function doctorsForPlan(plan: string): DemoUser[] {
  switch (plan) {
    case 'starter':
      return DOCTORS.slice(0, 1)
    case 'professional':
      return DOCTORS.slice(0, 2)
    case 'clinic':
      return DOCTORS.slice(0, 3)
    default:
      return DOCTORS
  }
}

const DEMO_PATIENTS = [
  { firstName: 'Ananya', lastName: 'Sharma', gender: 'F', age: 52, phone: '+919810010001', bloodGroup: 'A+', abha: '12-3456-7890-1234' },
  { firstName: 'Rajesh', lastName: 'Kumar', gender: 'M', age: 45, phone: '+919810010002', bloodGroup: 'B+', abha: null },
  { firstName: 'Vikram', lastName: 'Singh', gender: 'M', age: 38, phone: '+919810010003', bloodGroup: 'O+', abha: null },
  { firstName: 'Meera', lastName: 'Patel', gender: 'F', age: 29, phone: '+919810010004', bloodGroup: 'AB+', abha: '23-4567-8901-2345' },
  { firstName: 'Suresh', lastName: 'Reddy', gender: 'M', age: 61, phone: '+919810010005', bloodGroup: 'O-', abha: null },
  { firstName: 'Kavita', lastName: 'Nair', gender: 'F', age: 34, phone: '+919810010006', bloodGroup: 'A-', abha: null },
  { firstName: 'Arjun', lastName: 'Mehta', gender: 'M', age: 8, phone: '+919810010007', bloodGroup: 'B-', abha: null },
  { firstName: 'Lakshmi', lastName: 'Venkatesh', gender: 'F', age: 47, phone: '+919810010008', bloodGroup: 'AB-', abha: '34-5678-9012-3456' },
]

const APPOINTMENT_FLOW = [
  { hour: 9, status: 'completed', queueStatus: 'completed', source: 'online' },
  { hour: 10, status: 'in_consultation', queueStatus: 'consulting', source: 'walk_in' },
  { hour: 11, status: 'checked_in', queueStatus: 'checked_in', source: 'whatsapp' },
  { hour: 12, status: 'scheduled', queueStatus: 'waiting', source: 'phone' },
] as const

export const DEMO_CLINIC_TYPES: Record<string, { type: string; name: string }> = {
  sunrise: { type: 'dental', name: 'Sunrise Dental Clinic' },
  nova: { type: 'pediatric', name: "Nova Children's Clinic" },
  apex: { type: 'dermatology', name: 'Apex Skin & Aesthetics' },
  medicore: { type: 'general', name: 'MediCore Multispecialty Hospital' },
}

export async function seedDemoData(
  pool: Pool,
  schemaName: string,
  planCode: string,
  clinicType = 'general',
  tenantName?: string,
): Promise<void> {
  await pool.query(
    `UPDATE public.tenants SET clinic_type = $1, name = COALESCE($2, name) WHERE schema_name = $3`,
    [clinicType, tenantName ?? null, schemaName],
  )

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`SELECT set_config('search_path', $1, true)`, [`"${schemaName}",public`])

    const branch = await client.query<{ id: string }>(`SELECT id FROM branches ORDER BY created_at LIMIT 1`)
    const branchId = branch.rows[0].id

    const roleRows = await client.query<{ id: string; key: string }>(`SELECT id, key FROM roles`)
    const roleId = (key: string) => roleRows.rows.find((r) => r.key === key)!.id

    const doctors = doctorsForPlan(planCode)
    const staff = staffForPlan(planCode)
    const passwordHash = await hashPassword(DEMO_PASSWORD)

    const doctorIds: string[] = []
    for (const u of [...doctors, ...staff]) {
      const id = randomUUID()
      if (doctors.includes(u)) doctorIds.push(id)
      await client.query(
        `INSERT INTO users (id, full_name, phone, specialty, password_hash) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (phone) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
        [id, u.fullName, u.phone, u.specialty ?? null, passwordHash],
      )
      const userId = (
        await client.query<{ id: string }>(`SELECT id FROM users WHERE phone = $1`, [u.phone])
      ).rows[0].id
      await client.query(
        `INSERT INTO user_branch_roles (user_id, branch_id, role_id) VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [userId, branchId, roleId(u.roleKey)],
      )
    }

    const patientIds: string[] = []
    for (const p of DEMO_PATIENTS) {
      const id = randomUUID()
      patientIds.push(id)
      const dob = new Date(new Date().getFullYear() - p.age, 3, 12).toISOString().slice(0, 10)
      await client.query(
        `INSERT INTO patients (id, mrn, first_name, last_name, date_of_birth, gender, phone, blood_group, abha_number)
         SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9
         WHERE NOT EXISTS (SELECT 1 FROM patients WHERE phone = $7)`,
        [
          id,
          `JXP-${id.replace(/-/g, '').slice(-12).toUpperCase()}`,
          p.firstName,
          p.lastName,
          dob,
          p.gender,
          p.phone,
          p.bloodGroup,
          p.abha,
        ],
      )
      const existingId = (
        await client.query<{ id: string }>(`SELECT id FROM patients WHERE phone = $1`, [p.phone])
      ).rows[0]
      if (existingId) patientIds[patientIds.length - 1] = existingId.id
    }

    if (patientIds[1]) {
      await client.query(
        `INSERT INTO patient_allergies (id, patient_id, allergen, severity)
         SELECT $1, $2, 'Aspirin', 'severe'
         WHERE NOT EXISTS (
           SELECT 1 FROM patient_allergies WHERE patient_id = $2 AND allergen = 'Aspirin'
         )`,
        [randomUUID(), patientIds[1]],
      )
    }

    const today = new Date()
    let token = 11
    const existingAppts = await client.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM appointments WHERE branch_id = $1 AND scheduled_at >= date_trunc('day', now())`,
      [branchId],
    )
    if (existingAppts.rows[0].count === 0) {
      for (let d = 0; d < doctorIds.length; d++) {
        for (let s = 0; s < APPOINTMENT_FLOW.length; s++) {
          const flow = APPOINTMENT_FLOW[s]
          const patientId = patientIds[(d * APPOINTMENT_FLOW.length + s) % patientIds.length]
          const apptId = randomUUID()
          const scheduledAt = new Date(today)
          scheduledAt.setHours(flow.hour, s * 15, 0, 0)

          await client.query(
            `INSERT INTO appointments (id, patient_id, branch_id, doctor_id, scheduled_at, source, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [apptId, patientId, branchId, doctorIds[d], scheduledAt.toISOString(), flow.source, flow.status],
          )
          await client.query(
            `INSERT INTO queue_tokens (id, appointment_id, branch_id, doctor_id, patient_id, queue_date, token_no, status)
             VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7)
             ON CONFLICT DO NOTHING`,
            [randomUUID(), apptId, branchId, doctorIds[d], patientId, token++, flow.queueStatus],
          )
        }
      }
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
