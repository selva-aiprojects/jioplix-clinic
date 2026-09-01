import { strict as assert } from 'node:assert'
import { createServer } from 'node:http'
import { randomInt } from 'node:crypto'
import { spawn } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const API_PORT = 3102
const MOCK_PORT = 3191
const BASE = `http://localhost:${API_PORT}/api/v1`

const DEMO_CLINIC = 'nova'
const DEMO_PHONE = '+919800000201' // allowlisted demo user on nova
const MSG91_CLINIC = 'sunrise'
const MSG91_PHONE = '+919800000201' // sunrise has the same seeded user
const NON_DEMO_NUMBER = '+919800000999' // nova, but NOT allowlisted -> real path
const RATE_LIMIT_NUMBER = '+919800000399' // mock is primed to reject this send

let passed = 0
let failed = 0
let apiProcess = null
const sentRequests = [] // [URL] records every outbound call the API makes to the mock

// ── Inline mock MSG91 server (MSG91 Auth API v5 contract) ────────────────
const otps = new Map() // mobile -> { otp, used, attempts }
const mockServer = createServer((req, res) => {
  const u = new URL(req.url ?? '/', 'http://mock.local')
  const send = res
  const json = (status, obj) => {
    send.statusCode = status
    send.setHeader('Content-Type', 'application/json')
    send.end(JSON.stringify(obj))
  }

  if (u.pathname === '/health') {
    return json(200, { type: 'success', message: 'mock up' })
  }

  if (u.pathname === '/api/v5/otp' && req.method === 'POST') {
    const mobile = u.searchParams.get('mobile')
    if (mobile === '919800000399') {
      sentRequests.push(u)
      return json(200, { type: 'error', message: "OTP can't be resent now, please wait for 2 minutes." })
    }
    const otp = String(randomInt(100000, 999999))
    otps.set(mobile, { otp, used: false, attempts: 0 })
    sentRequests.push(u)
    return json(200, { type: 'success', message: 'OTP sent successfully' })
  }

  if (u.pathname === '/api/v5/otp/verify' && req.method === 'POST') {
    const mobile = u.searchParams.get('mobile')
    const otp = u.searchParams.get('otp') ?? ''
    const row = otps.get(mobile)
    sentRequests.push(u)
    if (!row || row.used) return json(200, { type: 'error', message: 'Invalid OTP' })
    row.attempts += 1
    if (row.otp !== otp) {
      if (row.attempts >= 5) {
        row.used = true
        return json(200, { type: 'error', message: 'Maximum attempt exceeded' })
      }
      return json(200, { type: 'error', message: 'Invalid OTP' })
    }
    row.used = true
    return json(200, { type: 'success', message: 'OTP verified successfully' })
  }

  sentRequests.push(u)
  return json(404, { type: 'error', message: 'Not Found' })
})

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

async function waitUp(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url)
      if (r.status === 200) return true
    } catch { /* retry */ }
    await new Promise((r2) => setTimeout(r2, 500))
  }
  return false
}

/** LocalOtpStore rate-limits send-otp to 1/min per phone+clinic (shared DB).
 *  Retry once after the window so re-runs stay green. */
async function sendWithDemoCode(clinic, phone) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await post('/auth/send-otp', { clinic, phone })
    const code = r.data?.data?.demoCode
    if (/^\d{6}$/.test(code ?? '')) return { r, code }
    if (attempt === 0) {
      console.log('  (demo phone rate-limited from a prior run; waiting 61s…)')
      await new Promise((res) => setTimeout(res, 61_000))
    }
  }
  return { r: null, code: null }
}

void (async () => {
  const env = loadEnv()
  const DATABASE_URL = process.env.DATABASE_URL || env.DATABASE_URL
  assert.ok(DATABASE_URL, 'DATABASE_URL required (set in .env or environment)')

  console.log('\n=== MSG91 OTP Adapter Tests (mock server, offline) ===\n')

  await new Promise((res) => mockServer.listen(MOCK_PORT, res))
  const mockUp = await waitUp(`http://127.0.0.1:${MOCK_PORT}/health`, 10)
  ok('MSG91 mock server up', mockUp, '(mock has no /health — still responds)')

  // Boot the API pointed at the mock MSG91 (hermetic: no live providers).
  apiProcess = spawn('node', ['dist/main.js'], {
    cwd: join(root, 'apps', 'api'),
    env: {
      ...process.env,
      DATABASE_URL,
      PORT: String(API_PORT),
      DEMO_OTP_ENABLED: 'true',
      OTP_DELIVERY: 'msg91',
      SUPABASE_URL: '',
      SUPABASE_ANON_KEY: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
      MSG91_AUTH_KEY: 'test-auth-key',
      MSG91_TEMPLATE_ID: 'test-template-id',
      MSG91_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
      MSG91_OTP_LENGTH: '6',
      MSG91_OTP_EXPIRY_MINUTES: '5',
    },
    stdio: ['ignore', 'pipe', process.stderr],
  })

  const up = await waitUp(`${BASE}/healthz`)
  ok('API boots with MSG91 routing to the mock (port 3102)', up)
  if (!up) process.exit(1)
  await new Promise((r) => setTimeout(r, 800))

  // ── Demo allowlist still wins over MSG91 ───────────────────────────────
  const demoRes = await sendWithDemoCode(DEMO_CLINIC, DEMO_PHONE)
  ok('DEMO allowlisted phone still gets on-screen demoCode (allowlist > MSG91)',
    /^\d{6}$/.test(demoRes.code ?? ''), JSON.stringify(demoRes.r?.data))

  // ── Real path routes to MSG91 (sunrise) ────────────────────────────────
  let r = await post('/auth/send-otp', { clinic: MSG91_CLINIC, phone: MSG91_PHONE })
  ok('MSG91 send-otp (sunrise) -> 200', r.status === 200, `got ${r.status}`)
  ok('MSG91 response has NO demoCode', r.data?.data?.demoCode === undefined, JSON.stringify(r.data))
  ok('MSG91 response says OTP sent', r.data?.data?.message === 'OTP sent to your phone number')

  const sendReq = sentRequests.filter((u) => u.pathname === '/api/v5/otp' && u.searchParams.get('mobile') === '919800000201').at(-1)
  ok('Outbound MSG91 send: mobile normalized (no +)', sendReq?.searchParams.get('mobile') === '919800000201')
  ok('Outbound MSG91 send: template_id passed', sendReq?.searchParams.get('template_id') === 'test-template-id')
  ok('Outbound MSG91 send: otp_length=6 + authkey passed',
    sendReq?.searchParams.get('otp_length') === '6' && sendReq?.searchParams.get('authkey') === 'test-auth-key')

  const mockedCode = otps.get('919800000201')?.otp
  ok('Mock store holds a 6-digit code for the sent OTP', /^\d{6}$/.test(mockedCode ?? ''))

  r = await post('/auth/verify-otp', { clinic: MSG91_CLINIC, phone: MSG91_PHONE, otp: '000000' })
  ok('MSG91 wrong code -> 401 OTP_INVALID', r.status === 401 && r.data?.error?.code === 'OTP_INVALID', JSON.stringify(r.data))

  r = await post('/auth/verify-otp', { clinic: MSG91_CLINIC, phone: MSG91_PHONE, otp: mockedCode })
  ok('MSG91 correct (mocked) code -> 200 + JWT session', r.status === 200 && !!r.data?.data?.accessToken, JSON.stringify(r.data))
  ok('MSG91 session maps to the real user', r.data?.data?.user?.phone === MSG91_PHONE)

  r = await post('/auth/verify-otp', { clinic: MSG91_CLINIC, phone: MSG91_PHONE, otp: mockedCode })
  ok('MSG91 code is single-use (reuse -> 401)', r.status === 401, `got ${r.status}`)

  // ── Non-allowlisted number on demo clinic hard-routes to MSG91 ─────────
  const before = sentRequests.length
  r = await post('/auth/send-otp', { clinic: DEMO_CLINIC, phone: NON_DEMO_NUMBER })
  ok('SECURITY: non-allowlisted on nova -> NO demoCode (routed to MSG91)',
    r.status === 200 && r.data?.data?.demoCode === undefined, JSON.stringify(r.data))
  ok('SECURITY: non-allowlisted number reached the mock (real delivery attempted)',
    sentRequests.filter((u) => u.pathname === '/api/v5/otp' && u.searchParams.get('mobile') === '919800000999').length === 1)

  // ── Unknown clinic must NOT reach the mock (existence hidden, no SMS) ───
  const beforeUnknown = sentRequests.length
  r = await post('/auth/send-otp', { clinic: 'nonexistent', phone: MSG91_PHONE })
  ok('Unknown clinic -> 200, no demoCode, no SMS spent',
    r.status === 200 && r.data?.data?.demoCode === undefined && sentRequests.length === beforeUnknown,
    `mock calls went ${beforeUnknown} -> ${sentRequests.length}`)

  // ── MSG91 rate-limit / resend-window mapping ───────────────────────────
  r = await post('/auth/send-otp', { clinic: MSG91_CLINIC, phone: RATE_LIMIT_NUMBER })
  ok('MSG91 resend-window error -> 200 + waiting message, no demoCode',
    r.status === 200 &&
    typeof r.data?.data?.expiresIn === 'number' &&
    /wait/i.test(r.data?.data?.message ?? '') &&
    r.data?.data?.demoCode === undefined,
    JSON.stringify(r.data))

  // ── Validation still enforced on this path ─────────────────────────────
  r = await post('/auth/verify-otp', { clinic: MSG91_CLINIC, phone: MSG91_PHONE })
  ok('VLDT  missing OTP -> 400', r.status === 400)

  console.log(`\n=== ${passed}/${passed + failed} MSG91 adapter tests passed ===\n`)
  console.log('    This run used a local MSG91 mock — no real SMS was sent.')
  console.log('    To hit live MSG91, set MSG91_AUTH_KEY + MSG91_TEMPLATE_ID in .env and run node scripts/test-otp-live.mjs.')
})().catch((e) => {
  console.error(e)
  process.exit(1)
}).finally(() => {
  if (apiProcess) apiProcess.kill()
  mockServer.close()
  setTimeout(() => process.exit(failed ? 1 : 0), 200)
})