import { spawn, execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

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

const PSQL_DIRS = ['C:\\Program Files\\PostgreSQL\\17\\bin', 'C:\\Program Files\\PostgreSQL\\18\\bin']
const psqlDir = PSQL_DIRS.find((d) => existsSync(join(d, 'psql.exe')))
const psql = (sql) =>
  execSync(
    `"${join(psqlDir, 'psql.exe')}" -U jioplix -p 5434 -d jioplix -t -A -c "${sql.replace(/\s+/g, ' ').trim()}"`,
    { env: { ...process.env, PGPASSWORD: 'jioplix' }, encoding: 'utf8' },
  ).trim()

const tenantSchemas = () =>
  psql("SELECT schema_name FROM public.tenants WHERE status='active'")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)

const schemaBySlug = (slug) => psql(`SELECT schema_name FROM public.tenants WHERE slug='${slug}'`)

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

await check('DB-1  PostgreSQL reachable on :5434', () => {
  const v = psql('SELECT version()')
  assert(v.includes('PostgreSQL'), 'no PostgreSQL response')
})

await check('DB-2  Global registry: 4 plans, 4 active tenants', () => {
  const plans = Number(psql('SELECT count(*) FROM public.plans'))
  const tenants = Number(psql("SELECT count(*) FROM public.tenants WHERE status='active'"))
  assert(plans === 4, `expected 4 plans, got ${plans}`)
  assert(tenants === 4, `expected 4 active tenants, got ${tenants}`)
})

await check('DB-3  Every tenant schema migrated to 0003_auth', () => {
  const missing = psql(
    `SELECT t.slug FROM public.tenants t WHERE NOT EXISTS (
       SELECT 1 FROM information_schema.tables ist
       WHERE ist.table_schema = t.schema_name AND ist.table_name = 'refresh_tokens')`,
  )
  assert(missing === '', `missing refresh_tokens in: ${missing}`)
})

await check('AUTH-0  Demo users have password hashes seeded', () => {
  const n = Number(
    psql(`SELECT count(*) FROM t_4ca9e94d.users WHERE password_hash LIKE 'scrypt$%'`),
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
  const novaSchema = schemaBySlug('nova')
  const sunriseSchema = schemaBySlug('sunrise')
  const firstNovaPatient = body.data[0].id
  const inSunrise = Number(psql(`SELECT count(*) FROM ${sunriseSchema}.patients WHERE id='${firstNovaPatient}'`))
  const inNova = Number(psql(`SELECT count(*) FROM ${novaSchema}.patients WHERE id='${firstNovaPatient}'`))
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

await check('ISO-1  New patient exists ONLY in sunrise schema (no cross-tenant leak)', () => {
  const sunriseSchema = schemaBySlug('sunrise')
  for (const s of tenantSchemas()) {
    if (s === sunriseSchema) continue
    const n = Number(psql(`SELECT count(*) FROM ${s}.patients WHERE phone='${testPhone}'`))
    assert(n === 0, `leak! found test patient in ${s}`)
  }
  const inSunrise = Number(
    psql(`SELECT count(*) FROM ${sunriseSchema}.patients WHERE phone='${testPhone}'`),
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
const novaSchema = schemaBySlug('nova')

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
  const patientId = psql(`SELECT id FROM ${novaSchema}.patients WHERE first_name='Ananya' LIMIT 1`)
  const doctorId = psql(`SELECT id FROM ${novaSchema}.users WHERE full_name LIKE 'Dr.%' LIMIT 1`)
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
  const apptId = psql(`SELECT id FROM ${novaSchema}.appointments WHERE notes='SMOKE_TEST' LIMIT 1`)

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
  const smokeToken = body.data.tokens.find((t) => t.appointmentId === psql(`SELECT id FROM ${novaSchema}.appointments WHERE notes='SMOKE_TEST' LIMIT 1`))
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
  const doctorId = psql(`SELECT id FROM ${novaSchema}.users WHERE full_name LIKE 'Dr.%' LIMIT 1`)
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

if (apiProcess) {
  apiProcess.kill()
}

await check('CLEAN-1  Smoke-test rows removed from all tenant schemas', () => {
  for (const s of tenantSchemas()) {
    psql(`DELETE FROM ${s}.queue_tokens WHERE appointment_id IN (SELECT id FROM ${s}.appointments WHERE notes='SMOKE_TEST')`)
    psql(`DELETE FROM ${s}.appointments WHERE notes='SMOKE_TEST'`)
    psql(`DELETE FROM ${s}.patients WHERE phone LIKE '+919999%'`)
  }
  const left = Number(
    psql(`SELECT count(*) FROM ${schemaBySlug('sunrise')}.patients WHERE phone LIKE '+919999%'`),
  )
  assert(left === 0, 'cleanup failed')
})

const passed = results.filter((r) => r.ok).length
console.log(`\n=== ${passed}/${results.length} checks passed ===\n`)
process.exit(passed === results.length ? 0 : 1)
