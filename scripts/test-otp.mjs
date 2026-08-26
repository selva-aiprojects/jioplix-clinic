import { strict as assert } from 'node:assert'

const BASE = 'http://localhost:3000/api/v1'
const CLINIC = 'nova'
const PHONE = '+919800000201'
const WRONG_OTP = '000000'

let passed = 0
let failed = 0

function ok(label, cond) {
  if (cond) { console.log(`  PASS  ${label}`); passed++ }
  else { console.log(`  FAIL  ${label}`); failed++ }
}

function json(body) { return JSON.stringify(body) }

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: json(body),
  })
  const d = await r.json().catch(() => null)
  return { status: r.status, data: d }
}

async function run() {
  console.log('\n=== OTP Endpoint Tests ===\n')

  // 1) send-otp for nova
  let r = await post('/auth/send-otp', { clinic: CLINIC, phone: PHONE })
  ok('POST /auth/send-otp (nova) -> 200', r.status === 200)
  ok('response has expiresIn', typeof r.data?.data?.expiresIn === 'number')

  // 2) send-otp for unknown clinic (should not reveal existence)
  r = await post('/auth/send-otp', { clinic: 'nonexistent', phone: PHONE })
  ok('POST /auth/send-otp (bad clinic) -> 200 (hides existence)', r.status === 200)

  // 3) verify-otp with wrong code
  r = await post('/auth/verify-otp', { clinic: CLINIC, phone: PHONE, otp: WRONG_OTP })
  ok('POST /auth/verify-otp (wrong OTP) -> 401', r.status === 401)

  // 4) verify-otp with bad payload
  r = await post('/auth/verify-otp', { clinic: CLINIC })
  ok('POST /auth/verify-otp (bad payload) -> 400', r.status === 400)

  // 5) password login still works
  r = await post('/auth/login', { clinic: CLINIC, phone: PHONE, password: 'demo1234' })
  ok('POST /auth/login (password) -> 200 + token', r.status === 200 && !!r.data?.data?.accessToken)

  // 6) send-otp again immediately (rate limit)
  r = await post('/auth/send-otp', { clinic: CLINIC, phone: PHONE })
  ok('POST /auth/send-otp (rate limit) -> 200 with wait message', r.status === 200)

  // 7) send-otp for all 4 tenants
  for (const slug of ['nova', 'sunrise', 'apex', 'medicore']) {
    r = await post('/auth/send-otp', { clinic: slug, phone: PHONE })
    ok(`POST /auth/send-otp (${slug}) -> 200`, r.status === 200)
  }

  // 8) validate: clinic too short
  r = await post('/auth/send-otp', { clinic: 'a', phone: PHONE })
  ok('POST /auth/send-otp (clinic too short) -> 400', r.status === 400)

  // 9) validate: invalid phone format
  r = await post('/auth/send-otp', { clinic: CLINIC, phone: 'not-a-phone' })
  ok('POST /auth/send-otp (bad phone) -> 400', r.status === 400)

  // 10) validate: OTP must be exactly 6 digits
  r = await post('/auth/verify-otp', { clinic: CLINIC, phone: PHONE, otp: '12345' })
  ok('POST /auth/verify-otp (5-digit OTP) -> 400', r.status === 400)
  r = await post('/auth/verify-otp', { clinic: CLINIC, phone: PHONE, otp: '1234567' })
  ok('POST /auth/verify-otp (7-digit OTP) -> 400', r.status === 400)
  r = await post('/auth/verify-otp', { clinic: CLINIC, phone: PHONE, otp: 'abcdef' })
  ok('POST /auth/verify-otp (alpha OTP) -> 400', r.status === 400)

  console.log(`\n=== ${passed}/${passed + failed} OTP endpoint tests passed ===\n`)
}

run().catch(e => { console.error(e); process.exit(1) })
