import { strict as assert } from 'node:assert'
import { spawn } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 3100
const BASE = `http://localhost:${PORT}/api/v1`

const DEMO_CLINIC = 'nova'
const DEMO_PHONE = '+919800000201' // Ramesh Gupta (receptionist) — allowlisted demo
const DEMO_PHONE_2 = '+919800000102' // Dr. Anand Verma — allowlisted demo
const ACTUAL_CLINIC = 'sunrise' // NOT a demo clinic → real provider path
const ACTUAL_PHONE = '+919800000201' // Ramesh Gupta also exists on sunrise
const NON_DEMO_NUMBER = '+919800000999' // on demo clinic but NOT allowlisted
const WRONG_OTP = '000000'

let passed = 0
let failed = 0
let apiProcess = null
let apiLog = ''

function ok(label, cond, extra = '') {
  if (cond) { console.log(`  PASS  ${label}`); passed++ }
  else { console.log(`  FAIL  ${label} ${extra}`); failed++ }
}

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

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const d = await r.json().catch(() => null)
  return { status: r.status, data: d }
}

/** Shared-DB LocalOtpStore rate-limits send-otp to 1/min per phone+clinic.
 *  Retry once past the window so re-runs / other scripts stay green. */
async function sendOtpUntil({ clinic, phone, wantDemo }) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await post('/auth/send-otp', { clinic, phone })
    const code = r.data?.data?.demoCode
    const deliveredReal =
      !wantDemo &&
      r.status === 200 &&
      r.data?.data?.demoCode === undefined &&
      r.data?.data?.message === 'OTP sent to your phone number'
    if ((wantDemo && /^\d{6}$/.test(code ?? '')) || deliveredReal) return r
    if (attempt === 0) {
      console.log(`  (rate-limited from a prior run on ${phone} @ ${clinic}; waiting 61s…)`)
      await new Promise((res) => setTimeout(res, 61_000))
    }
  }
  return null
}

void (async () => {
  const env = loadEnv()
  const DATABASE_URL = process.env.DATABASE_URL || env.DATABASE_URL
  assert.ok(DATABASE_URL, 'DATABASE_URL required (set in .env or environment)')

  console.log('\n=== OTP Provider Tests (Demo + email/real path) ===\n')

  // Boot the API ourselves (like smoke-test) with demo OTP enabled, capturing logs.
  apiProcess = spawn('node', ['dist/main.js'], {
    cwd: join(root, 'apps', 'api'),
    env: {
      ...process.env,
      DATABASE_URL,
      PORT: String(PORT),
      DEMO_OTP_ENABLED: 'true',
      // Default delivery = email (₹0). Force hermetic: the email adapter's
      // dev-mode console stub logs the code; no live RESEND call can fire.
      OTP_DELIVERY: 'email',
      RESEND_API_KEY: '',
      // Hermetic: never let a live provider fire real SMS from this test.
      // The "real path" checks exercise the email dev fallback (console stub)
      // regardless of any creds sitting in .env.
      SUPABASE_URL: '',
      SUPABASE_ANON_KEY: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
      MSG91_AUTH_KEY: '',
      MSG91_TEMPLATE_ID: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  apiProcess.stdout.on('data', (b) => { apiLog += b.toString() })
  apiProcess.stderr.on('data', (b) => { apiLog += b.toString() })

  let up = false
  for (let i = 0; i < 30 && !up; i++) {
    await new Promise((r) => setTimeout(r, 500))
    try {
      const r = await fetch(`${BASE}/healthz`)
      up = r.status === 200
    } catch { /* retry */ }
  }
  ok('API boots (port 3100, DEMO_OTP_ENABLED=true)', up)
  if (!up) process.exit(1)

  await new Promise((r) => setTimeout(r, 800)) // settle

  // ── DEMO PATH (allowlisted phone on demo clinic) ────────────────────────
  let r = await sendOtpUntil({ clinic: DEMO_CLINIC, phone: DEMO_PHONE, wantDemo: true })
  ok('DEMO send-otp (nova, allowlisted) -> 200', r?.status === 200, `got ${r?.status}`)
  const demoCode = r?.data?.data?.demoCode
  ok('DEMO response exposes 6-digit demoCode', /^\d{6}$/.test(demoCode ?? ''), JSON.stringify(r?.data))

  r = await post('/auth/send-otp', { clinic: DEMO_CLINIC, phone: DEMO_PHONE })
  ok('DEMO rate limit: rapid resend -> 200 + wait, no demoCode', r.status === 200 && typeof r.data?.data?.expiresIn === 'number' && r.data?.data?.demoCode === undefined)

  r = await post('/auth/verify-otp', { clinic: DEMO_CLINIC, phone: DEMO_PHONE, otp: demoCode })
  ok('DEMO verify with demoCode -> 200 + JWT session', r.status === 200 && !!r.data?.data?.accessToken, JSON.stringify(r.data))
  ok('DEMO session maps to the allowlisted user', r.data?.data?.user?.phone === DEMO_PHONE)

  r = await post('/auth/verify-otp', { clinic: DEMO_CLINIC, phone: DEMO_PHONE, otp: demoCode })
  ok('DEMO code is single-use (reuse -> 401 OTP_EXPIRED)', r.status === 401 && r.data?.error?.code === 'OTP_EXPIRED')

  r = await post('/auth/verify-otp', { clinic: DEMO_CLINIC, phone: DEMO_PHONE, otp: WRONG_OTP })
  ok('DEMO wrong code without outstanding OTP -> 401 OTP_EXPIRED', r.status === 401 && r.data?.error?.code === 'OTP_EXPIRED')

  // ── DEMO attempts / max-attempts bounds ─────────────────────────────────
  r = await sendOtpUntil({ clinic: DEMO_CLINIC, phone: DEMO_PHONE_2, wantDemo: true })
  const demoCode2 = r?.data?.data?.demoCode
  ok('DEMO 2nd allowlisted phone gets a code', /^\d{6}$/.test(demoCode2 ?? ''))
  const wrongs = []
  for (let i = 1; i <= 5; i++) {
    r = await post('/auth/verify-otp', { clinic: DEMO_CLINIC, phone: DEMO_PHONE_2, otp: WRONG_OTP })
    wrongs.push(r.data?.error?.code)
  }
  ok('DEMO max-attempts: 4x OTP_INVALID then OTP_MAX_ATTEMPTS',
    wrongs.slice(0, 4).every((c) => c === 'OTP_INVALID') && wrongs[4] === 'OTP_MAX_ATTEMPTS',
    JSON.stringify(wrongs))

  // ── DEMO unknown clinic hides existence ─────────────────────────────────
  r = await post('/auth/send-otp', { clinic: 'nonexistent', phone: DEMO_PHONE })
  ok('DEMO unknown clinic -> 200 (hides existence), no demoCode', r.status === 200 && r.data?.data?.demoCode === undefined)

  // ── DEMO non-allowlisted number on demo clinic NEVER gets demoCode ──────
  r = await post('/auth/send-otp', { clinic: DEMO_CLINIC, phone: NON_DEMO_NUMBER })
  ok('SECURITY: non-allowlisted number -> no demoCode (hard-routed to real path)',
    r.status === 200 && r.data?.data?.demoCode === undefined, JSON.stringify(r.data))

  // ── ACTUAL PATH (email provider — cost-free default) ───────────────────
  r = await sendOtpUntil({ clinic: ACTUAL_CLINIC, phone: ACTUAL_PHONE, wantDemo: false })
  ok('ACTUAL send-otp (sunrise, real path) -> 200', r?.status === 200, `got ${r?.status}`)
  ok('ACTUAL response has NO demoCode', r?.data?.data?.demoCode === undefined, JSON.stringify(r?.data))
  ok('ACTUAL response says OTP sent', r?.data?.data?.message === 'OTP sent to your phone number')

  const stub = apiLog.match(new RegExp(`\\[EMAIL STUB\\] OTP for ${ACTUAL_PHONE.replace('+', '\\+')} @ ${ACTUAL_CLINIC}: (\\d{6})`))
  ok('ACTUAL provider routed through EMAIL console stub (code server-logged, never client-visible)',
    !!stub, 'no [EMAIL STUB] line in API log')
  ok('ACTUAL email stub never shows the code on the client response',
    r?.data?.data?.demoCode === undefined)

  if (stub) {
    const code = stub[1]
    r = await post('/auth/verify-otp', { clinic: ACTUAL_CLINIC, phone: ACTUAL_PHONE, otp: code })
    ok('ACTUAL verify with (server-logged) code -> 200 + JWT session',
      r.status === 200 && !!r.data?.data?.accessToken, JSON.stringify(r.data))
    ok('ACTUAL session maps to the real user', r.data?.data?.user?.phone === ACTUAL_PHONE)

    r = await post('/auth/verify-otp', { clinic: ACTUAL_CLINIC, phone: ACTUAL_PHONE, otp: code })
    ok('ACTUAL code is single-use (reuse -> 401)', r.status === 401)
  }

  r = await post('/auth/verify-otp', { clinic: ACTUAL_CLINIC, phone: ACTUAL_PHONE, otp: WRONG_OTP })
  ok('ACTUAL wrong code -> 401 OTP_EXPIRED', r.status === 401 && r.data?.error?.code === 'OTP_EXPIRED')

  // ── Validation ──────────────────────────────────────────────────────────
  r = await post('/auth/verify-otp', { clinic: DEMO_CLINIC })
  ok('VLDT  bad payload -> 400', r.status === 400)
  r = await post('/auth/send-otp', { clinic: 'a', phone: DEMO_PHONE })
  ok('VLDT  clinic too short -> 400', r.status === 400)
  r = await post('/auth/send-otp', { clinic: DEMO_CLINIC, phone: 'not-a-phone' })
  ok('VLDT  bad phone -> 400', r.status === 400)
  for (const bad of ['12345', '1234567', 'abcdef']) {
    r = await post('/auth/verify-otp', { clinic: DEMO_CLINIC, phone: DEMO_PHONE, otp: bad })
    ok(`VLDT  bad OTP "${bad}" -> 400`, r.status === 400)
  }

  // ── Hermeticity (informational) ─────────────────────────────────────────
  const hasSupabase = !!(env.SUPABASE_URL && (env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY))
  const hasMsg91 = !!(env.MSG91_AUTH_KEY && env.MSG91_TEMPLATE_ID)
  console.log(`\n    Delivery engine:            email (OTP_DELIVERY default; forced in this run)`)
  console.log(`    Supabase configured in .env: ${hasSupabase ? 'YES' : 'NO'}`)
  console.log(`    MSG91 configured in .env:    ${hasMsg91 ? 'YES' : 'NO'}`)
  console.log('    This run is HERMETIC: real-path checks used the email dev console stub; no live SMS/email sent.')

  console.log(`\n=== ${passed}/${passed + failed} OTP provider tests passed ===\n`)
})().catch((e) => {
  console.error(e)
  process.exit(1)
}).finally(() => {
  if (apiProcess) apiProcess.kill()
  setTimeout(() => process.exit(failed ? 1 : 0), 200)
})