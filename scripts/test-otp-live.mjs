// Opt-in live OTP round-trip against the REAL configured provider.
//
//   node scripts/test-otp-live.mjs send <clinic> <phone> [--supabase|--msg91]
//   node scripts/test-otp-live.mjs verify <clinic> <phone> <otp> [--supabase|--msg91]
//
// Safety:
//   - Refuses to run unless ALLOW_LIVE_SMS=true (real SMS costs money).
//   - Forces DEMO_OTP_ENABLED=false so an allowlisted phone cannot mask
//     the live call — every request here goes to MSG91 or Supabase.
//   - CLI invocation boots/stops its own API on an isolated port (3110).
import { strict as assert } from 'node:assert'
import { spawn } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 3110
const BASE = `http://localhost:${PORT}/api/v1`

const args = process.argv.slice(2)
const providerFlag = ['--supabase', '--msg91'].find((f) => args.includes(f))
const positions = args.filter((a) => !['--supabase', '--msg91'].includes(a))
const [action, clinic, phone, otp] = positions

async function main() {
  if (!['send', 'verify'].includes(action) || !clinic || !phone || (action === 'verify' && !otp)) {
    console.error('usage: node scripts/test-otp-live.mjs send <clinic> <phone> [provider] | verify <clinic> <phone> <otp> [provider]')
    console.error('       provider = --supabase | --msg91 (default: whichever is configured; MSG91 wins)')
    process.exit(1)
  }
  if (process.env.ALLOW_LIVE_SMS !== 'true') {
    console.error('Refusing to send a real SMS.\nSet ALLOW_LIVE_SMS=true when you intend to spend real SMS credits.')
    process.exit(1)
  }

  const env = loadEnv()
  const hasMsg91 = !!(env.MSG91_AUTH_KEY && env.MSG91_TEMPLATE_ID)
  const hasSupabase = !!(env.SUPABASE_URL && (env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY))
  assert.ok(env.DATABASE_URL, 'DATABASE_URL missing in .env')

  if (providerFlag === '--supabase') {
    assert.ok(hasSupabase, '--supabase requested but SUPABASE_URL/key missing in .env')
  } else if (providerFlag === '--msg91') {
    assert.ok(hasMsg91, '--msg91 requested but MSG91_AUTH_KEY+MSG91_TEMPLATE_ID missing in .env')
  } else {
    assert.ok(hasMsg91 || hasSupabase, 'No live provider configured: set MSG91_AUTH_KEY+MSG91_TEMPLATE_ID (wins) or SUPABASE_URL+key in .env')
  }

  const liveProvider = providerFlag === '--supabase' ? 'Supabase' : providerFlag === '--msg91' ? 'MSG91' : hasMsg91 ? 'MSG91' : 'Supabase'
  console.log(`\nLive provider: ${liveProvider} — ${phone} @ ${clinic}\n`)

  // Pin the chosen provider in the spawned API: MSG91 and Supabase gates both
  // need their env; blanking the other keeps selection deterministic.
  const supabaseVars = providerFlag === '--msg91'
    ? { SUPABASE_URL: '', SUPABASE_ANON_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '' }
    : {}
  const msg91Vars = providerFlag === '--supabase'
    ? { MSG91_AUTH_KEY: '', MSG91_TEMPLATE_ID: '' }
    : {}

  const api = spawn('node', ['dist/main.js'], {
    cwd: join(root, 'apps', 'api'),
    env: {
      ...process.env,
      DATABASE_URL: env.DATABASE_URL,
      PORT: String(PORT),
      DEMO_OTP_ENABLED: 'false',
      ...supabaseVars,
      ...msg91Vars,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let log = ''
  api.stdout.on('data', (b) => { log += b.toString() })
  api.stderr.on('data', (b) => { log += b.toString() })

  try {
    if (!(await waitUp(`${BASE}/healthz`))) throw new Error('API failed to boot on port 3110')
    await new Promise((r) => setTimeout(r, 800))

    const body = action === 'send' ? { clinic, phone } : { clinic, phone, otp }
    const res = await fetch(`${BASE}/auth/${action === 'send' ? 'send-otp' : 'verify-otp'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => null)

    if (action === 'send') {
      assert.equal(res.status, 200, `send-otp status ${res.status}: ${JSON.stringify(data)}`)
      assert.equal(data?.data?.demoCode, undefined, 'live send must NEVER return a demoCode')
      console.log(`SENT: ${data?.data?.message} (expires ${data?.data?.expiresIn}s)`)
      console.log('Now run: node scripts/test-otp-live.mjs verify <clinic> <phone> <otp-from-phone>')
    } else {
      assert.equal(res.status, 200, `verify-otp status ${res.status}: ${JSON.stringify(data)}`)
      console.log(`VERIFIED: accessToken=${!!data?.data?.accessToken} user=${data?.data?.user?.phone}`)
      console.log('  OK — live provider confirmed end-to-end.')
    }
  } finally {
    api.kill()
  }
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

async function waitUp(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url)
      if (r.status === 200) return true
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})