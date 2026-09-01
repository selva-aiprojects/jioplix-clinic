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

interface InventorySeedItem {
  name: string
  category: 'medicines' | 'consumables' | 'dental_materials' | 'clinic_supplies' | 'equipment'
  unit: string
  qty: number
  reorder: number
  pricePaise: number
  supplier: string
  batch: string
  expiresInDays?: number
}

// Baseline general-medicine stock every clinic keeps on hand.
const GENERAL_INVENTORY: InventorySeedItem[] = [
  { name: 'Paracetamol 650mg Tablet (Strip of 10)', category: 'medicines', unit: 'strips', qty: 240, reorder: 60, pricePaise: 1500, supplier: 'Cipla', batch: 'PCM-26A1', expiresInDays: 500 },
  { name: 'Ibuprofen 400mg Tablet (Strip of 10)', category: 'medicines', unit: 'strips', qty: 150, reorder: 40, pricePaise: 1800, supplier: 'Sun Pharma', batch: 'IBU-2604', expiresInDays: 420 },
  { name: 'Cetirizine 10mg Tablet (Strip of 10)', category: 'medicines', unit: 'strips', qty: 200, reorder: 50, pricePaise: 1200, supplier: "Dr Reddy's", batch: 'CTZ-2612', expiresInDays: 480 },
  { name: 'Amoxicillin 500mg Capsule (Strip of 10)', category: 'medicines', unit: 'strips', qty: 120, reorder: 30, pricePaise: 2400, supplier: 'Cipla', batch: 'AMX-2606', expiresInDays: 300 },
  { name: 'Omeprazole 20mg Capsule (Strip of 10)', category: 'medicines', unit: 'strips', qty: 90, reorder: 30, pricePaise: 1800, supplier: 'Zydus', batch: 'OMP-2610', expiresInDays: 430 },
  { name: 'Azithromycin 500mg Tablet (Strip of 3)', category: 'medicines', unit: 'strips', qty: 60, reorder: 20, pricePaise: 4800, supplier: 'Abbott', batch: 'AZT-2608', expiresInDays: 350 },
  { name: 'ORS Powder Sachet (21.8g)', category: 'medicines', unit: 'sachets', qty: 300, reorder: 80, pricePaise: 2000, supplier: 'FDC', batch: 'ORS-2603', expiresInDays: 220 },
  { name: 'Diclofenac Gel 1% (30g)', category: 'medicines', unit: 'tubes', qty: 45, reorder: 15, pricePaise: 9500, supplier: 'Novartis', batch: 'DCF-2611', expiresInDays: 450 },
  { name: 'Nitrile Examination Gloves (Box of 100)', category: 'consumables', unit: 'boxes', qty: 25, reorder: 10, pricePaise: 45000, supplier: 'Medline', batch: 'GLV-2602' },
  { name: 'Disposable Syringe 5ml (Box of 100)', category: 'consumables', unit: 'boxes', qty: 20, reorder: 8, pricePaise: 35000, supplier: 'Dispovan', batch: 'SYR-2802', expiresInDays: 550 },
  { name: 'Sterile Gauze Pads (Pack of 10)', category: 'consumables', unit: 'packs', qty: 60, reorder: 20, pricePaise: 8500, supplier: 'Datt Mediphans', batch: 'GAZ-2901', expiresInDays: 900 },
  { name: 'Surgical Face Mask 3-Ply (Box of 50)', category: 'consumables', unit: 'boxes', qty: 30, reorder: 10, pricePaise: 25000, supplier: 'Romsons', batch: 'MSK-2705', expiresInDays: 630 },
  { name: 'Povidone-Iodine Solution 100ml', category: 'consumables', unit: 'bottles', qty: 12, reorder: 15, pricePaise: 12000, supplier: 'Win-Medicare', batch: 'PID-2707', expiresInDays: 330 },
]

// Specialty additions layered on top of the baseline per clinic type.
const SPECIALTY_INVENTORY: Record<string, InventorySeedItem[]> = {
  pediatric: [
    { name: 'Paracetamol Syrup 100mg/ml (60ml)', category: 'medicines', unit: 'bottles', qty: 80, reorder: 25, pricePaise: 4500, supplier: 'GSK', batch: 'PCS-2704', expiresInDays: 320 },
    { name: 'Ibuprofen Suspension 100mg/5ml (60ml)', category: 'medicines', unit: 'bottles', qty: 60, reorder: 20, pricePaise: 5200, supplier: 'Wockhardt', batch: 'IBS-26A5', expiresInDays: 48 },
    { name: 'Amoxicillin Dry Syrup 125mg/5ml', category: 'medicines', unit: 'bottles', qty: 40, reorder: 15, pricePaise: 6800, supplier: 'Cipla', batch: 'AMD-2702', expiresInDays: 160 },
    { name: 'Vitamin D3 Drops 60000 IU (15ml)', category: 'medicines', unit: 'bottles', qty: 35, reorder: 12, pricePaise: 28000, supplier: 'Sanofi', batch: 'VTD-2709', expiresInDays: 410 },
    { name: 'Calcium + Vitamin D3 Syrup (200ml)', category: 'medicines', unit: 'bottles', qty: 28, reorder: 30, pricePaise: 16500, supplier: 'Zydus', batch: 'CAD-26B7', expiresInDays: 74 },
    { name: 'Vitamin C Chewable Tablets (Pack of 15)', category: 'medicines', unit: 'packs', qty: 0, reorder: 20, pricePaise: 9500, supplier: 'Mankind', batch: 'VTC-2601', expiresInDays: 200 },
    { name: 'Digital Thermometer', category: 'equipment', unit: 'units', qty: 10, reorder: 4, pricePaise: 19900, supplier: 'Omron', batch: 'THM-2601' },
    { name: 'Baby Weighing Scale', category: 'equipment', unit: 'units', qty: 3, reorder: 1, pricePaise: 245000, supplier: 'Dr Trust', batch: 'BWS-2601' },
  ],
  dental: [
    { name: 'Lidocaine 2% + Adrenaline Cartridge (Box of 50)', category: 'dental_materials', unit: 'boxes', qty: 15, reorder: 6, pricePaise: 42000, supplier: 'Septodont', batch: 'LID-2701', expiresInDays: 130 },
    { name: 'Articaine 4% Cartridge (Box of 50)', category: 'dental_materials', unit: 'boxes', qty: 12, reorder: 5, pricePaise: 48000, supplier: 'Septodont', batch: 'ART-26C3', expiresInDays: 48 },
    { name: 'Chlorhexidine Mouthwash 150ml', category: 'medicines', unit: 'bottles', qty: 50, reorder: 15, pricePaise: 13500, supplier: 'ICPA', batch: 'CHX-2708', expiresInDays: 340 },
    { name: 'Metronidazole 400mg Tablet (Strip of 10)', category: 'medicines', unit: 'strips', qty: 100, reorder: 30, pricePaise: 1400, supplier: 'Alkem', batch: 'MTZ-2705', expiresInDays: 250 },
    { name: 'Amoxicillin + Clavulanate 625mg Tablet', category: 'medicines', unit: 'strips', qty: 70, reorder: 20, pricePaise: 12800, supplier: 'GSK', batch: 'AMC-2703', expiresInDays: 190 },
    { name: 'Light-Cure Composite Syringe A2', category: 'dental_materials', unit: 'units', qty: 8, reorder: 3, pricePaise: 185000, supplier: 'Ivoclar', batch: 'CMP-2710', expiresInDays: 430 },
    { name: 'Prophylaxis Polishing Cups', category: 'dental_materials', unit: 'packs', qty: 0, reorder: 10, pricePaise: 5500, supplier: 'Prime Dental', batch: 'PPC-2601' },
    { name: 'Cotton Rolls (Pack of 100)', category: 'consumables', unit: 'packs', qty: 55, reorder: 20, pricePaise: 6500, supplier: 'Prime Dental', batch: 'CTR-2601' },
  ],
  dermatology: [
    { name: 'Hydrocortisone Cream 1% (15g)', category: 'medicines', unit: 'tubes', qty: 70, reorder: 20, pricePaise: 5500, supplier: 'Glenmark', batch: 'HYC-2707', expiresInDays: 330 },
    { name: 'Clotrimazole Cream 1% (15g)', category: 'medicines', unit: 'tubes', qty: 90, reorder: 30, pricePaise: 3800, supplier: 'Bayer', batch: 'CLT-2711', expiresInDays: 460 },
    { name: 'Isotretinoin 20mg Capsule (Strip of 10)', category: 'medicines', unit: 'strips', qty: 45, reorder: 15, pricePaise: 9500, supplier: 'Abbott', batch: 'ISO-2702', expiresInDays: 160 },
    { name: 'Doxycycline 100mg Tablet (Strip of 10)', category: 'medicines', unit: 'strips', qty: 80, reorder: 25, pricePaise: 2200, supplier: 'Mankind', batch: 'DOX-26B5', expiresInDays: 74 },
    { name: 'Tacrolimus Ointment 0.1% (10g)', category: 'medicines', unit: 'tubes', qty: 18, reorder: 6, pricePaise: 48500, supplier: 'Glenmark', batch: 'TAC-2712', expiresInDays: 500 },
    { name: 'Minoxidil Solution 5% (60ml)', category: 'medicines', unit: 'bottles', qty: 22, reorder: 8, pricePaise: 58000, supplier: "Dr Reddy's", batch: 'MNX-2709', expiresInDays: 400 },
    { name: 'Sunscreen Gel SPF 50 (50g)', category: 'medicines', unit: 'tubes', qty: 40, reorder: 12, pricePaise: 29500, supplier: 'Glenmark', batch: 'SUN-26A9', expiresInDays: 48 },
    { name: 'Coal Tar Shampoo (100ml)', category: 'medicines', unit: 'bottles', qty: 0, reorder: 10, pricePaise: 16500, supplier: 'Cipla', batch: 'CTS-2601', expiresInDays: 210 },
  ],
  general: [
    { name: 'Metformin 500mg Tablet (Strip of 20)', category: 'medicines', unit: 'strips', qty: 200, reorder: 60, pricePaise: 1300, supplier: 'USV', batch: 'MET-2710', expiresInDays: 430 },
    { name: 'Amlodipine 5mg Tablet (Strip of 15)', category: 'medicines', unit: 'strips', qty: 150, reorder: 45, pricePaise: 1900, supplier: 'Cipla', batch: 'AML-2708', expiresInDays: 340 },
    { name: 'Atorvastatin 10mg Tablet (Strip of 15)', category: 'medicines', unit: 'strips', qty: 120, reorder: 40, pricePaise: 3400, supplier: 'Zydus', batch: 'ATV-2704', expiresInDays: 230 },
    { name: 'Pantoprazole 40mg Tablet (Strip of 15)', category: 'medicines', unit: 'strips', qty: 140, reorder: 40, pricePaise: 2900, supplier: 'Alkem', batch: 'PAN-2706', expiresInDays: 300 },
    { name: 'Salbutamol Inhaler 200 MD', category: 'medicines', unit: 'units', qty: 25, reorder: 8, pricePaise: 14500, supplier: 'Cipla', batch: 'SLB-2701', expiresInDays: 130 },
    { name: 'Insulin Glargine 100IU Pen (3ml)', category: 'medicines', unit: 'pens', qty: 12, reorder: 5, pricePaise: 98500, supplier: 'Sanofi', batch: 'INS-2703', expiresInDays: 190 },
    { name: 'Tetanus Toxoid Ampoule 0.5ml', category: 'medicines', unit: 'ampoules', qty: 30, reorder: 10, pricePaise: 3500, supplier: 'Serum Institute', batch: 'TTX-26B5', expiresInDays: 74 },
    { name: 'Nebulizer Mask Kit (Adult, Pack of 5)', category: 'consumables', unit: 'packs', qty: 0, reorder: 10, pricePaise: 12500, supplier: 'Romsons', batch: 'NBK-2601' },
  ],
}

function isoInDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

async function seedInventoryForClinic(
  client: import('pg').PoolClient,
  clinicType: string,
): Promise<void> {
  const items = [...GENERAL_INVENTORY, ...(SPECIALTY_INVENTORY[clinicType] ?? SPECIALTY_INVENTORY.general)]
  for (const it of items) {
    await client.query(
      `INSERT INTO inventory_items
         (id, name, category, unit, quantity, reorder_level, unit_price_paise, supplier, batch_no, expiry_date)
       SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
       WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE name = $2)`,
      [
        randomUUID(),
        it.name,
        it.category,
        it.unit,
        it.qty,
        it.reorder,
        it.pricePaise,
        it.supplier,
        it.batch,
        it.expiresInDays != null ? isoInDays(it.expiresInDays) : null,
      ],
    )
  }
}

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
      const email = `${u.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '')}@${schemaName}.demo.jioplix`
      await client.query(
        `INSERT INTO users (id, full_name, phone, email, specialty, password_hash) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (phone) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           email = COALESCE(users.email, EXCLUDED.email)`,
        [id, u.fullName, u.phone, email, u.specialty ?? null, passwordHash],
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

    await seedInventoryForClinic(client, clinicType)

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
