import { spawn, execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const results = []
let apiProcess = null

function loadEnv() {
  const path = join(root, '.env')
  if (!existsSync(path)) return {}
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  )
}
const env = loadEnv()
const DATABASE_URL = process.env.DATABASE_URL || env.DATABASE_URL
const PORT = 3100
const BASE = `http://localhost:${PORT}/api/v1`
const DEMO_PW = 'demo1234'

function pgConnectionOptions(connectionString) {
  const url = new URL(connectionString)
  const mode = url.searchParams.get('sslmode')
  url.searchParams.delete('sslmode')
  if (mode === 'verify-ca' || mode === 'verify-full') {
    return { connectionString: url.toString(), ssl: { rejectUnauthorized: true } }
  }
  return { connectionString: url.toString(), ssl: { rejectUnauthorized: false } }
}
const pgPool = new Pool(pgConnectionOptions(DATABASE_URL))
const psql = async (sql) => {
  const client = await pgPool.connect()
  try {
    const res = await client.query(sql)
    if (res.rows.length === 0) return ''
    if (res.rows.length === 1 && Object.keys(res.rows[0]).length === 1) {
      return String(res.rows[0][Object.keys(res.rows[0])[0]])
    }
    return res.rows.map(r => String(Object.values(r)[0])).join('\n')
  } finally {
    client.release()
  }
}

const schemaBySlug = async (slug) => await psql(`SELECT schema_name FROM public.tenants WHERE slug='${slug}'`)

const tenantSchemas = async () =>
  (await psql("SELECT schema_name FROM public.tenants WHERE status='active'"))
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)

async function check(name, fn) {
  try {
    await fn()
    results.push({ name, ok: true })
    console.log(`  PASS  ${name}`)
  } catch (err) {
    results.push({ name, ok: false })
    console.log(`  FAIL  ${name}\n        ${err.message}`)
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts)
  let body = null
  try {
    body = await res.json()
  } catch {
    /* empty body */
  }
  return { status: res.status, body }
}

const tokenCache = new Map()
async function login(clinic, phone, password = DEMO_PW) {
  const key = `${clinic}:${phone}:${password}`
  if (tokenCache.has(key)) return tokenCache.get(key)
  const { status, body } = await req('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clinic, phone, password }),
  })
  assert(status === 200, `login ${clinic}/${phone} failed: ${status} ${JSON.stringify(body)}`)
  tokenCache.set(key, body.data)
  return body.data
}

const bearer = (session) => ({ authorization: `Bearer ${session.accessToken}` })

console.log('\n=== Jioplix Smoke Test ===\n')

await check('DB-1  PostgreSQL reachable on :5434', async () => {
  const v = await psql('SELECT version()')
  assert(v.includes('PostgreSQL'), 'no PostgreSQL response')
})

await check('DB-2  Global registry: 4 plans, >=4 seed tenants active', async () => {
  const plans = Number(await psql('SELECT count(*) FROM public.plans'))
  const tenants = Number(await psql("SELECT count(*) FROM public.tenants WHERE status='active'"))
  assert(plans === 4, `expected 4 plans, got ${plans}`)
  assert(tenants >= 4, `expected >=4 active tenants, got ${tenants}`)
})

await check('DB-3  Every tenant schema migrated to 0003_auth', async () => {
  const missing = await psql(
    `SELECT t.slug FROM public.tenants t WHERE NOT EXISTS (
       SELECT 1 FROM information_schema.tables ist
       WHERE ist.table_schema = t.schema_name AND ist.table_name = 'refresh_tokens')`,
  )
  assert(missing === '', `missing refresh_tokens in: ${missing}`)
})

await check('AUTH-0  Demo users have password hashes seeded', async () => {
  const novaSchema = await schemaBySlug('nova')
  const n = Number(
    await psql(`SELECT count(*) FROM ${novaSchema}.users WHERE password_hash LIKE 'scrypt$%'`),
  )
  assert(n >= 5, `expected >=5 hashed passwords in nova, got ${n}`)
})

await check('API-1  Boots and /healthz responds without auth', async () => {
  apiProcess = spawn('node', ['dist/main.js'], {
    cwd: join(root, 'apps', 'api'),
    env: { ...process.env, DATABASE_URL, PORT: String(PORT) },
    stdio: 'ignore',
  })
  let up = false
  for (let i = 0; i < 20 && !up; i++) {
    await new Promise((r) => setTimeout(r, 500))
    try {
      const r = await fetch(`${BASE}/healthz`)
      up = r.status === 200
    } catch {
      /* retry */
    }
  }
  assert(up, 'API did not become healthy in 10s')
})

await check('API-2  /readyz reports database up (public)', async () => {
  const { status, body } = await req('/readyz')
  assert(status === 200 && body.checks?.database === 'up', JSON.stringify(body))
})

await check('AUTH-1  Login nova receptionist -> tokens + permissions + clinic type', async () => {
  const s = await login('nova', '+919800000201')
  assert(s.accessToken?.split('.').length === 3, 'access token not JWT-shaped')
  assert(s.refreshToken?.split('.').length === 3, 'refresh token not JWT-shaped')
  assert(s.user.fullName === 'Ramesh Gupta', `wrong user: ${s.user.fullName}`)
  assert(s.user.permissions.includes('patients:*'), `missing patients:* in ${JSON.stringify(s.user.permissions)}`)
  assert(s.user.clinic.slug === 'nova', 'wrong clinic slug')
  assert(s.user.clinic.clinicType === 'pediatric', `wrong clinic type: ${s.user.clinic.clinicType}`)
})

await check('AUTH-2  Wrong password -> 401 INVALID_CREDENTIALS', async () => {
  const { status, body } = await req('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clinic: 'nova', phone: '+919800000201', password: 'wrong-password' }),
  })
  assert(status === 401, `expected 401, got ${status}`)
  assert(body.error?.code === 'INVALID_CREDENTIALS', JSON.stringify(body))
})

await check('AUTH-3  Unknown clinic slug -> 404 TENANT_NOT_FOUND', async () => {
  const { status, body } = await req('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clinic: 'nonexistent', phone: '+919800000201', password: DEMO_PW }),
  })
  assert(status === 404 && body.error?.code === 'TENANT_NOT_FOUND', JSON.stringify(body))
})

await check('SEC-1  Request without token -> 401 UNAUTHORIZED', async () => {
  const { status, body } = await req('/patients')
  assert(status === 401 && body.error?.code === 'UNAUTHORIZED', JSON.stringify(body))
})

await check('SEC-2  Tampered token -> 401 TOKEN_INVALID', async () => {
  const s = await login('nova', '+919800000201')
  const tampered = s.accessToken.slice(0, -3) + 'xyz'
  const { status, body } = await req('/patients', {
    headers: { authorization: `Bearer ${tampered}` },
  })
  assert(status === 401 && body.error?.code === 'TOKEN_INVALID', JSON.stringify(body))
})

const testPhone = '+919999777777'

await check('API-5  Receptionist lists own tenant patients (nova)', async () => {
  const s = await login('nova', '+919800000201')
  const { status, body } = await req('/patients', { headers: bearer(s) })
  assert(status === 200, `expected 200, got ${status}`)
  assert(body.data.length === 8, `expected 8 patients, got ${body.data.length}`)
  assert(body.data.some((p) => p.firstName === 'Ananya' && p.lastName === 'Sharma'), 'Ananya missing')
})

await check('API-5b GET /patients/:id returns single record', async () => {
  const s = await login('nova', '+919800000201')
  const list = await req('/patients', { headers: bearer(s) })
  const firstId = list.body.data[0].id
  const { status, body } = await req(`/patients/${firstId}`, { headers: bearer(s) })
  assert(status === 200, `expected 200, got ${status}`)
  assert(body.data.id === firstId, 'wrong patient id')
  assert(body.data.firstName === list.body.data[0].firstName, 'firstName mismatch')
})

await check('RBAC-1  Pharmacist denied patient list -> PERMISSION_DENIED', async () => {
  const s = await login('nova', '+919800000202')
  const { status, body } = await req('/patients', { headers: bearer(s) })
  assert(status === 403, `expected 403, got ${status}`)
  assert(body.error?.code === 'PERMISSION_DENIED', JSON.stringify(body))
})

await check('RBAC-2  Doctor allowed patient list (patients:read)', async () => {
  const s = await login('nova', '+919800000101')
  const { status } = await req('/patients', { headers: bearer(s) })
  assert(status === 200, `expected 200, got ${status}`)
})

await check('ISO-2  Spoofed x-tenant-id header ignored — token tenant wins', async () => {
  const s = await login('nova', '+919800000101')
  const { status, body } = await req('/patients', {
    headers: { ...bearer(s), 'x-tenant-id': 'sunrise' },
  })
  assert(status === 200 && Array.isArray(body.data) && body.data.length > 0, JSON.stringify(body))
  const novaSchema = await schemaBySlug('nova')
  const sunriseSchema = await schemaBySlug('sunrise')
  const firstNovaPatient = body.data[0].id
  const inSunrise = Number(await psql(`SELECT count(*) FROM ${sunriseSchema}.patients WHERE id='${firstNovaPatient}'`))
  const inNova = Number(await psql(`SELECT count(*) FROM ${novaSchema}.patients WHERE id='${firstNovaPatient}'`))
  assert(inNova === 1 && inSunrise === 0, 'token/header tenancy mismatch!')
})

await check('ME-1  GET /auth/me returns fresh profile + clinic type', async () => {
  const s = await login('nova', '+919800000201')
  const { status, body } = await req('/auth/me', { headers: bearer(s) })
  assert(status === 200 && body.data.fullName === 'Ramesh Gupta', JSON.stringify(body))
  assert(body.data.clinic.clinicType === 'pediatric', JSON.stringify(body.data.clinic))
})

await check('REFRESH-1  Rotation works; old refresh token single-use', async () => {
  const fresh = await req('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clinic: 'apex', phone: '+919800000201', password: DEMO_PW }),
  })
  assert(fresh.status === 200, 'apex login failed')
  const old = fresh.body.data

  const rotated = await req('/auth/refresh', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken: old.refreshToken }),
  })
  assert(rotated.status === 200, `refresh failed: ${rotated.status} ${JSON.stringify(rotated.body)}`)

  const reuse = await req('/auth/refresh', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken: old.refreshToken }),
  })
  assert(reuse.status === 401 && reuse.body.error?.code === 'TOKEN_INVALID', JSON.stringify(reuse.body))

  const me = await req('/auth/me', { headers: bearer(rotated.body.data) })
  assert(me.status === 200, 'new access token rejected by /me')
})

await check('API-6  POST /patients creates record in caller tenant (sunrise)', async () => {
  const s = await login('sunrise', '+919800000201')
  const { status, body } = await req('/patients', {
    method: 'POST',
    headers: { ...bearer(s), 'content-type': 'application/json' },
    body: JSON.stringify({ firstName: 'Smoke', lastName: 'Test', phone: testPhone, gender: 'O' }),
  })
  assert(status === 200 || status === 201, `got ${status}: ${JSON.stringify(body)}`)
  assert(/^JXP-[0-9A-F]{12}$/.test(body.data?.mrn ?? ''), `bad MRN: ${JSON.stringify(body)}`)
})

await check('API-6b Two rapid creates get DISTINCT MRNs', async () => {
  const s = await login('apex', '+919800000201')
  const mk = (phone) =>
    req('/patients', {
      method: 'POST',
      headers: { ...bearer(s), 'content-type': 'application/json' },
      body: JSON.stringify({ firstName: 'Rapid', lastName: 'Check', phone }),
    })
  const [a, b] = await Promise.all([mk('+919999888801'), mk('+919999888802')])
  assert(a.status < 300 && b.status < 300, `got ${a.status}/${b.status}`)
  assert(a.body.data.mrn !== b.body.data.mrn, `MRN collision: ${a.body.data.mrn}`)
})

await check('ISO-1  New patient exists ONLY in sunrise schema (no cross-tenant leak)', async () => {
  const sunriseSchema = await schemaBySlug('sunrise')
  for (const s of await tenantSchemas()) {
    if (s === sunriseSchema) continue
    const n = Number(await psql(`SELECT count(*) FROM ${s}.patients WHERE phone='${testPhone}'`))
    assert(n === 0, `leak! found test patient in ${s}`)
  }
  const inSunrise = Number(
    await psql(`SELECT count(*) FROM ${sunriseSchema}.patients WHERE phone='${testPhone}'`),
  )
  assert(inSunrise === 1, 'patient missing from sunrise schema')
})

await check('API-7  Invalid patient payload -> VALIDATION_FAILED', async () => {
  const s = await login('apex', '+919800000101')
  const { status, body } = await req('/patients', {
    method: 'POST',
    headers: { ...bearer(s), 'content-type': 'application/json' },
    body: JSON.stringify({ firstName: '', phone: '123' }),
  })
  assert(status === 400 && body.error?.code === 'VALIDATION_FAILED', JSON.stringify(body))
})

const today = new Date().toISOString().slice(0, 10)
const novaSchema = await schemaBySlug('nova')

await check('RBAC-3  Pharmacist denied appointment list', async () => {
  const s = await login('nova', '+919800000202')
  const { status, body } = await req(`/appointments?date=${today}`, { headers: bearer(s) })
  assert(status === 403 && body.error?.code === 'PERMISSION_DENIED', JSON.stringify(body))
})

await check('DOC-1  Doctor reads own schedule (migration 0004 perms)', async () => {
  const s = await login('nova', '+919800000101')
  const { status, body } = await req(`/appointments?date=${today}`, { headers: bearer(s) })
  assert(status === 200 && Array.isArray(body.data), `got ${status}: ${JSON.stringify(body)}`)
})

await check('APPT-1  Receptionist creates appointment for today', async () => {
  const s = await login('nova', '+919800000201')
  const patientId = await psql(`SELECT id FROM ${novaSchema}.patients WHERE first_name='Ananya' LIMIT 1`)
  const doctorId = await psql(`SELECT id FROM ${novaSchema}.users WHERE full_name LIKE 'Dr.%' LIMIT 1`)
  const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  const { status, body } = await req('/appointments', {
    method: 'POST',
    headers: { ...bearer(s), 'content-type': 'application/json' },
    body: JSON.stringify({
      patientId,
      doctorId,
      scheduledAt,
      source: 'phone',
      notes: 'SMOKE_TEST',
    }),
  })
  assert(status < 300, `got ${status}: ${JSON.stringify(body)}`)
  assert(body.data.status === 'scheduled', `wrong status: ${body.data.status}`)
  assert(body.data.patientName.includes('Ananya'), `wrong patient: ${body.data.patientName}`)
})

await check('APPT-2  Today list includes the new appointment', async () => {
  const s = await login('nova', '+919800000201')
  const { status, body } = await req(`/appointments?date=${today}`, { headers: bearer(s) })
  assert(status === 200, `got ${status}`)
  const appt = body.data.find((a) => a.notes === 'SMOKE_TEST')
  assert(appt, 'SMOKE_TEST appointment missing from day list')
})

await check('APPT-3  Check-in issues queue token; invalid transition rejected', async () => {
  const s = await login('nova', '+919800000201')
  const apptId = await psql(`SELECT id FROM ${novaSchema}.appointments WHERE notes='SMOKE_TEST' LIMIT 1`)

  const bad = await req(`/appointments/${apptId}/status`, {
    method: 'PATCH',
    headers: { ...bearer(s), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'completed' }),
  })
  assert(bad.status === 409 && bad.body.error?.code === 'INVALID_TRANSITION', JSON.stringify(bad.body))

  const checkin = await req(`/appointments/${apptId}/status`, {
    method: 'PATCH',
    headers: { ...bearer(s), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'checked_in' }),
  })
  assert(checkin.status === 200, `check-in failed: ${JSON.stringify(checkin.body)}`)
  assert(Number.isInteger(checkin.body.data.tokenNo) && checkin.body.data.tokenNo > 0, 'no token issued')

  const again = await req(`/appointments/${apptId}/status`, {
    method: 'PATCH',
    headers: { ...bearer(s), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'cancelled' }),
  })
  assert(again.status === 200, `cancel failed: ${JSON.stringify(again.body)}`)
})

await check('QUEUE-1  Queue lists token with waiting count; transitions enforced', async () => {
  const s = await login('nova', '+919800000201')
  const { status, body } = await req(`/queue?date=${today}`, { headers: bearer(s) })
  assert(status === 200 && Array.isArray(body.data.tokens), JSON.stringify(body))
  assert(body.data.waiting > 0, 'expected waiting tokens')
  const smokeApptId = await psql(`SELECT id FROM ${novaSchema}.appointments WHERE notes='SMOKE_TEST' LIMIT 1`)
  const smokeToken = body.data.tokens.find((t) => t.appointmentId === smokeApptId)
  assert(smokeToken, 'smoke token not in queue')

  const skip = await req(`/queue/${smokeToken.id}/status`, {
    method: 'PATCH',
    headers: { ...bearer(s), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'skipped' }),
  })
  assert(skip.status === 200 && skip.body.data.status === 'skipped', JSON.stringify(skip.body))

  const requeue = await req(`/queue/${smokeToken.id}/status`, {
    method: 'PATCH',
    headers: { ...bearer(s), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'waiting' }),
  })
  assert(requeue.status === 200, `requeue failed: ${JSON.stringify(requeue.body)}`)

  const illegal = await req(`/queue/${smokeToken.id}/status`, {
    method: 'PATCH',
    headers: { ...bearer(s), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'consulting' }),
  })
  assert(illegal.status === 409 && illegal.body.error?.code === 'INVALID_TRANSITION', JSON.stringify(illegal.body))
})

await check('APPT-4  Unknown patient -> PATIENT_NOT_FOUND', async () => {
  const s = await login('nova', '+919800000201')
  const doctorId = await psql(`SELECT id FROM ${novaSchema}.users WHERE full_name LIKE 'Dr.%' LIMIT 1`)
  const { status, body } = await req('/appointments', {
    method: 'POST',
    headers: { ...bearer(s), 'content-type': 'application/json' },
    body: JSON.stringify({
      patientId: '00000000-0000-4000-8000-000000000000',
      doctorId,
      scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
    }),
  })
  assert(status === 404 && body.error?.code === 'PATIENT_NOT_FOUND', JSON.stringify(body))
})

// ---------- M2: encounters / prescriptions / billing ----------
const m2 = {}

await check('M2-0    Smoke patient created in nova', async () => {
  const s = await login('nova', '+919800000201')
  const { status, body } = await req('/patients', {
    method: 'POST',
    headers: { ...bearer(s), 'content-type': 'application/json' },
    body: JSON.stringify({ firstName: 'SmokeM2', lastName: 'Test', phone: '+919999666666', gender: 'F' }),
  })
  assert(status < 300, `got ${status}: ${JSON.stringify(body)}`)
  m2.patientId = body.data.id
})

await check('ENC-1   Doctor starts encounter from appointment', async () => {
  const receptionist = await login('nova', '+919800000201')
  m2.doctorId = await psql(`SELECT id FROM ${novaSchema}.users WHERE full_name LIKE 'Dr.%' LIMIT 1`)
  const appt = await req('/appointments', {
    method: 'POST',
    headers: { ...bearer(receptionist), 'content-type': 'application/json' },
    body: JSON.stringify({
      patientId: m2.patientId,
      doctorId: m2.doctorId,
      scheduledAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      source: 'walk_in',
      notes: 'SMOKE_TEST',
    }),
  })
  assert(appt.status < 300, `appointment failed: ${JSON.stringify(appt.body)}`)
  await req(`/appointments/${appt.body.data.id}/status`, {
    method: 'PATCH',
    headers: { ...bearer(receptionist), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'checked_in' }),
  })

  const doctor = await login('nova', '+919800000101')
  const enc = await req('/encounters', {
    method: 'POST',
    headers: { ...bearer(doctor), 'content-type': 'application/json' },
    body: JSON.stringify({
      appointmentId: appt.body.data.id,
      patientId: m2.patientId,
      doctorId: m2.doctorId,
      chiefComplaint: 'SMOKE_TEST fever x2 days',
    }),
  })
  assert(enc.status < 300, `got ${enc.status}: ${JSON.stringify(enc.body)}`)
  assert(enc.body.data.isLocked === false, 'new encounter must not be locked')
  m2.encounterId = enc.body.data.id
})

await check('ENC-2   Vitals recorded with BMI computed', async () => {
  const s = await login('nova', '+919800000101')
  const { status, body } = await req(`/encounters/${m2.encounterId}/vitals`, {
    method: 'POST',
    headers: { ...bearer(s), 'content-type': 'application/json' },
    body: JSON.stringify({ bpSystolic: 120, bpDiastolic: 80, pulse: 78, spo2: 98, weightKg: 80, heightCm: 170 }),
  })
  assert(status < 300, `got ${status}: ${JSON.stringify(body)}`)
  const bmi = body.data.bmi
  assert(typeof bmi === 'number' && Math.abs(bmi - 80 / 1.7 ** 2) < 0.1, `bad bmi: ${bmi}`)
})

await check('ENC-3   Diagnosis added (ICD-10)', async () => {
  const s = await login('nova', '+919800000101')
  const { status, body } = await req(`/encounters/${m2.encounterId}/diagnoses`, {
    method: 'POST',
    headers: { ...bearer(s), 'content-type': 'application/json' },
    body: JSON.stringify({ icd10Code: 'R50.9', icd10Name: 'Fever, unspecified', type: 'primary' }),
  })
  assert(status < 300 && body.data.icd10Code === 'R50.9', `got ${status}: ${JSON.stringify(body)}`)
})

await check('RX-1    Prescription draft -> item -> issue -> invalid transition 409', async () => {
  const s = await login('nova', '+919800000101')
  const rx = await req('/prescriptions', {
    method: 'POST',
    headers: { ...bearer(s), 'content-type': 'application/json' },
    body: JSON.stringify({ encounterId: m2.encounterId, patientId: m2.patientId }),
  })
  assert(rx.status < 300 && rx.body.data.status === 'draft', `got ${rx.status}: ${JSON.stringify(rx.body)}`)
  m2.prescriptionId = rx.body.data.id

  const item = await req(`/prescriptions/${m2.prescriptionId}/items`, {
    method: 'POST',
    headers: { ...bearer(s), 'content-type': 'application/json' },
    body: JSON.stringify({
      drugName: 'Paracetamol',
      strength: '650mg',
      form: 'tablet',
      dosage: '1 tablet',
      frequency: 'TDS',
      route: 'oral',
      durationDays: 3,
      quantity: 9,
    }),
  })
  assert(item.status < 300, `item failed: ${JSON.stringify(item.body)}`)

  const issue = await req(`/prescriptions/${m2.prescriptionId}/status`, {
    method: 'PATCH',
    headers: { ...bearer(s), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'issued' }),
  })
  assert(issue.status === 200 && issue.body.data.status === 'issued', JSON.stringify(issue.body))

  const illegal = await req(`/prescriptions/${m2.prescriptionId}/status`, {
    method: 'PATCH',
    headers: { ...bearer(s), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'draft' }),
  })
  assert(illegal.status === 409 && illegal.body.error?.code === 'INVALID_TRANSITION', JSON.stringify(illegal.body))
})

await check('ENC-4   Lock encounter -> further updates rejected (ENCOUNTER_SIGNED)', async () => {
  const s = await login('nova', '+919800000101')
  const lock = await req(`/encounters/${m2.encounterId}/lock`, { method: 'POST', headers: bearer(s) })
  assert(lock.status === 200 && lock.body.data.isLocked === true, JSON.stringify(lock.body))

  const patch = await req(`/encounters/${m2.encounterId}`, {
    method: 'PATCH',
    headers: { ...bearer(s), 'content-type': 'application/json' },
    body: JSON.stringify({ clinicalNotes: 'tamper' }),
  })
  assert(patch.status === 409 && patch.body.error?.code === 'ENCOUNTER_SIGNED', JSON.stringify(patch.body))
})

await check('ENC-5   Patient timeline + prescriptions-by-encounter lists', async () => {
  const s = await login('nova', '+919800000101')
  const timeline = await req(`/patients/${m2.patientId}/encounters`, { headers: bearer(s) })
  assert(timeline.status === 200, `got ${timeline.status}`)
  assert(
    timeline.body.data.some((e) => e.id === m2.encounterId),
    'encounter missing from patient timeline',
  )

  const rxs = await req(`/prescriptions?encounterId=${m2.encounterId}`, { headers: bearer(s) })
  assert(rxs.status === 200, `got ${rxs.status}: ${JSON.stringify(rxs.body)}`)
  const rx = rxs.body.data.find((p) => p.id === m2.prescriptionId)
  assert(rx, 'prescription missing from encounter list')
  assert(Array.isArray(rx.items) && rx.items.length === 1, 'prescription items not embedded')
})

await check('ISO-3   Cross-tenant encounter read -> 404', async () => {
  const s = await login('sunrise', '+919800000101')
  const { status, body } = await req(`/encounters/${m2.encounterId}`, { headers: bearer(s) })
  assert(status === 404 && body.error?.code === 'ENCOUNTER_NOT_FOUND', JSON.stringify(body))
})

await check('RBAC-4  Pharmacist denied encounter creation', async () => {
  const s = await login('nova', '+919800000202')
  const { status, body } = await req('/encounters', {
    method: 'POST',
    headers: { ...bearer(s), 'content-type': 'application/json' },
    body: JSON.stringify({ patientId: m2.patientId, doctorId: m2.doctorId }),
  })
  assert(status === 403 && body.error?.code === 'PERMISSION_DENIED', JSON.stringify(body))
})

await check('BILL-1  Invoice created with GST math (50000 -> cgst/sgst 4500 each)', async () => {
  const s = await login('nova', '+919800000201')
  const inv = await req('/invoices', {
    method: 'POST',
    headers: { ...bearer(s), 'content-type': 'application/json' },
    body: JSON.stringify({
      encounterId: m2.encounterId,
      patientId: m2.patientId,
      lines: [
        {
          itemType: 'consultation',
          itemName: 'General Consultation',
          quantity: 1,
          unitPricePaise: 50000,
          cgstRate: 9,
          sgstRate: 9,
        },
      ],
      discountPaise: 0,
    }),
  })
  assert(inv.status < 300, `got ${inv.status}: ${JSON.stringify(inv.body)}`)
  const d = inv.body.data
  assert(d.subTotalPaise === 50000, `subtotal: ${d.subTotalPaise}`)
  assert(d.cgstPaise === 4500 && d.sgstPaise === 4500, `tax: ${d.cgstPaise}/${d.sgstPaise}`)
  assert(d.totalPaise === 59000, `total: ${d.totalPaise}`)
  assert(d.balancePaise === 59000 && d.status === 'issued', `status: ${d.status}/${d.balancePaise}`)
  assert(/^INV-\d{8}-\d+$/.test(d.invoiceNo ?? ''), `bad invoiceNo: ${d.invoiceNo}`)
  m2.invoiceId = d.id
})

await check('BILL-2  Partial then full payment -> balance 0, status paid', async () => {
  const s = await login('nova', '+919800000201')
  const p1 = await req(`/invoices/${m2.invoiceId}/payments`, {
    method: 'POST',
    headers: { ...bearer(s), 'content-type': 'application/json' },
    body: JSON.stringify({ invoiceId: m2.invoiceId, amountPaise: 20000, mode: 'upi', reference: 'SMOKE_TEST' }),
  })
  assert(p1.status < 300 && p1.body.data.balancePaise === 39000 && p1.body.data.status === 'partial',
    JSON.stringify(p1.body))

  const p2 = await req(`/invoices/${m2.invoiceId}/payments`, {
    method: 'POST',
    headers: { ...bearer(s), 'content-type': 'application/json' },
    body: JSON.stringify({ invoiceId: m2.invoiceId, amountPaise: 39000, mode: 'cash' }),
  })
  assert(p2.status < 300 && p2.body.data.balancePaise === 0 && p2.body.data.status === 'paid',
    JSON.stringify(p2.body))
})

await check('BILL-3  Patient outstanding total is zero after settlement', async () => {
  const s = await login('nova', '+919800000201')
  const { status, body } = await req(`/invoices/patient/${m2.patientId}/outstanding`, { headers: bearer(s) })
  assert(status === 200 && Number(body.data.outstandingPaise) === 0, JSON.stringify(body))
})

await check('INV-1   Pharmacist creates inventory item; receptionist denied create', async () => {
  const ph = await login('nova', '+919800000202')
  const { status, body } = await req('/inventory/items', {
    method: 'POST',
    headers: { ...bearer(ph), 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Paracetamol',
      category: 'medicines',
      unit: 'tablets',
      quantity: 0,
      reorderLevel: 20,
      unitPricePaise: 65,
      batchNo: 'SMOKE_TEST',
    }),
  })
  assert(status < 300, `got ${status}: ${JSON.stringify(body)}`)
  assert(body.data.quantity === 0 && body.data.category === 'medicines', JSON.stringify(body.data))
  m2.itemId = body.data.id

  const rec = await login('nova', '+919800000201')
  const denied = await req('/inventory/items', {
    method: 'POST',
    headers: { ...bearer(rec), 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'X', category: 'consumables' }),
  })
  assert(denied.status === 403 && denied.body.error?.code === 'PERMISSION_DENIED', JSON.stringify(denied.body))
})

await check('INV-2   Stock purchase +100 -> qty 100; overdraft rejected 400', async () => {
  const ph = await login('nova', '+919800000202')
  assert(m2.itemId, 'itemId not set from INV-1')

  const buy = await req(`/inventory/items/${m2.itemId}/stock`, {
    method: 'PATCH',
    headers: { ...bearer(ph), 'content-type': 'application/json' },
    body: JSON.stringify({ delta: 100, reason: 'purchase' }),
  })
  assert(buy.status === 200 && buy.body.data.quantity === 100, JSON.stringify(buy.body))

  const over = await req(`/inventory/items/${m2.itemId}/stock`, {
    method: 'PATCH',
    headers: { ...bearer(ph), 'content-type': 'application/json' },
    body: JSON.stringify({ delta: -500, reason: 'adjustment' }),
  })
  assert(over.status === 400 && over.body.error?.code === 'INSUFFICIENT_STOCK', JSON.stringify(over.body))
})

await check('LAB-1   Lab tech creates lab order; invalid transition rejected', async () => {
  const lt = await login('nova', '+919800000203')
  const order = await req('/lab-orders', {
    method: 'POST',
    headers: { ...bearer(lt), 'content-type': 'application/json' },
    body: JSON.stringify({
      patientId: m2.patientId,
      doctorId: m2.doctorId,
      priority: 'urgent',
      investigations: [{ name: 'CBC' }, { name: 'LFT', sampleType: 'serum' }],
    }),
  })
  assert(order.status < 300, `got ${order.status}: ${JSON.stringify(order.body)}`)
  assert(/^LB-\d{8}-\d+$/.test(order.body.data.orderNo ?? ''), `bad orderNo: ${order.body.data.orderNo}`)
  assert(order.body.data.status === 'ordered' && order.body.data.investigations.length === 2, JSON.stringify(order.body.data))
  m2.labOrderId = order.body.data.id

  const skip = await req(`/lab-orders/${m2.labOrderId}/status`, {
    method: 'PATCH',
    headers: { ...bearer(lt), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'completed' }),
  })
  assert(skip.status === 409 && skip.body.error?.code === 'INVALID_TRANSITION', JSON.stringify(skip.body))
})

await check('LAB-2   Collect -> process -> results -> completed -> reviewed', async () => {
  const lt = await login('nova', '+919800000203')
  const h = { ...bearer(lt), 'content-type': 'application/json' }
  for (const st of ['collected', 'processing']) {
    const r = await req(`/lab-orders/${m2.labOrderId}/status`, { method: 'PATCH', headers: h, body: JSON.stringify({ status: st }) })
    assert(r.status === 200 && r.body.data.status === st, `${st}: ${JSON.stringify(r.body)}`)
  }

  const results = await req(`/lab-orders/${m2.labOrderId}/results`, {
    method: 'PUT',
    headers: h,
    body: JSON.stringify({
      results: [{ name: 'Hemoglobin', value: '13.5', unit: 'g/dL', flag: 'normal' }],
      complete: true,
    }),
  })
  assert(results.status === 200 && results.body.data.status === 'completed', JSON.stringify(results.body))
  assert(results.body.data.results[0].value === '13.5', 'results not persisted')

  const review = await req(`/lab-orders/${m2.labOrderId}/status`, {
    method: 'PATCH',
    headers: h,
    body: JSON.stringify({ status: 'reviewed' }),
  })
  assert(review.status === 200 && review.body.data.status === 'reviewed', JSON.stringify(review.body))
})

await check('PROC-1  Procedure lifecycle ordered->prepared->in_progress->completed', async () => {
  const rec = await login('nova', '+919800000201')
  const order = await req('/procedure-orders', {
    method: 'POST',
    headers: { ...bearer(rec), 'content-type': 'application/json' },
    body: JSON.stringify({
      patientId: m2.patientId,
      doctorId: m2.doctorId,
      name: 'Wound Dressing',
      pricePaise: 20000,
      room: 'OPD-1',
    }),
  })
  assert(order.status < 300 && order.body.data.status === 'ordered', `got ${order.status}: ${JSON.stringify(order.body)}`)
  m2.procedureOrderId = order.body.data.id

  const doc = await login('nova', '+919800000101')
  const h = { ...bearer(doc), 'content-type': 'application/json' }
  for (const st of ['prepared', 'in_progress', 'completed']) {
    const r = await req(`/procedure-orders/${m2.procedureOrderId}/status`, { method: 'PATCH', headers: h, body: JSON.stringify({ status: st }) })
    assert(r.status === 200 && r.body.data.status === st, `${st}: ${JSON.stringify(r.body)}`)
  }

  const done = await req(`/procedure-orders/${m2.procedureOrderId}/status`, {
    method: 'PATCH',
    headers: h,
    body: JSON.stringify({ status: 'ordered' }),
  })
  assert(done.status === 409 && done.body.error?.code === 'INVALID_TRANSITION', JSON.stringify(done.body))
})

await check('PHARM-1 Dispense queue lists issued Rx; dispense decrements stock', async () => {
  const ph = await login('nova', '+919800000202')
  const queue = await req('/pharmacy/dispense-queue', { headers: bearer(ph) })
  assert(queue.status === 200, `got ${queue.status}: ${JSON.stringify(queue.body)}`)
  const entry = queue.body.data.find((q) => q.prescriptionId === m2.prescriptionId)
  assert(entry, 'issued prescription missing from dispense queue')
  assert(entry.status === 'issued' && entry.items.length === 1, JSON.stringify(entry))
  assert(entry.items[0].drugName === 'Paracetamol' && entry.items[0].quantity === 9, JSON.stringify(entry.items))

  const d = await req(`/pharmacy/prescriptions/${m2.prescriptionId}/dispense`, {
    method: 'POST',
    headers: bearer(ph),
  })
  assert(d.status < 300 && d.body.data.status === 'dispensed', `got ${d.status}: ${JSON.stringify(d.body)}`)

  const after = await req(`/inventory/items/${m2.itemId}`, { headers: bearer(ph) })
  assert(after.status === 200 && after.body.data.quantity === 91, `expected 91 after dispensing 9, got ${after.body.data?.quantity}`)

  const again = await req(`/pharmacy/prescriptions/${m2.prescriptionId}/dispense`, { method: 'POST', headers: bearer(ph) })
  assert(again.status === 409 && again.body.error?.code === 'PRESCRIPTION_NOT_ISSUED', JSON.stringify(again.body))
})

await check('RBAC-5  Lab tech denied invoice creation', async () => {
  const lt = await login('nova', '+919800000203')
  const { status, body } = await req('/invoices', {
    method: 'POST',
    headers: { ...bearer(lt), 'content-type': 'application/json' },
    body: JSON.stringify({ patientId: m2.patientId, lines: [{ itemType: 'other', itemName: 'X', unitPricePaise: 1 }] }),
  })
  assert(status === 403 && body.error?.code === 'PERMISSION_DENIED', JSON.stringify(body))
})

if (apiProcess) {
  apiProcess.kill()
}

await check('CLEAN-1  Smoke-test rows removed from all tenant schemas', async () => {
  for (const s of await tenantSchemas()) {
    await psql(`
      DELETE FROM ${s}.payments WHERE invoice_id IN (
        SELECT id FROM ${s}.invoices WHERE patient_id IN (SELECT id FROM ${s}.patients WHERE phone LIKE '+919999%'))
    `)
    await psql(`DELETE FROM ${s}.invoices WHERE patient_id IN (SELECT id FROM ${s}.patients WHERE phone LIKE '+919999%')`)
    await psql(`
      DELETE FROM ${s}.prescription_items WHERE prescription_id IN (
        SELECT id FROM ${s}.prescriptions WHERE patient_id IN (SELECT id FROM ${s}.patients WHERE phone LIKE '+919999%'))
    `)
    await psql(`DELETE FROM ${s}.prescriptions WHERE patient_id IN (SELECT id FROM ${s}.patients WHERE phone LIKE '+919999%')`)
    await psql(`DELETE FROM ${s}.lab_orders WHERE patient_id IN (SELECT id FROM ${s}.patients WHERE phone LIKE '+919999%')`)
    await psql(`DELETE FROM ${s}.procedure_orders WHERE patient_id IN (SELECT id FROM ${s}.patients WHERE phone LIKE '+919999%')`)
    await psql(`
      DELETE FROM ${s}.stock_movements WHERE item_id IN (
        SELECT id FROM ${s}.inventory_items WHERE batch_no = 'SMOKE_TEST')
    `)
    await psql(`DELETE FROM ${s}.inventory_items WHERE batch_no = 'SMOKE_TEST'`)
    await psql(`
      DELETE FROM ${s}.encounter_diagnoses WHERE encounter_id IN (
        SELECT id FROM ${s}.encounters WHERE patient_id IN (SELECT id FROM ${s}.patients WHERE phone LIKE '+919999%'))
    `)
    await psql(`
      DELETE FROM ${s}.vitals WHERE encounter_id IN (
        SELECT id FROM ${s}.encounters WHERE patient_id IN (SELECT id FROM ${s}.patients WHERE phone LIKE '+919999%'))
    `)
    await psql(`DELETE FROM ${s}.encounters WHERE patient_id IN (SELECT id FROM ${s}.patients WHERE phone LIKE '+919999%')`)
    await psql(`DELETE FROM ${s}.queue_tokens WHERE appointment_id IN (SELECT id FROM ${s}.appointments WHERE notes='SMOKE_TEST')`)
    await psql(`DELETE FROM ${s}.appointments WHERE notes='SMOKE_TEST'`)
    await psql(`DELETE FROM ${s}.patients WHERE phone LIKE '+919999%'`)
  }
  const sunriseSchema = await schemaBySlug('sunrise')
  const left = Number(
    await psql(`SELECT count(*) FROM ${sunriseSchema}.patients WHERE phone LIKE '+919999%'`),
  )
  assert(left === 0, 'cleanup failed')
})

const passed = results.filter((r) => r.ok).length
console.log(`\n=== ${passed}/${results.length} checks passed ===\n`)
process.exit(passed === results.length ? 0 : 1)
